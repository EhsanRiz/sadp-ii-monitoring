// deno-lint-ignore-file no-explicit-any
// ============================================================================
// extract-m1-binder-v1
// ----------------------------------------------------------------------------
// "Backfill from M1 binder" entry point (Option B from the architecture doc).
// A complete Milestone-1 binder contains: cover page + ESSF + EMMP + an
// optional Inspection visit + the M1 sections. For enterprises that have
// already completed milestone 1, this lets the user upload one PDF and have
// every upstream form pre-filled in one go.
//
// What it writes:
//   - enterprises row: UPDATE only EMPTY cover-page fields; never overwrite
//     hand-edited values. Conflicts go into import_notes as 'cover_page_conflict'.
//   - essf_submissions: INSERT or UPDATE draft. Refuses if approved (409).
//   - emmp_submissions: INSERT or UPDATE draft (uses template for the
//     enterprise's enterprise_type_id). Refuses if approved (409).
//   - inspection_visits: INSERT a new draft visit using the most-recent
//     visit found in the PDF. Skipped if none present.
//   - m1_submissions: INSERT or UPDATE draft (4 jsonb columns). Refuses if approved.
//
// Reuses extract-m1-pdf-v4's three structural cashbook rules (rotation
// awareness, no reconstruction, scale-check) — copied into the system prompt
// rather than DRY'd via shared file, since edge functions ship independently.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const BUCKET = 'm1-supporting-docs';
const CLAUDE_MODEL = 'claude-sonnet-4-5';
const CLAUDE_MAX_TOKENS = 24000; // bumped — payload is bigger than v4's

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  if (!payload) return {};
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  try { return JSON.parse(atob(b64)); } catch { return {}; }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const NARRATIVE_SECTIONS = [
  'executive_summary',
  'technical_activities',
  'technology_transfer',
  'outputs_results',
  'partnership_cooperation',
  'problems_solutions',
  'recommendations_mgp',
] as const;

const FR_CATEGORY_IDS = ['I-A','I-B','I-C','I-D','I-E','I-F','II','III'] as const;

// ESSF Section 1: site sensitivity (5 issues, each rated low/medium/high)
const ESSF_SENSITIVITY_ISSUES = [
  'natural_habitats',
  'water_quality',
  'natural_hazards',
  'cultural_property',
  'involuntary_resettlement',
] as const;

// ESSF Section 2: completeness (8 questions, each yes/no/n_a)
const ESSF_COMPLETENESS_QUESTIONS = [
  'project_description',
  'site_alternatives',
  'map_drawing',
  'physical_works_plan',
  'access_arrangements',
  'land_acquisition',
  'work_program',
  'mitigation_measures',
] as const;

// ESSF Section 3: 24-question checklist. Groups A (a1-a10), B (b1-b9), C (c1-c4 typically), D (d1-d?).
// We accept whatever ids the model returns; downstream filtering only keeps known ids.
// Letting the model report group-by-group lets us catch the full checklist.

const INSPECTION_STATUSES = ['c', 'nc', 'pc', 'na'] as const;

// Inspection aspects, grouped by phase (matching inspectionSchema.ts)
const INSPECTION_ASPECTS_PRE = [
  'screening_esmp',
  'community_sensitization',
  'climatic_risks',
  'erosion_protection',
  'zoning_compliance',
];
const INSPECTION_ASPECTS_CONS = [
  'site_protected',
  'waste_management',
  'air_quality',
  'noise_pollution',
  'soil_protection',
  'water_resource_management',
  'worker_safety',
  'occupational_health',
  'biodiversity',
  'cultural_heritage',
  'community_grievance',
  'gbv',
];
const INSPECTION_ASPECTS_OP = [
  'env_monitoring',
  'energy_efficiency',
  'waste_handling',
  'maintenance',
];
const ALL_INSPECTION_ASPECTS = new Set([
  ...INSPECTION_ASPECTS_PRE,
  ...INSPECTION_ASPECTS_CONS,
  ...INSPECTION_ASPECTS_OP,
]);

// Cover-page enterprise columns that the backfill is allowed to fill IF empty.
// UUID FK columns (community_council_id / resource_center_id / village_id) are
// excluded — name → id lookups are too risky to automate in v1.
const COVER_PAGE_TEXT_FIELDS = [
  'project_title',
  'registration_number',
  'principal_applicant_name',
  'location_detail',
  'beneficiary_contact_phone',
  'service_provider_name',
  'cgp_officer_name',
] as const;
const COVER_PAGE_DATE_FIELDS = [
  'period_start',
  'period_end',
  'principal_applicant_signed_date',
  'service_provider_signed_date',
  'cgp_received_date',
] as const;
const COVER_PAGE_NUM_FIELDS = [
  'total_project_cost_lsl',
  'total_grant_lsl',
  'current_grant_payment_lsl',
  'budget_lsl',
] as const;
const ALL_COVER_FIELDS = [
  ...COVER_PAGE_TEXT_FIELDS,
  ...COVER_PAGE_DATE_FIELDS,
  ...COVER_PAGE_NUM_FIELDS,
] as const;

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing bearer token' }, 401);
  const claims = decodeJwtPayload(token);
  const role = claims.user_role;
  const userId = claims.sub;
  const allowed = ['super_admin','team_leader','me_officer','field_supervisor'];
  if (typeof role !== 'string' || !allowed.includes(role)) return json({ error: 'Forbidden' }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const enterpriseId = body?.enterpriseId;
  if (!enterpriseId) return json({ error: 'enterpriseId is required' }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase env not set' }, 500);
  if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY secret not set' }, 500);
  const admin = createClient(supabaseUrl, serviceKey);

  // -----------------------------------------------------------------------
  // 1. Fetch enterprise + EMMP template + existing submissions
  // -----------------------------------------------------------------------
  const ent = await admin
    .from('enterprises')
    .select('*')
    .eq('id', enterpriseId)
    .single();
  if (ent.error || !ent.data) return json({ error: `Enterprise not found: ${ent.error?.message ?? ''}` }, 404);
  const enterprise = ent.data;

  const tpl = await admin
    .from('emmp_templates')
    .select('id, title, version, schema')
    .contains('enterprise_type_ids', [enterprise.enterprise_type_id])
    .maybeSingle();
  if (tpl.error) return json({ error: `EMMP template lookup: ${tpl.error.message}` }, 500);

  const essfRow = await admin.from('essf_submissions').select('id, status').eq('enterprise_id', enterpriseId).maybeSingle();
  if (essfRow.error) return json({ error: `ESSF lookup: ${essfRow.error.message}` }, 500);
  if (essfRow.data?.status === 'approved') {
    return json({ error: 'Approved ESSF exists — reopen it before backfilling.', section: 'essf' }, 409);
  }

  const emmpRow = await admin.from('emmp_submissions').select('id, status').eq('enterprise_id', enterpriseId).maybeSingle();
  if (emmpRow.error) return json({ error: `EMMP lookup: ${emmpRow.error.message}` }, 500);
  if (emmpRow.data?.status === 'approved') {
    return json({ error: 'Approved EMMP exists — reopen it before backfilling.', section: 'emmp' }, 409);
  }

  const m1Row = await admin
    .from('m1_submissions')
    .select('id, status, uploaded_pdf_path')
    .eq('enterprise_id', enterpriseId)
    .maybeSingle();
  if (m1Row.error) return json({ error: `M1 lookup: ${m1Row.error.message}` }, 500);
  if (m1Row.data?.status === 'approved') {
    return json({ error: 'Approved M1 exists — reopen it before backfilling.', section: 'm1' }, 409);
  }
  const pdfPath = m1Row.data?.uploaded_pdf_path ?? `${enterpriseId}/_source.pdf`;

  // -----------------------------------------------------------------------
  // 2. Download the PDF
  // -----------------------------------------------------------------------
  const dl = await admin.storage.from(BUCKET).download(pdfPath);
  if (dl.error || !dl.data) {
    return json({ error: `PDF download: ${dl.error?.message ?? 'no source PDF on file — upload one first'}` }, 400);
  }
  const bytes = new Uint8Array(await dl.data.arrayBuffer());
  let b64 = ''; const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) b64 += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  const pdfB64 = btoa(b64);

  // -----------------------------------------------------------------------
  // 3. Build EMMP item-id list for the prompt
  // -----------------------------------------------------------------------
  const emmpSchema = (tpl.data?.schema as any) ?? null;
  // EMMP schemas have shape: { items: [{ id, label, columns: [{prefix, label}, ...], rows: [{id, label}, ...] }, ...] }
  // The canonical response key is item.id verbatim (e.g. '1.1.r5.m2'). We'll
  // list known keys for Claude.
  const emmpItemIds: string[] = [];
  if (emmpSchema && Array.isArray(emmpSchema.items)) {
    for (const item of emmpSchema.items) {
      if (typeof item?.id === 'string') emmpItemIds.push(item.id);
    }
  }

  // -----------------------------------------------------------------------
  // 4. System + user prompts
  // -----------------------------------------------------------------------
  const sys = `You extract structured responses from a Lesotho SADP-II Milestone 1 (M1) binder PDF. A complete binder is multiple stapled forms: Cover page + ESSF + EMMP + (optional Inspection) + M1 sections.

Return STRICT JSON only — no prose, no markdown fences. If a field is unreadable, omit it. If a whole section is missing, omit that section's object entirely.

=== Document layout ===

GROUP A — extract from these:
  1. Cover page (Annex V/A, "PROJECT SUMMERY FORM" or similar)
  2. ESSF (Environmental and Social Screening Form)
  3. EMMP (Environmental Mitigation & Management Plan)
  4. Inspection visit (sometimes; "ESMP COMPLIANCE MONITORING CHECKLIST")
  5. II Narrative Progress Report (M1 narrative — 7 sections)
  6. Cashbook (M1)
  7. Financial Report (M1)
  8. Bank Reconciliation (M1)

GROUP B — DO NOT extract entries from these:
  - Bank statements (FNB / Standard Bank etc., labelled 'Statement Period').
  - Transaction history printouts.
  - Supplier receipts and invoices (Ready Pump RPS, Budget Hardware, etc.).
  - SWIFT payment advices.

=== Cover page (Annex V/A) ===

Extract these fields if visible:
  cover.project_title              text  (e.g. "C-shine Vegetable Production")
  cover.registration_number        text  (e.g. "A2024026")
  cover.principal_applicant_name   text  (the named applicant)
  cover.location_detail            text  (e.g. "Sehlabeng sa Thuathe, Ha-Ralimo")
  cover.beneficiary_contact_phone  text
  cover.service_provider_name      text  (signed by section)
  cover.cgp_officer_name           text
  cover.period_start               YYYY-MM-DD (project period start)
  cover.period_end                 YYYY-MM-DD
  cover.principal_applicant_signed_date    YYYY-MM-DD
  cover.service_provider_signed_date       YYYY-MM-DD
  cover.cgp_received_date          YYYY-MM-DD
  cover.total_project_cost_lsl     number (LSL)
  cover.total_grant_lsl            number (LSL)
  cover.current_grant_payment_lsl  number (LSL)
  cover.budget_lsl                 number (LSL)

OMIT any cover-page field you cannot read with confidence. Do not null-fill.

=== ESSF ===

Section 1 — Site sensitivity (5 issues, each rated low|medium|high):
  natural_habitats, water_quality, natural_hazards, cultural_property, involuntary_resettlement

Section 2 — Completeness (8 questions, each yes|no|n_a):
  project_description, site_alternatives, map_drawing, physical_works_plan,
  access_arrangements, land_acquisition, work_program, mitigation_measures

Section 3 — Checklist (24 questions across groups A/B/C/D, each yes|no):
  Group A: a1, a2, a3, a4, a5, a6, a7, a8, a9, a10
  Group B: b1, b2, b3, b4, b5, b6, b7, b8, b9
  Group C: c1, c2, c3, c4 (or as printed)
  Group D: d1, d2, d3, d4, d5 (or as printed)
  Use the IDS exactly as listed.

Certification signatures (if visible):
  essf.signed.extension_team_rep_name
  essf.signed.extension_team_rep_signed_at  YYYY-MM-DD
  essf.signed.sub_project_rep_name
  essf.signed.sub_project_rep_signed_at     YYYY-MM-DD

Also include essf.header.{sub_project_name, sub_project_address, extension_team_representative, extension_team_address} if visible.

For ticks/checkmarks in the ESSF: a tick/✓/X next to or inside a Yes/No/N/A box means that option is selected. If two adjacent boxes are ticked, set the value to whichever appears more clearly marked; if truly ambiguous, omit the field.

=== EMMP (template: ${tpl.data?.title ?? 'unknown'} ${tpl.data?.version ?? ''}) ===

The EMMP is a table where each ROW is a mitigation MEASURE and each COLUMN is a question about that measure. The canonical response key is the item id, e.g. '1.1.r5.m2'.

Known item ids for this enterprise's EMMP template (use these keys EXACTLY):
${emmpItemIds.length > 0 ? emmpItemIds.map((id) => `  - ${id}`).join('\n') : '  (template not available — best-effort extraction)'}

For each item id, set its value based on whether the corresponding checkbox is ticked in the printed EMMP. Use true/false (or omit if blank). If the row is marked "NOT APPLICABLE" across the trailing 3 columns, set those specific column-keys to false.

=== Inspection visit (most recent only) ===

If a "ESMP COMPLIANCE MONITORING CHECKLIST" page is present, extract the most-recent visit:

  inspection.visit_date           YYYY-MM-DD
  inspection.inspected_by_name    text (the inspector / supervisor name)
  inspection.notes                text (top-level observations, if any)
  inspection.aspects              map of aspect_id -> { status, comment }

Aspect ids (use these EXACTLY):
  Pre-construction: ${INSPECTION_ASPECTS_PRE.join(', ')}
  Construction:     ${INSPECTION_ASPECTS_CONS.join(', ')}
  Operational:      ${INSPECTION_ASPECTS_OP.join(', ')}

Status values: c (Compliant), nc (Non-Compliant), pc (Partially Compliant), na (Not Applicable).

If multiple inspection visits are present in the binder, extract only the MOST RECENT one (latest visit_date). Skip the entire inspection object if no inspection page is found.

=== M1 sections ===

Narrative section ids (use these keys EXACTLY): ${NARRATIVE_SECTIONS.join(', ')}.

CRITICAL CASHBOOK RULES (same as extract-m1-pdf-v4):

RULE 1 — ROTATION AWARENESS.
The cashbook is a wide landscape table. It is often PRINTED SIDEWAYS on a portrait-orientation page. When you encounter this, MENTALLY ROTATE the page and read column-by-column.

RULE 2 — STRICT NO-RECONSTRUCTION.
If the cashbook page is unreadable for any reason, return ZERO cashbook entries plus an explicit extraction note. DO NOT reconstruct cashbook entries from the narrative, bank statements, payment receipts, SWIFT advices, invoices, or any other source.

RULE 3 — SCALE-CHECK.
For every entry: prior_running_balance + credit − debit == next_running_balance (from the BALANCE column). If math doesn't balance after two attempts, omit that entry + flag a note.

Cashbook column → field mapping:
  PDF DATE        → entry.date         (YYYY-MM-DD)
  PDF ITEM        → entry.item         (code: I-A / OTHERS / '')
  PDF BUDGET      → entry.budget_code  (type: MATERIAL / OTHERS / '')
  PDF SUPPLIER    → entry.supplier     (full name, do not truncate)
  PDF DESCRIPTION → entry.description
  PDF CREDIT      → entry.credit       (number)
  PDF DEBIT       → entry.debit        (number)
  PDF ACCUM/BALANCE/BUDGET BAL → IGNORE (recomputed downstream)

Financial Report categories must be one of: ${FR_CATEGORY_IDS.join(', ')}. Skip the "Total Costs" / "Reallocation" summary rows.

Bank Reconciliation: extract the typed numeric fields. The "Subtotal", "Net surplus", "Difference", "Total explained" rows are computed downstream — IGNORE them.

OMIT any field you can't read with confidence. Do not null-fill.`;

  const usr = `Extract a complete M1 binder from the attached PDF.

Return JSON with this exact shape (omit any section/field you can't read):

{
  "cover": { /* see system prompt for fields */ },
  "essf": {
    "header": { ... },
    "site_sensitivity": { "natural_habitats": "low|medium|high", ... },
    "completeness":     { "project_description": "yes|no|n_a", ... },
    "checklist":        { "a1": "yes|no", ..., "d5": "yes|no" },
    "signed": { "extension_team_rep_name": "...", "extension_team_rep_signed_at": "YYYY-MM-DD", ... }
  },
  "emmp": {
    "responses": { "1.1.r1.m1": true, "1.1.r2.c1": false, ... }
  },
  "inspection": {
    "visit_date": "YYYY-MM-DD",
    "inspected_by_name": "...",
    "notes": "...",
    "aspects": { "screening_esmp": { "status": "c", "comment": "..." }, ... }
  },
  "narrative": {
    "executive_summary": "...",
    "technical_activities": "...",
    "technology_transfer": "...",
    "outputs_results": "...",
    "partnership_cooperation": "...",
    "problems_solutions": "...",
    "recommendations_mgp": "..."
  },
  "cashbook": {
    "opening_balance": 0,
    "opening_balance_date": "YYYY-MM-DD",
    "entries": [{ "date": "YYYY-MM-DD", "item": "I-A", "budget_code": "MATERIAL", "supplier": "...", "description": "...", "credit": 0, "debit": 0 }]
  },
  "financial_report": {
    "report_number": 1,
    "reporting_period_start": "YYYY-MM-DD",
    "reporting_period_end": "YYYY-MM-DD",
    "reporting_date": "YYYY-MM-DD",
    "items": [{ "category": "I-A", "label": "...", "total_planned": 0, "incurred": 0, "date_of_receipts": "YYYY-MM-DD", "notes": "..." }]
  },
  "bank_reconciliation": {
    "matching_grant_beneficiary_contribution": 0,
    "total_grant_funds_from_sadp_pmu": 0,
    "total_eligible_expenditure": 0,
    "amount_held_attached": true,
    "balance_per_bank_statement": 0,
    "opening_balance": 0,
    "own_deposit": 0,
    "interest_received": 0,
    "total_receipts": 0,
    "bank_charges": 0,
    "project_leader_name": "...",
    "project_leader_signed_date": "YYYY-MM-DD"
  },
  "m1_period_start": "YYYY-MM-DD",
  "m1_period_end":   "YYYY-MM-DD",
  "report_date":     "YYYY-MM-DD",
  "notes": [
    { "field": "section.subfield", "note": "...", "confidence": "low|medium|high" }
  ]
}

Include at least one entry in notes summarising:
  - Overall scan quality.
  - Which sections were found and which were absent.
  - Whether the cashbook page was readable.`;

  // -----------------------------------------------------------------------
  // 5. Call Claude
  // -----------------------------------------------------------------------
  const cRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: sys,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfB64 } },
          { type: 'text', text: usr },
        ],
      }],
    }),
  });
  if (!cRes.ok) {
    const e = await cRes.text();
    return json({ error: `Claude ${cRes.status}: ${e.slice(0,500)}` }, 502);
  }
  const cBody = await cRes.json();
  const out = (cBody.content?.[0]?.text ?? '').trim();
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) return json({ error: 'Claude returned no JSON', raw: out.slice(0,800) }, 502);
  let extracted: any;
  try { extracted = JSON.parse(m[0]); }
  catch (e) { return json({ error: `JSON parse: ${(e as Error).message}`, raw: out.slice(0,800) }, 502); }

  const importedAt = new Date().toISOString();
  const filledBy = typeof userId === 'string' ? userId : null;
  const notes: any[] = Array.isArray(extracted.notes) ? [...extracted.notes] : [];

  // Summary counters for the response.
  const result: any = {
    ok: true,
    enterprise_id: enterpriseId,
    cover_fields_filled: 0,
    cover_fields_conflict: 0,
    essf_written: false,
    emmp_written: false,
    inspection_written: false,
    narrative_sections_filled: 0,
    cashbook_entry_count: 0,
    financial_report_item_count: 0,
    bank_reconciliation_filled: false,
    notes,
  };

  // -----------------------------------------------------------------------
  // 6. Cover page — fill EMPTY enterprise fields only
  // -----------------------------------------------------------------------
  const coverIn = (extracted.cover ?? {}) as Record<string, unknown>;
  if (Object.keys(coverIn).length > 0) {
    const coverPatch: Record<string, unknown> = {};
    for (const f of COVER_PAGE_TEXT_FIELDS) {
      const incoming = coverIn[f];
      if (typeof incoming !== 'string' || !incoming.trim()) continue;
      if (isEmpty((enterprise as any)[f])) {
        coverPatch[f] = incoming.trim();
        result.cover_fields_filled += 1;
      } else if (((enterprise as any)[f] as string).trim() !== incoming.trim()) {
        notes.push({
          field: `cover.${f}`,
          note: `PDF had "${incoming}" but existing value is "${(enterprise as any)[f]}". Keeping existing value.`,
          confidence: 'medium',
        });
        result.cover_fields_conflict += 1;
      }
    }
    for (const f of COVER_PAGE_DATE_FIELDS) {
      const incoming = coverIn[f];
      if (typeof incoming !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(incoming)) continue;
      if (isEmpty((enterprise as any)[f])) {
        coverPatch[f] = incoming;
        result.cover_fields_filled += 1;
      } else if (String((enterprise as any)[f]) !== incoming) {
        notes.push({
          field: `cover.${f}`,
          note: `PDF had "${incoming}" but existing value is "${(enterprise as any)[f]}". Keeping existing value.`,
          confidence: 'medium',
        });
        result.cover_fields_conflict += 1;
      }
    }
    for (const f of COVER_PAGE_NUM_FIELDS) {
      const incoming = coverIn[f];
      if (typeof incoming !== 'number' || !Number.isFinite(incoming)) continue;
      if (isEmpty((enterprise as any)[f])) {
        coverPatch[f] = incoming;
        result.cover_fields_filled += 1;
      } else if (Number((enterprise as any)[f]) !== incoming) {
        notes.push({
          field: `cover.${f}`,
          note: `PDF had ${incoming} but existing value is ${(enterprise as any)[f]}. Keeping existing value.`,
          confidence: 'medium',
        });
        result.cover_fields_conflict += 1;
      }
    }
    if (Object.keys(coverPatch).length > 0) {
      const up = await admin.from('enterprises').update(coverPatch).eq('id', enterpriseId);
      if (up.error) return json({ error: `Enterprise update: ${up.error.message}` }, 500);
    }
  }

  // -----------------------------------------------------------------------
  // 7. ESSF — INSERT or UPDATE draft
  // -----------------------------------------------------------------------
  const essfIn = (extracted.essf ?? {}) as Record<string, any>;
  const essfHasAny = essfIn.header || essfIn.site_sensitivity || essfIn.completeness || essfIn.checklist || essfIn.signed;
  if (essfHasAny) {
    const sensitivity: Record<string, string> = {};
    for (const id of ESSF_SENSITIVITY_ISSUES) {
      const v = essfIn.site_sensitivity?.[id];
      if (v === 'low' || v === 'medium' || v === 'high') sensitivity[id] = v;
    }
    const completeness: Record<string, string> = {};
    for (const id of ESSF_COMPLETENESS_QUESTIONS) {
      const v = essfIn.completeness?.[id];
      if (v === 'yes' || v === 'no' || v === 'n_a') completeness[id] = v;
    }
    const checklist: Record<string, string> = {};
    for (const [k, v] of Object.entries(essfIn.checklist ?? {})) {
      if ((v === 'yes' || v === 'no') && /^[a-z]\d{1,2}$/i.test(k)) checklist[k] = v as string;
    }
    const signed: Record<string, unknown> = {};
    const signedIn = essfIn.signed ?? {};
    for (const f of ['extension_team_rep_name','extension_team_rep_signed_at','sub_project_rep_name','sub_project_rep_signed_at']) {
      if (typeof signedIn[f] === 'string' && signedIn[f].trim()) signed[f] = signedIn[f].trim();
    }
    const header = (essfIn.header && typeof essfIn.header === 'object') ? essfIn.header : {};

    const essfResponses = { header, site_sensitivity: sensitivity, completeness, checklist, signed };
    const essfPatch: any = {
      responses: essfResponses,
      status: 'draft',
      filled_by: filledBy,
      imported_from_pdf_path: pdfPath,
      imported_at: importedAt,
      import_notes: notes,
    };
    if (essfRow.data) {
      const up = await admin.from('essf_submissions').update(essfPatch).eq('id', essfRow.data.id);
      if (up.error) return json({ error: `ESSF update: ${up.error.message}` }, 500);
    } else {
      const ins = await admin.from('essf_submissions').insert({
        enterprise_id: enterpriseId,
        organization_id: enterprise.organization_id,
        ...essfPatch,
      });
      if (ins.error) return json({ error: `ESSF insert: ${ins.error.message}` }, 500);
    }
    result.essf_written = true;
  }

  // -----------------------------------------------------------------------
  // 8. EMMP — INSERT or UPDATE draft (only if a template exists)
  // -----------------------------------------------------------------------
  const emmpIn = (extracted.emmp ?? {}) as Record<string, any>;
  const emmpResponsesIn = (emmpIn.responses && typeof emmpIn.responses === 'object') ? emmpIn.responses : null;
  if (emmpResponsesIn && tpl.data?.id) {
    // Keep only response keys that match the template's known item ids.
    const known = new Set(emmpItemIds);
    const emmpResponses: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(emmpResponsesIn)) {
      if (known.has(k)) emmpResponses[k] = v;
    }
    const emmpPatch: any = {
      template_id: tpl.data.id,
      responses: emmpResponses,
      status: 'draft',
      filled_by: filledBy,
      imported_from_pdf_path: pdfPath,
      imported_at: importedAt,
      import_notes: notes,
    };
    if (emmpRow.data) {
      const up = await admin.from('emmp_submissions').update(emmpPatch).eq('id', emmpRow.data.id);
      if (up.error) return json({ error: `EMMP update: ${up.error.message}` }, 500);
    } else {
      const ins = await admin.from('emmp_submissions').insert({
        enterprise_id: enterpriseId,
        organization_id: enterprise.organization_id,
        ...emmpPatch,
      });
      if (ins.error) return json({ error: `EMMP insert: ${ins.error.message}` }, 500);
    }
    result.emmp_written = true;
  } else if (emmpResponsesIn && !tpl.data?.id) {
    notes.push({
      field: 'emmp',
      note: `No EMMP template found for enterprise_type_id=${enterprise.enterprise_type_id}; skipping EMMP write.`,
      confidence: 'high',
    });
  }

  // -----------------------------------------------------------------------
  // 9. Inspection — INSERT a draft visit if present and not duplicate
  // -----------------------------------------------------------------------
  const inspIn = extracted.inspection;
  if (inspIn && typeof inspIn === 'object') {
    const visitDate = typeof inspIn.visit_date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(inspIn.visit_date)
      ? inspIn.visit_date
      : null;
    const inspectedBy = typeof inspIn.inspected_by_name === 'string' ? inspIn.inspected_by_name.trim() : '';
    const aspectsIn = (inspIn.aspects && typeof inspIn.aspects === 'object') ? inspIn.aspects : {};
    const aspects: Record<string, { status?: string; comment?: string }> = {};
    for (const [k, v] of Object.entries(aspectsIn)) {
      if (!ALL_INSPECTION_ASPECTS.has(k)) continue;
      const entry = (v && typeof v === 'object') ? v as { status?: string; comment?: string } : {};
      const out: { status?: string; comment?: string } = {};
      if (typeof entry.status === 'string' && (INSPECTION_STATUSES as readonly string[]).includes(entry.status)) out.status = entry.status;
      if (typeof entry.comment === 'string' && entry.comment.trim()) out.comment = entry.comment.trim();
      if (Object.keys(out).length > 0) aspects[k] = out;
    }
    const notesText = typeof inspIn.notes === 'string' ? inspIn.notes.trim() : '';
    const hasAnyAspect = Object.keys(aspects).length > 0;
    if (visitDate && inspectedBy && (hasAnyAspect || notesText)) {
      // Avoid creating a duplicate if an inspection on the same visit_date
      // already exists for this enterprise.
      const existing = await admin
        .from('inspection_visits')
        .select('id, status')
        .eq('enterprise_id', enterpriseId)
        .eq('visit_date', visitDate)
        .maybeSingle();
      if (existing.error) return json({ error: `Inspection lookup: ${existing.error.message}` }, 500);
      const inspPatch: any = {
        inspected_by_name: inspectedBy,
        visit_date: visitDate,
        responses: { aspects, ...(notesText ? { notes: notesText } : {}) },
        status: 'draft',
        filled_by: filledBy,
        imported_from_pdf_path: pdfPath,
        imported_at: importedAt,
        import_notes: notes,
      };
      if (existing.data) {
        if (existing.data.status !== 'approved') {
          const up = await admin.from('inspection_visits').update(inspPatch).eq('id', existing.data.id);
          if (up.error) return json({ error: `Inspection update: ${up.error.message}` }, 500);
          result.inspection_written = true;
        } else {
          notes.push({ field: 'inspection', note: 'Approved inspection on the same date exists; skipping.', confidence: 'high' });
        }
      } else {
        const ins = await admin.from('inspection_visits').insert({
          enterprise_id: enterpriseId,
          organization_id: enterprise.organization_id,
          ...inspPatch,
        });
        if (ins.error) return json({ error: `Inspection insert: ${ins.error.message}` }, 500);
        result.inspection_written = true;
      }
    }
  }

  // -----------------------------------------------------------------------
  // 10. M1 sections — reuse v4 logic
  // -----------------------------------------------------------------------
  const narrative: Record<string, string> = {};
  const narrIn = extracted.narrative ?? {};
  const allowedSections = new Set<string>(NARRATIVE_SECTIONS);
  for (const [k, v] of Object.entries(narrIn)) {
    if (allowedSections.has(k) && typeof v === 'string' && v.trim()) {
      narrative[k] = v.trim();
    }
  }

  const cashIn = extracted.cashbook ?? {};
  const entriesIn: any[] = Array.isArray(cashIn.entries) ? cashIn.entries : [];
  const cashbook = {
    opening_balance: typeof cashIn.opening_balance === 'number' ? cashIn.opening_balance : 0,
    opening_balance_date: typeof cashIn.opening_balance_date === 'string' ? cashIn.opening_balance_date : undefined,
    currency: 'LSL',
    entries: entriesIn
      .filter((e) => e && typeof e.date === 'string')
      .map((e) => ({
        id: crypto.randomUUID(),
        date: String(e.date),
        item: String(e.item ?? ''),
        budget_code: String(e.budget_code ?? ''),
        supplier: String(e.supplier ?? ''),
        description: String(e.description ?? ''),
        credit: Number(e.credit ?? 0) || 0,
        debit: Number(e.debit ?? 0) || 0,
      })),
  };

  const frIn = extracted.financial_report ?? {};
  const frItemsIn: any[] = Array.isArray(frIn.items) ? frIn.items : [];
  const allowedCategories = new Set<string>(FR_CATEGORY_IDS);
  const frItems = frItemsIn
    .filter((it) => it && allowedCategories.has(String(it.category)))
    .map((it) => ({
      id: crypto.randomUUID(),
      category: String(it.category),
      label: String(it.label ?? ''),
      total_planned: Number(it.total_planned ?? 0) || 0,
      incurred: Number(it.incurred ?? 0) || 0,
      date_of_receipts: typeof it.date_of_receipts === 'string' ? it.date_of_receipts : '',
      notes: String(it.notes ?? ''),
    }));
  const financialReport: Record<string, unknown> = { items: frItems };
  if (typeof frIn.report_number === 'number') financialReport.report_number = frIn.report_number;
  if (typeof frIn.reporting_period_start === 'string') financialReport.reporting_period_start = frIn.reporting_period_start;
  if (typeof frIn.reporting_period_end === 'string') financialReport.reporting_period_end = frIn.reporting_period_end;
  if (typeof frIn.reporting_date === 'string') financialReport.reporting_date = frIn.reporting_date;

  const brIn = extracted.bank_reconciliation ?? {};
  const bankReconciliation: Record<string, unknown> = {};
  const numFields = [
    'matching_grant_beneficiary_contribution',
    'total_grant_funds_from_sadp_pmu',
    'total_eligible_expenditure',
    'amount_held_value',
    'balance_per_bank_statement',
    'opening_balance',
    'own_deposit',
    'interest_received',
    'total_receipts',
    'bank_charges',
    'milestone_number',
  ];
  for (const f of numFields) {
    if (typeof brIn[f] === 'number') bankReconciliation[f] = brIn[f];
  }
  if (typeof brIn.amount_held_attached === 'boolean') bankReconciliation.amount_held_attached = brIn.amount_held_attached;
  if (typeof brIn.project_leader_name === 'string') bankReconciliation.project_leader_name = brIn.project_leader_name;
  if (typeof brIn.project_leader_signed_date === 'string') bankReconciliation.project_leader_signed_date = brIn.project_leader_signed_date;
  const brHasAnyField = Object.keys(bankReconciliation).length > 0;

  const m1PeriodStart = typeof extracted.m1_period_start === 'string' ? extracted.m1_period_start : null;
  const m1PeriodEnd   = typeof extracted.m1_period_end   === 'string' ? extracted.m1_period_end   : null;
  const reportDate    = typeof extracted.report_date     === 'string' ? extracted.report_date     : null;

  const m1Patch: any = {
    narrative,
    cashbook,
    financial_report: financialReport,
    filled_by: filledBy,
    status: 'draft',
    imported_from_pdf_path: pdfPath,
    imported_at: importedAt,
    import_notes: notes,
  };
  if (brHasAnyField) m1Patch.bank_reconciliation = bankReconciliation;
  if (m1PeriodStart) m1Patch.m1_period_start = m1PeriodStart;
  if (m1PeriodEnd)   m1Patch.m1_period_end   = m1PeriodEnd;
  if (reportDate)    m1Patch.report_date     = reportDate;

  if (m1Row.data) {
    const up = await admin.from('m1_submissions').update(m1Patch).eq('id', m1Row.data.id);
    if (up.error) return json({ error: `M1 update: ${up.error.message}` }, 500);
  } else {
    const ins = await admin.from('m1_submissions').insert({
      enterprise_id: enterpriseId,
      organization_id: enterprise.organization_id,
      uploaded_pdf_path: pdfPath,
      ...m1Patch,
    });
    if (ins.error) return json({ error: `M1 insert: ${ins.error.message}` }, 500);
  }

  result.narrative_sections_filled = Object.keys(narrative).length;
  result.cashbook_entry_count = cashbook.entries.length;
  result.financial_report_item_count = frItems.length;
  result.bank_reconciliation_filled = brHasAnyField;
  result.notes = notes;

  return json(result);
});
