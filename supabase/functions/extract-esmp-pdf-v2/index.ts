// supabase/functions/extract-esmp-pdf/index.ts
//
// Edge function: Auto-populate ESSF + EMMP submissions by extracting
// structured responses from a scanned/printed ESMP PDF using Claude.
//
// Called from the ESMP tab on the enterprise detail page when a legacy
// PDF has been uploaded. Output is ALWAYS written as `status='draft'`
// — the field supervisor reviews and corrects before submitting.
//
// Flow:
//   1. Verify JWT + role (super_admin / team_leader / me_officer /
//      field_supervisor).
//   2. Look up enterprise → esmp_uploaded_pdf_url, enterprise_type_id.
//   3. Fetch the EMMP template for that type from emmp_templates.
//   4. Download the PDF from the esmp-pdfs bucket using the service role.
//   5. Call Claude with the PDF + ESSF schema + EMMP template, asking
//      for strict-JSON extraction.
//   6. Upsert essf_submissions and emmp_submissions as drafts, stamped
//      imported_from_pdf_path + imported_at + import_notes. If a row
//      already exists with status='approved', we refuse to overwrite —
//      reopen it first if you want to re-import.
//
// Env vars:
//   SUPABASE_URL                — set automatically
//   SUPABASE_SERVICE_ROLE_KEY   — set automatically
//   ANTHROPIC_API_KEY           — must be set via Supabase Secrets
//
// Deploy:
//   supabase functions deploy extract-esmp-pdf

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const BUCKET = 'esmp-pdfs';
const CLAUDE_MODEL = 'claude-sonnet-4-5';
const CLAUDE_MAX_TOKENS = 8000;

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
  try {
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// ----------------------------------------------------------------------------
// Schema description handed to Claude. Mirrors src/forms/essfSchema.ts —
// the ids and option values MUST stay in sync.
// ----------------------------------------------------------------------------
const ESSF_SCHEMA_FOR_CLAUDE = {
  site_sensitivity: {
    description: 'Section 1.0 SITE SELECTION. For each issue, the supervisor highlighted/circled ONE of the three rating columns (Low / Medium / High). Return the chosen rating per issue.',
    options: ['low', 'medium', 'high'],
    issues: [
      { id: 'natural_habitats', label: 'Natural habitats' },
      { id: 'water_quality', label: 'Water quality and water resource availability and use' },
      { id: 'natural_hazards', label: 'Natural hazards vulnerability, floods, soil stability/erosion' },
      { id: 'cultural_property', label: 'Cultural property' },
      { id: 'involuntary_resettlement', label: 'Involuntary resettlement' },
    ],
  },
  completeness: {
    description: 'Section 2.0 COMPLETENESS OF SUB-PROJECTS APPLICATION. Yes / No / N/A tick per question.',
    options: ['yes', 'no', 'n_a'],
    questions: [
      { id: 'project_description', label: 'Description of the proposed project and where it is located' },
      { id: 'site_alternatives', label: 'Information about how the site was chosen, and what alternatives were considered' },
      { id: 'map_drawing', label: 'A map or drawing showing the location and boundary of the project' },
      { id: 'physical_works_plan', label: 'The plan for any physical works' },
      { id: 'access_arrangements', label: 'Any new access arrangements or changes to existing road layouts' },
      { id: 'land_acquisition', label: 'Any land that needs to be acquired' },
      { id: 'work_program', label: 'A work program for construction, operation and decommissioning' },
      { id: 'mitigation_measures', label: 'Information about measures to avoid or minimize adverse environmental and social impacts' },
    ],
  },
  checklist: {
    description: 'Section 3.0 ENVIRONMENTAL AND SOCIAL CHECKLIST. Yes / No tick per question, grouped A-D.',
    options: ['yes', 'no'],
    questions: [
      { id: 'a1', group: 'A', label: 'Involve the construction or rehabilitation of any small dams, weirs or reservoirs?' },
      { id: 'a2', group: 'A', label: 'Support irrigation schemes?' },
      { id: 'a3', group: 'A', label: 'Build or rehabilitate any rural roads?' },
      { id: 'a4', group: 'A', label: 'Build or rehabilitate any electricity power generating system?' },
      { id: 'a5', group: 'A', label: 'Involve food processing?' },
      { id: 'a6', group: 'A', label: 'Build or rehabilitate any structures or buildings?' },
      { id: 'a7', group: 'A', label: 'Support agricultural activities?' },
      { id: 'a8', group: 'A', label: 'Be located in or near an area of historical/archaeological/cultural heritage?' },
      { id: 'a9', group: 'A', label: 'Be located within or adjacent to protected areas / natural habitats?' },
      { id: 'a10', group: 'A', label: 'Depend on water supply from an existing dam, weir, or other water diversion structure?' },
      { id: 'b1', group: 'B', label: 'Risk causing the contamination of drinking water?' },
      { id: 'b2', group: 'B', label: 'Affect the quantity or quality of surface waters or groundwater?' },
      { id: 'b3', group: 'B', label: 'Cause poor water drainage and increase the risk of water-related diseases?' },
      { id: 'b4', group: 'B', label: 'Harvest or exploit a significant amount of natural resources (trees, soil, water)?' },
      { id: 'b5', group: 'B', label: 'Be located within or nearby environmentally sensitive areas?' },
      { id: 'b6', group: 'B', label: 'Create a risk of increased soil degradation or erosion?' },
      { id: 'b7', group: 'B', label: 'Create a risk of increasing soil salinity?' },
      { id: 'b8', group: 'B', label: 'Produce, or increase the production of, solid or liquid wastes?' },
      { id: 'c1', group: 'C', label: 'Require that land be acquired for its development?' },
      { id: 'c2', group: 'C', label: 'Use land currently occupied/used for productive purposes?' },
      { id: 'c3', group: 'C', label: 'Displace individuals, families or businesses?' },
      { id: 'c4', group: 'C', label: 'Result in temporary/permanent loss of crops, fruit trees or household infrastructure?' },
      { id: 'c5', group: 'C', label: 'Result in involuntary restriction of access to legally designated parks?' },
      { id: 'd1', group: 'D', label: 'Involve the use of pesticides or other agricultural chemicals, or increase existing use?' },
    ],
  },
  header: {
    description: 'Cover page metadata. Free-text fields.',
    fields: [
      'district',
      'round_of_funding',
      'date',
      'sub_project_representative',
      'sub_project_name',
      'sub_project_address',
      'extension_team_representative',
      'extension_team_address',
    ],
  },
} as const;

interface ExtractBody { enterpriseId?: string }

interface EmmpRowSchema {
  id: string;
  activity: string;
  impacts: { id: string; label: string }[];
  mitigations: { id: string; label: string }[];
  monitoring: { id: string; label: string }[];
}
interface EmmpTemplateSchema {
  title: string;
  version: string;
  sections: { id: string; title: string; rows: EmmpRowSchema[] }[];
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
  const allowedRoles = ['super_admin', 'team_leader', 'me_officer', 'field_supervisor'];
  if (typeof role !== 'string' || !allowedRoles.includes(role)) {
    return json({ error: 'Forbidden — role not allowed to import ESMP PDFs' }, 403);
  }

  let body: ExtractBody;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const { enterpriseId } = body;
  if (!enterpriseId) return json({ error: 'enterpriseId is required' }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Edge function not configured (Supabase)' }, 500);
  if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY secret not set — add it via supabase secrets set' }, 500);
  const admin = createClient(supabaseUrl, serviceKey);

  // ----- 1. Look up enterprise + verify PDF exists ----------------------
  const ent = await admin
    .from('enterprises')
    .select('id, enterprise_type_id, organization_id, beneficiary_short_name, esmp_uploaded_pdf_url')
    .eq('id', enterpriseId)
    .single();
  if (ent.error || !ent.data) return json({ error: `Enterprise not found: ${ent.error?.message ?? ''}` }, 404);
  if (!ent.data.esmp_uploaded_pdf_url) {
    return json({ error: 'No PDF uploaded for this enterprise. Upload a scanned ESMP first.' }, 400);
  }
  const pdfStoragePath = `${enterpriseId}.pdf`;

  // ----- 2. Look up EMMP template for this enterprise type --------------
  const tpl = await admin
    .from('emmp_templates')
    .select('id, title, version, schema')
    .contains('enterprise_type_ids', [ent.data.enterprise_type_id])
    .maybeSingle();
  if (tpl.error) return json({ error: `Template lookup failed: ${tpl.error.message}` }, 500);
  const emmpTemplate = tpl.data?.schema as EmmpTemplateSchema | null;

  // ----- 3. Download the PDF from storage --------------------------------
  const dl = await admin.storage.from(BUCKET).download(pdfStoragePath);
  if (dl.error || !dl.data) return json({ error: `Could not download PDF: ${dl.error?.message ?? 'no data'}` }, 500);
  const pdfBytes = new Uint8Array(await dl.data.arrayBuffer());
  // Base64 encode without blowing the stack on a 5MB binary
  let pdfBase64 = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < pdfBytes.length; i += CHUNK) {
    pdfBase64 += String.fromCharCode(...pdfBytes.subarray(i, i + CHUNK));
  }
  pdfBase64 = btoa(pdfBase64);

  // ----- 4. Build the extraction prompt ---------------------------------
  const emmpRowList = emmpTemplate
    ? emmpTemplate.sections.flatMap((s) => s.rows.map((r) => ({
        id: r.id,
        activity: r.activity,
        impacts: r.impacts.map((i, idx) => ({ key: `${r.id}.i${idx}`, label: i.label })),
        mitigations: r.mitigations.map((m, idx) => ({ key: `${r.id}.m${idx}`, label: m.label })),
        monitoring: r.monitoring.map((p, idx) => ({ key: `${r.id}.n${idx}`, label: p.label })),
      })))
    : [];

  const systemPrompt = `You are an extraction assistant for the Lesotho SADP-II monitoring system. You receive scanned or printed Environmental and Social Management Plan (ESMP) forms and return STRICT JSON matching the provided schema. Never include prose, never wrap the JSON in markdown fences. If you cannot read a field with confidence, omit it from the JSON and add a confidence note instead.

The ESMP document has two parts:
  - ESSF (Environmental & Social Screening Form): pages with site sensitivity table, completeness Y/N/NA table, and a 24-question checklist.
  - EMMP (Environmental Management & Monitoring Plan): landscape table with rows per activity, listing impacts/mitigations/monitoring items as checkboxes plus three free-text columns (Person to Implement, Person to Monitor, Time Frame).

For checkboxes, a tick / X / cross / circle inside the box means SELECTED. An empty or struck-through box means NOT selected. When the printed text near a box has been highlighted or underlined, that also counts as SELECTED.

For the EMMP, the THREE trailing free-text columns may contain "N/A" or "NOT APPLICABLE" or be empty — in any of those cases, return an empty string for that cell.`;

  const userPrompt = `Extract ESMP responses from the attached PDF.

ESSF SCHEMA (return responses keyed by id):
${JSON.stringify(ESSF_SCHEMA_FOR_CLAUDE, null, 2)}

${emmpTemplate ? `EMMP TEMPLATE for this enterprise (${emmpTemplate.title}, ${emmpTemplate.version}):
${JSON.stringify(emmpRowList, null, 2)}

For EMMP, return:
  - For each row's impacts/mitigations/monitoring item: include the item key (e.g. "1.1.r1.i1") in emmp.checks ONLY if the corresponding checkbox is ticked in the PDF.
  - For each row, include emmp["{row.id}.person_implement"], emmp["{row.id}.person_monitor"], emmp["{row.id}.timeframe"] as strings if the cells contain text; omit otherwise.` : 'No EMMP template available for this enterprise type — skip the emmp section.'}

Return JSON with this shape exactly:
{
  "essf": {
    "header": { "district": "...", "round_of_funding": "...", "date": "...", "sub_project_representative": "...", "sub_project_name": "...", "sub_project_address": "...", "extension_team_representative": "...", "extension_team_address": "..." },
    "site_sensitivity": { "natural_habitats": "low|medium|high", ... },
    "completeness": { "project_description": "yes|no|n_a", ... },
    "checklist": { "a1": "yes|no", ... }
  },
  "emmp": {
    "checks": ["1.1.r1.i1", "1.1.r1.m2", ...],
    "1.1.r1.person_implement": "...",
    "1.1.r1.timeframe": "...",
    ...
  },
  "notes": [
    { "field": "essf.checklist.a8", "note": "Tick was ambiguous between Yes and No; assumed Yes based on column alignment.", "confidence": "low" },
    ...
  ]
}

Only include keys you actually extracted — omit (don't null-fill) anything you couldn't read. Always include at least one "notes" entry summarising overall scan quality and anything that needs human review.`;

  // ----- 5. Call Claude API ---------------------------------------------
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            { type: 'text', text: userPrompt },
          ],
        },
      ],
    }),
  });
  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    return json({ error: `Claude API ${claudeRes.status}: ${errText.slice(0, 500)}` }, 502);
  }
  const claudeBody = await claudeRes.json();
  const textOut = (claudeBody.content?.[0]?.text ?? '').trim();
  // Tolerant JSON parsing: Claude usually obeys the no-fences rule but
  // strip them anyway in case it slipped.
  const jsonMatch = textOut.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return json({ error: 'Claude returned no JSON object', raw: textOut.slice(0, 800) }, 502);
  let extracted: any;
  try { extracted = JSON.parse(jsonMatch[0]); }
  catch (e) { return json({ error: `Could not parse Claude JSON: ${(e as Error).message}`, raw: textOut.slice(0, 800) }, 502); }

  const essfPayload = extracted.essf ?? {};
  const emmpPayload = extracted.emmp ?? {};
  const notes: unknown = Array.isArray(extracted.notes) ? extracted.notes : [];

  // ----- 6. Reshape EMMP responses from Claude's format → our keyed map -
  // Claude returns { checks: ["1.1.r1.i1", ...], "1.1.r1.timeframe": "Daily", ... }
  // We store it as { "1.1.r1.i1": true, "1.1.r1.timeframe": "Daily", ... }
  const emmpResponses: Record<string, unknown> = {};
  if (Array.isArray(emmpPayload.checks)) {
    for (const k of emmpPayload.checks) {
      if (typeof k === 'string') emmpResponses[k] = true;
    }
  }
  for (const [k, v] of Object.entries(emmpPayload)) {
    if (k === 'checks') continue;
    emmpResponses[k] = v;
  }

  // ----- 7. Upsert ESSF + EMMP submissions as drafts --------------------
  const importedAt = new Date().toISOString();

  // ESSF: refuse to overwrite if approved
  const existingEssf = await admin
    .from('essf_submissions')
    .select('id, status')
    .eq('enterprise_id', enterpriseId)
    .maybeSingle();
  if (existingEssf.error) return json({ error: `ESSF lookup failed: ${existingEssf.error.message}` }, 500);
  if (existingEssf.data?.status === 'approved') {
    return json({ error: 'An approved ESSF already exists for this enterprise. Reopen it for editing before re-importing.' }, 409);
  }
  const essfRow = {
    responses: essfPayload,
    filled_by: typeof userId === 'string' ? userId : null,
    status: 'draft' as const,
    imported_from_pdf_path: pdfStoragePath,
    imported_at: importedAt,
    import_notes: notes,
  };
  if (existingEssf.data) {
    const up = await admin.from('essf_submissions').update(essfRow).eq('id', existingEssf.data.id);
    if (up.error) return json({ error: `ESSF update failed: ${up.error.message}` }, 500);
  } else {
    const ins = await admin.from('essf_submissions').insert({
      enterprise_id: enterpriseId,
      organization_id: ent.data.organization_id,
      ...essfRow,
    });
    if (ins.error) return json({ error: `ESSF insert failed: ${ins.error.message}` }, 500);
  }

  // EMMP: only if we have a template for this type
  let emmpStatus: 'imported' | 'no_template' | 'approved_skip' = 'imported';
  if (!emmpTemplate || !tpl.data) {
    emmpStatus = 'no_template';
  } else {
    const existingEmmp = await admin
      .from('emmp_submissions')
      .select('id, status')
      .eq('enterprise_id', enterpriseId)
      .maybeSingle();
    if (existingEmmp.error) return json({ error: `EMMP lookup failed: ${existingEmmp.error.message}` }, 500);
    if (existingEmmp.data?.status === 'approved') {
      emmpStatus = 'approved_skip';
    } else {
      const emmpRow = {
        responses: emmpResponses,
        filled_by: typeof userId === 'string' ? userId : null,
        status: 'draft' as const,
        template_id: tpl.data.id,
        imported_from_pdf_path: pdfStoragePath,
        imported_at: importedAt,
        import_notes: notes,
      };
      if (existingEmmp.data) {
        const up = await admin.from('emmp_submissions').update(emmpRow).eq('id', existingEmmp.data.id);
        if (up.error) return json({ error: `EMMP update failed: ${up.error.message}` }, 500);
      } else {
        const ins = await admin.from('emmp_submissions').insert({
          enterprise_id: enterpriseId,
          organization_id: ent.data.organization_id,
          ...emmpRow,
        });
        if (ins.error) return json({ error: `EMMP insert failed: ${ins.error.message}` }, 500);
      }
    }
  }

  return json({
    ok: true,
    enterprise_id: enterpriseId,
    essf: { status: 'imported', has_data: Object.keys(essfPayload).length > 0 },
    emmp: { status: emmpStatus, has_data: Object.keys(emmpResponses).length > 0 },
    notes,
  });
});
