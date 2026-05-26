// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const BUCKET = 'm1-supporting-docs';
const CLAUDE_MODEL = 'claude-sonnet-4-5';
const CLAUDE_MAX_TOKENS = 12000;

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
  4. Financial Report (categorised, source-of-funds split).
  5. Bank Reconciliation.

GROUP B — DO NOT extract entries from these:
  - Bank statements (FNB / Standard Bank etc., labelled 'Statement Period').
  - Transaction history printouts.
  - Supplier receipts and invoices (Ready Pump RPS, Budget Hardware, etc.).

=== CRITICAL: cashbook column mapping ===

The Cashbook page has TEN visible columns. They are NOT named the way our schema's fields are named — you must map them carefully:

  PDF column 1 'DATE'           → entry.date         (ISO yyyy-mm-dd; original is dd/mm/yyyy)
  PDF column 2 'ITEM'           → entry.item         (the budget CODE like 'I-A', 'OTHERS', 'I-B' — often blank for the first few rows)
  PDF column 3 'BUDGET'         → entry.budget_code  (the budget TYPE like 'MATERIAL', 'OTHERS' — also often blank)
  PDF column 4 'SUPPLIER'       → entry.supplier     (full supplier name, e.g. 'READY PUMP SERVICES (PTY) LTD' — DO NOT TRUNCATE)
  PDF column 5 'DESCRIPTION'    → entry.description  (what the payment is for, e.g. 'BOREHOLE DRILLING')
  PDF column 6 'CREDIT'         → entry.credit       (number; money in)
  PDF column 7 'DEBIT'          → entry.debit        (number; money out)
  PDF column 8 'ACCUM'          → IGNORE (recomputed downstream)
  PDF column 9 'BALANCE'        → IGNORE (recomputed downstream)
  PDF column 10 'BUDGET BALANCE' → IGNORE (recomputed downstream)

Common misreads to AVOID:
  ✗ Putting the supplier name in entry.item. (entry.item is the CODE like 'I-A', not the supplier name.)
  ✗ Truncating supplier names. (Keep the full name as printed.)
  ✗ Skipping the BUDGET column. (Put 'MATERIAL' / 'OTHERS' / etc. in entry.budget_code.)
  ✗ Using American date format. (Source is dd/mm/yyyy — e.g. '25/09/2025' is 25 September, not 9 May.)

=== Other rules ===

The Cashbook is the SUPERVISOR'S CONSOLIDATED record. Bank statements are separate supporting documents. If your draft has more than ~20 entries you are almost certainly pulling from the wrong source — stop and re-read the cashbook page only.

The OPENING BALANCE row (no date, no amounts) goes into cashbook.opening_balance separately.

Numbers in the cashbook are in Lesotho Loti (LSL, also written 'M'). Parse them as plain numbers — no currency symbol, no thousands separators.`;

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
        "item":         "I-A or OTHERS or '' ",
        "budget_code":  "MATERIAL or OTHERS or ''",
        "supplier":     "FULL supplier name verbatim from SUPPLIER column",
        "description": "DESCRIPTION column text",
        "credit": 40000,
        "debit": 0
      }
    ]
  },
  "m1_period_start": "YYYY-MM-DD or omit",
  "m1_period_end": "YYYY-MM-DD or omit",
  "report_date": "YYYY-MM-DD or omit",
  "notes": [ { "field": "cashbook.entries[2]", "note": "Amount smudged — read as 11,566.50 with low confidence", "confidence": "low" } ]
}

Narrative section ids (use these keys EXACTLY): ${NARRATIVE_SECTIONS.map((s) => s.id).join(', ')}.

Reminder of column-to-field mapping for entries[]:
  PDF 'ITEM'     → entry.item        (code: I-A / OTHERS)
  PDF 'BUDGET'   → entry.budget_code (type: MATERIAL / OTHERS)
  PDF 'SUPPLIER' → entry.supplier    (full name; do not truncate)
  PDF 'DESCRIPTION' → entry.description

Omit any field you can't read with confidence (do not null-fill). Include at least one entry in notes summarising overall scan quality + the number of cashbook rows you found.`;

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

  const narrative: Record<string, string> = {};
  const narrIn = extracted.narrative ?? {};
  const allowedSections = new Set(NARRATIVE_SECTIONS.map((s) => s.id));
  for (const [k, v] of Object.entries(narrIn)) {
    if (allowedSections.has(k) && typeof v === 'string' && v.trim()) {
      narrative[k] = v.trim();
    }
  }

  const cashIn = extracted.cashbook ?? {};
  const entries: any[] = Array.isArray(cashIn.entries) ? cashIn.entries : [];
  const cashbook = {
    opening_balance: typeof cashIn.opening_balance === 'number' ? cashIn.opening_balance : 0,
    opening_balance_date: typeof cashIn.opening_balance_date === 'string' ? cashIn.opening_balance_date : undefined,
    currency: 'LSL',
    entries: entries
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

  const notes = Array.isArray(extracted.notes) ? extracted.notes : [];
  const m1PeriodStart = typeof extracted.m1_period_start === 'string' ? extracted.m1_period_start : null;
  const m1PeriodEnd   = typeof extracted.m1_period_end   === 'string' ? extracted.m1_period_end   : null;
  const reportDate    = typeof extracted.report_date     === 'string' ? extracted.report_date     : null;

  const importedAt = new Date().toISOString();
  const filledBy = typeof userId === 'string' ? userId : null;
  const patch: any = {
    narrative,
    cashbook,
    filled_by: filledBy,
    status: 'draft',
    imported_from_pdf_path: pdfPath,
    imported_at: importedAt,
    import_notes: notes,
  };
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
    notes,
  });
});
