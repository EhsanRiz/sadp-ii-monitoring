// deno-lint-ignore-file no-explicit-any
// ============================================================================
// extract-m1-pdf-v4
// ----------------------------------------------------------------------------
// Fourth iteration of the M1 PDF extractor. Three structural fixes over v3:
//
//  1. ROTATION AWARENESS — many M1 cashbook pages are landscape tables printed
//     sideways on a portrait page. The model must mentally rotate the page
//     instead of failing back to bank statements.
//
//  2. STRICT NO-RECONSTRUCTION RULE — if the cashbook page is unreadable for
//     any reason (rotated badly, blurry scan, illegible handwriting), return
//     ZERO cashbook entries plus an extraction note. NEVER reconstruct from
//     narrative, bank statements, payment receipts, or any other source.
//     This was the failure mode that produced bogus cashbook rows for AVAILS.
//
//  3. SCALE-CHECK RULE — after extracting CREDIT/DEBIT amounts, cross-check
//     against the printed BALANCE column. If prior_balance + credit − debit
//     does not equal the printed next balance, you have misread digits.
//     This catches the 197 000 → 19 700 (10× scale) class of error.
//
// Plus extension: v4 also extracts Financial Report (8 fixed categories with
// per-row line items) and Bank Reconciliation (fixed-field form). These
// pages are typically MUCH cleaner than the cashbook because they're typed
// on a structured template — the extraction is reliable.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const BUCKET = 'm1-supporting-docs';
const CLAUDE_MODEL = 'claude-sonnet-4-5';
const CLAUDE_MAX_TOKENS = 16000;

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
  { id: 'executive_summary',     title: '1. EXECUTIVE SUMMARY' },
  { id: 'technical_activities',  title: '2. IMPLEMENTATION OF TECHNICAL ACTIVITIES' },
  { id: 'technology_transfer',   title: '3. IMPLEMENTATION OF TECHNOLOGY TRANSFER' },
  { id: 'outputs_results',       title: '4. PROJECT OUTPUTS AND RESULTS' },
  { id: 'partnership_cooperation', title: '5. PARTNERSHIP AND COOPERATION' },
  { id: 'problems_solutions',    title: '6. PROBLEMS AND POSSIBLE SOLUTIONS' },
  { id: 'recommendations_mgp',   title: '7. RECOMMENDATIONS AND REQUESTS TO THE MGP' },
];

const FR_CATEGORY_IDS = ['I-A','I-B','I-C','I-D','I-E','I-F','II','III'] as const;

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

  const ent = await admin.from('enterprises').select('id, organization_id, beneficiary_short_name').eq('id', enterpriseId).single();
  if (ent.error || !ent.data) return json({ error: `Enterprise not found: ${ent.error?.message ?? ''}` }, 404);

  const sub = await admin
    .from('m1_submissions')
    .select('id, status, uploaded_pdf_path')
    .eq('enterprise_id', enterpriseId)
    .maybeSingle();
  if (sub.error) return json({ error: `M1 lookup: ${sub.error.message}` }, 500);
  if (sub.data?.status === 'approved') {
    return json({ error: 'Approved M1 submission exists; reopen it before re-importing.' }, 409);
  }
  const pdfPath = sub.data?.uploaded_pdf_path ?? `${enterpriseId}/_source.pdf`;

  const dl = await admin.storage.from(BUCKET).download(pdfPath);
  if (dl.error || !dl.data) return json({ error: `PDF download: ${dl.error?.message ?? 'no data — upload an M1 PDF first'}` }, 400);
  const bytes = new Uint8Array(await dl.data.arrayBuffer());
  let b64 = ''; const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) b64 += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  const pdfB64 = btoa(b64);

  const sys = `You extract structured responses from Lesotho SADP-II Milestone 1 (M1) progress reports. Return STRICT JSON only — no prose, no markdown fences. If a field is unreadable, omit it and add a note in the notes array.

=== Document structure ===

A full M1 report is multiple pages stapled together. They fall into TWO groups:

GROUP A — extract from these:
  1. Cover page (Annex V/A): project metadata, signatures, dates.
  2. II Narrative Progress Report (seven free-text sections).
  3. Cashbook (ONE PAGE — single bordered table with header 'SMALLHOLDER AGRICULTURE DEVELOPMENT PROJECT / MATCHING GRANTS PROGRAM / [BENEFICIARY] / CASHBOOK' + 'MILESTONE [n] PERIOD [...]' row).
  4. Financial Report (page titled 'FORMART FOR FINANCIAL REPORTS (In LSL)' — categorised, source-of-funds split).
  5. Bank Reconciliation (page titled 'RECONCILIATION OF GRANT BANK STATEMENT').

GROUP B — DO NOT extract entries from these:
  - Bank statements (FNB / Standard Bank etc., labelled 'Statement Period').
  - Transaction history printouts.
  - Supplier receipts and invoices (Ready Pump RPS, Budget Hardware, etc.).
  - SWIFT payment advices.

=== CRITICAL RULES FOR THE CASHBOOK ===

RULE 1 — ROTATION AWARENESS.
The cashbook is a wide landscape table. It is often PRINTED SIDEWAYS on a
portrait-orientation page so the page looks rotated 90° (column headers
running top-to-bottom on the left edge). When you encounter this, MENTALLY
ROTATE the page and read column-by-column. Many M1 reports have this
layout — do not give up on the cashbook just because the page is sideways.

RULE 2 — STRICT NO-RECONSTRUCTION.
If, after rotation, the cashbook page is still unreadable for any reason
(blurry scan, illegible handwriting, missing values, ambiguous columns),
you MUST return ZERO cashbook entries (an empty entries[] array) plus an
explicit extraction note saying so. Examples of valid notes:

  { "field": "cashbook", "note": "Cashbook page (page 5) found but rotated and blurry; values not readable with confidence. Manual entry required.", "confidence": "low" }
  { "field": "cashbook", "note": "No dedicated cashbook page found in the PDF.", "confidence": "high" }

You MUST NOT, under any circumstances:
  ✗ Reconstruct cashbook entries from the narrative report.
  ✗ Reconstruct cashbook entries from bank statements.
  ✗ Reconstruct cashbook entries from payment receipts, SWIFT advices, invoices, or any other supporting document.
  ✗ Invent rows that do not appear on the cashbook page.
  ✗ Merge bank-statement transactions into the cashbook table.

The cashbook is the SUPERVISOR'S CONSOLIDATED RECORD. Bank statements + receipts are separate supporting documents. If you find yourself looking at pages 8–20 to "fill in" cashbook entries you missed on page 5, STOP. That is reconstruction. Return zero entries with a note instead.

RULE 3 — SCALE-CHECK.
For every entry you extract, perform this check before emitting it:

  prior_running_balance + credit − debit  ==  next_running_balance (printed in column 'BALANCE')

If the math does not balance, you have misread a digit (commonly the
100,000s place — e.g. reading 197,000 as 19,700). Re-examine the digits
in CREDIT or DEBIT, fix the value, and re-check. If after two attempts
the math still doesn't balance, omit that entry and add a note flagging
the row.

=== CRITICAL: cashbook column mapping ===

The Cashbook page has TEN visible columns. They are NOT named the way our schema's fields are named — map them carefully:

  PDF column 1 'DATE'           → entry.date         (ISO yyyy-mm-dd; original is dd/mm/yyyy)
  PDF column 2 'ITEM'           → entry.item         (the budget CODE like 'I-A', 'OTHERS', 'I-B' — often blank for the first few rows)
  PDF column 3 'BUDGET'         → entry.budget_code  (the budget TYPE like 'MATERIAL', 'OTHERS' — also often blank)
  PDF column 4 'SUPPLIER'       → entry.supplier     (full supplier name, e.g. 'READY PUMP SERVICES (PTY) LTD' — DO NOT TRUNCATE)
  PDF column 5 'DESCRIPTION'    → entry.description  (what the payment is for, e.g. 'BOREHOLE DRILLING')
  PDF column 6 'CREDIT'         → entry.credit       (number; money in)
  PDF column 7 'DEBIT'          → entry.debit        (number; money out)
  PDF column 8 'ACCUM'          → IGNORE (recomputed downstream)
  PDF column 9 'BALANCE'        → use ONLY for the scale-check (rule 3) — do not store
  PDF column 10 'BUDGET BALANCE' → IGNORE (recomputed downstream)

Common misreads to AVOID:
  ✗ Putting the supplier name in entry.item. (entry.item is the CODE like 'I-A', not the supplier name.)
  ✗ Truncating supplier names. (Keep the full name as printed.)
  ✗ Skipping the BUDGET column. (Put 'MATERIAL' / 'OTHERS' / etc. in entry.budget_code.)
  ✗ Using American date format. (Source is dd/mm/yyyy — e.g. '25/09/2025' is 25 September, not 9 May.)

The OPENING BALANCE row (typically labelled 'BALANCE B/F' with no money values, or the first row with a date but no credit/debit) goes into cashbook.opening_balance separately — NOT into entries[].

Numbers in the cashbook are in Lesotho Loti (LSL, also written 'M'). Parse them as plain numbers — no currency symbol, no thousands separators. The printed amounts often use spaces or commas as thousand separators (e.g. '197 000,00' or '197,000.00') and a comma OR period as the decimal mark.

=== FINANCIAL REPORT (FR) — page 'FORMART FOR FINANCIAL REPORTS (In LSL)' ===

Eight fixed budget categories (DO NOT invent new ids):
  I-A  Project Implementation Costs — Equipment, supplies, material
  I-B  Inputs
  I-C  Labour
  I-D  Transportation
  I-E  Travel for Applicants
  I-F  Others
  II   Technical Assistance
  III  Technology Transfer

Each non-empty line item has: Total Planned, Incurred, Date of Receipts, optional Notes on Differences. The Beneficiary 20% / IFAD 20% / Grant-IDA 60% source-of-funds split columns are AUTO-COMPUTED downstream — IGNORE them.

Each line goes into financial_report.items[] as:
  { category: 'I-A' | 'I-B' | ... | 'III',  // EXACTLY one of the eight ids
    label:            string (e.g. 'BUTCHERY MATERIAL' — the row label),
    total_planned:    number,
    incurred:         number,
    date_of_receipts: 'YYYY-MM-DD' or '',
    notes:            string (the 'Notes on Differences' column text) }

The "Total Costs" and "Reallocation of Total Costs" rows are SUMMARY rows — DO NOT include them as line items.

Also extract these header fields if present on the FR page:
  financial_report.report_number          (e.g. 1)
  financial_report.reporting_period_start (ISO from "Reporting Period")
  financial_report.reporting_period_end   (ISO)
  financial_report.reporting_date         (ISO from "Reporting Date")

=== BANK RECONCILIATION (BR) — page 'RECONCILIATION OF GRANT BANK STATEMENT' ===

Fixed-field form (single page). Extract these fields verbatim — they are
typed numbers, not handwritten:

  bank_reconciliation.matching_grant_beneficiary_contribution   number
  bank_reconciliation.total_grant_funds_from_sadp_pmu           number
  bank_reconciliation.total_eligible_expenditure                number
  bank_reconciliation.amount_held_attached                      boolean (true if 'Attached' is printed)
  bank_reconciliation.amount_held_value                         number (only if a numeric value is printed)
  bank_reconciliation.balance_per_bank_statement                number
  bank_reconciliation.opening_balance                           number
  bank_reconciliation.own_deposit                               number
  bank_reconciliation.interest_received                         number
  bank_reconciliation.total_receipts                            number
  bank_reconciliation.bank_charges                              number
  bank_reconciliation.project_leader_name                       string (from signature line)
  bank_reconciliation.project_leader_signed_date                'YYYY-MM-DD'

The "Subtotal", "Net surplus", "Difference", "Total explained differences",
and "Unexplained differences" are COMPUTED rows on the printed form — IGNORE
them (they are recalculated downstream).

OMIT any FR or BR field you cannot read with confidence. Do not null-fill.`;

  const usr = `Extract M1 responses from the attached PDF.

Return JSON with this exact shape:

{
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
    "opening_balance_date": "YYYY-MM-DD or omit",
    "entries": [
      {
        "date": "YYYY-MM-DD",
        "item":         "I-A or OTHERS or ''",
        "budget_code":  "MATERIAL or OTHERS or ''",
        "supplier":     "FULL supplier name verbatim from SUPPLIER column",
        "description": "DESCRIPTION column text",
        "credit": 40000,
        "debit": 0
      }
    ]
  },
  "financial_report": {
    "report_number": 1,
    "reporting_period_start": "YYYY-MM-DD or omit",
    "reporting_period_end":   "YYYY-MM-DD or omit",
    "reporting_date":         "YYYY-MM-DD or omit",
    "items": [
      {
        "category": "I-A",
        "label":    "BUTCHERY MATERIAL",
        "total_planned": 300000,
        "incurred": 197000,
        "date_of_receipts": "YYYY-MM-DD or ''",
        "notes": "the surplus will be used to carry out other activities in the next milestone"
      }
    ]
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
  "m1_period_start": "YYYY-MM-DD or omit",
  "m1_period_end":   "YYYY-MM-DD or omit",
  "report_date":     "YYYY-MM-DD or omit",
  "notes": [
    { "field": "cashbook.entries[2]", "note": "Amount smudged — read as 11,566.50 with low confidence", "confidence": "low" }
  ]
}

Narrative section ids (use these keys EXACTLY): ${NARRATIVE_SECTIONS.map((s) => s.id).join(', ')}.

Reminder of column-to-field mapping for cashbook entries[]:
  PDF 'ITEM'        → entry.item        (code: I-A / OTHERS)
  PDF 'BUDGET'      → entry.budget_code (type: MATERIAL / OTHERS)
  PDF 'SUPPLIER'    → entry.supplier    (full name; do not truncate)
  PDF 'DESCRIPTION' → entry.description

Financial Report categories must be one of: ${FR_CATEGORY_IDS.join(', ')}.

Omit any field you can't read with confidence (do not null-fill). Include at least one entry in notes summarising:
  - Overall scan quality.
  - Whether the cashbook page was readable, and how many rows you found.
  - Whether the FR page was present and readable.
  - Whether the BR page was present and readable.`;

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
  if (!cRes.ok) { const e = await cRes.text(); return json({ error: `Claude ${cRes.status}: ${e.slice(0,500)}` }, 502); }
  const cBody = await cRes.json();
  const out = (cBody.content?.[0]?.text ?? '').trim();
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) return json({ error: 'Claude returned no JSON', raw: out.slice(0,800) }, 502);
  let extracted: any;
  try { extracted = JSON.parse(m[0]); }
  catch (e) { return json({ error: `JSON parse: ${(e as Error).message}`, raw: out.slice(0,800) }, 502); }

  // -------- Narrative --------
  const narrative: Record<string, string> = {};
  const narrIn = extracted.narrative ?? {};
  const allowedSections = new Set(NARRATIVE_SECTIONS.map((s) => s.id));
  for (const [k, v] of Object.entries(narrIn)) {
    if (allowedSections.has(k) && typeof v === 'string' && v.trim()) {
      narrative[k] = v.trim();
    }
  }

  // -------- Cashbook --------
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

  // -------- Financial Report --------
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
  if (typeof frIn.remitting_period === 'string') financialReport.remitting_period = frIn.remitting_period;
  if (typeof frIn.reporting_date === 'string') financialReport.reporting_date = frIn.reporting_date;

  // -------- Bank Reconciliation --------
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
  if (typeof brIn.period_start === 'string') bankReconciliation.period_start = brIn.period_start;
  if (typeof brIn.period_end === 'string') bankReconciliation.period_end = brIn.period_end;
  if (typeof brIn.project_leader_name === 'string') bankReconciliation.project_leader_name = brIn.project_leader_name;
  if (typeof brIn.project_leader_signed_date === 'string') bankReconciliation.project_leader_signed_date = brIn.project_leader_signed_date;

  const brHasAnyField = Object.keys(bankReconciliation).length > 0;

  // -------- Notes + metadata --------
  const notes = Array.isArray(extracted.notes) ? extracted.notes : [];
  const m1PeriodStart = typeof extracted.m1_period_start === 'string' ? extracted.m1_period_start : null;
  const m1PeriodEnd   = typeof extracted.m1_period_end   === 'string' ? extracted.m1_period_end   : null;
  const reportDate    = typeof extracted.report_date     === 'string' ? extracted.report_date     : null;

  const importedAt = new Date().toISOString();
  const filledBy = typeof userId === 'string' ? userId : null;
  const patch: any = {
    narrative,
    cashbook,
    financial_report: financialReport,
    filled_by: filledBy,
    status: 'draft',
    imported_from_pdf_path: pdfPath,
    imported_at: importedAt,
    import_notes: notes,
  };
  if (brHasAnyField) patch.bank_reconciliation = bankReconciliation;
  if (m1PeriodStart) patch.m1_period_start = m1PeriodStart;
  if (m1PeriodEnd)   patch.m1_period_end   = m1PeriodEnd;
  if (reportDate)    patch.report_date     = reportDate;

  if (sub.data) {
    const up = await admin.from('m1_submissions').update(patch).eq('id', sub.data.id);
    if (up.error) return json({ error: `M1 update: ${up.error.message}` }, 500);
  } else {
    const ins = await admin.from('m1_submissions').insert({
      enterprise_id: enterpriseId,
      organization_id: ent.data.organization_id,
      uploaded_pdf_path: pdfPath,
      ...patch,
    });
    if (ins.error) return json({ error: `M1 insert: ${ins.error.message}` }, 500);
  }

  return json({
    ok: true,
    enterprise_id: enterpriseId,
    narrative_sections_filled: Object.keys(narrative).length,
    cashbook_entry_count: cashbook.entries.length,
    financial_report_item_count: frItems.length,
    bank_reconciliation_filled: brHasAnyField,
    notes,
  });
});
