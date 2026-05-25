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
  try { return JSON.parse(atob(b64)); } catch { return {}; }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const ESSF_SCHEMA = {
  site_sensitivity: { options: ['low','medium','high'], issues: [
    { id: 'natural_habitats', label: 'Natural habitats' },
    { id: 'water_quality', label: 'Water quality and water resource availability and use' },
    { id: 'natural_hazards', label: 'Natural hazards vulnerability, floods, soil stability/erosion' },
    { id: 'cultural_property', label: 'Cultural property' },
    { id: 'involuntary_resettlement', label: 'Involuntary resettlement' },
  ] },
  completeness: { options: ['yes','no','n_a'], questions: [
    { id: 'project_description', label: 'Description of the proposed project and where it is located' },
    { id: 'site_alternatives', label: 'Information about how the site was chosen, and what alternatives were considered' },
    { id: 'map_drawing', label: 'A map or drawing showing the location and boundary of the project' },
    { id: 'physical_works_plan', label: 'The plan for any physical works' },
    { id: 'access_arrangements', label: 'Any new access arrangements or changes to existing road layouts' },
    { id: 'land_acquisition', label: 'Any land that needs to be acquired' },
    { id: 'work_program', label: 'A work program for construction, operation and decommissioning' },
    { id: 'mitigation_measures', label: 'Information about measures to avoid or minimize adverse environmental and social impacts' },
  ] },
  checklist: { options: ['yes','no'], questions: [
    { id: 'a1', label: 'Involve the construction or rehabilitation of any small dams, weirs or reservoirs?' },
    { id: 'a2', label: 'Support irrigation schemes?' },
    { id: 'a3', label: 'Build or rehabilitate any rural roads?' },
    { id: 'a4', label: 'Build or rehabilitate any electricity power generating system?' },
    { id: 'a5', label: 'Involve food processing?' },
    { id: 'a6', label: 'Build or rehabilitate any structures or buildings?' },
    { id: 'a7', label: 'Support agricultural activities?' },
    { id: 'a8', label: 'Be located in or near an area of historical/archaeological/cultural heritage?' },
    { id: 'a9', label: 'Be located within or adjacent to protected areas / natural habitats?' },
    { id: 'a10', label: 'Depend on water supply from an existing dam or water diversion structure?' },
    { id: 'b1', label: 'Risk causing the contamination of drinking water?' },
    { id: 'b2', label: 'Affect the quantity or quality of surface waters or groundwater?' },
    { id: 'b3', label: 'Cause poor water drainage and increase the risk of water-related diseases?' },
    { id: 'b4', label: 'Harvest or exploit a significant amount of natural resources?' },
    { id: 'b5', label: 'Be located within or nearby environmentally sensitive areas?' },
    { id: 'b6', label: 'Create a risk of increased soil degradation or erosion?' },
    { id: 'b7', label: 'Create a risk of increasing soil salinity?' },
    { id: 'b8', label: 'Produce, or increase the production of, solid or liquid wastes?' },
    { id: 'c1', label: 'Require that land be acquired for its development?' },
    { id: 'c2', label: 'Use land currently occupied or used for productive purposes?' },
    { id: 'c3', label: 'Displace individuals, families or businesses?' },
    { id: 'c4', label: 'Result in loss of crops, fruit trees or household infrastructure?' },
    { id: 'c5', label: 'Result in involuntary restriction of access to protected areas?' },
    { id: 'd1', label: 'Involve the use of pesticides or other agricultural chemicals?' },
  ] },
} as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing bearer token' }, 401);
  const claims = decodeJwtPayload(token);
  const role = claims.user_role; const userId = claims.sub;
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

  const ent = await admin.from('enterprises').select('id, enterprise_type_id, organization_id, esmp_uploaded_pdf_url').eq('id', enterpriseId).single();
  if (ent.error || !ent.data) return json({ error: `Enterprise not found: ${ent.error?.message ?? ''}` }, 404);
  if (!ent.data.esmp_uploaded_pdf_url) return json({ error: 'No PDF uploaded' }, 400);
  const pdfPath = `${enterpriseId}.pdf`;

  const tpl = await admin.from('emmp_templates').select('id, title, version, schema').contains('enterprise_type_ids', [ent.data.enterprise_type_id]).maybeSingle();
  if (tpl.error) return json({ error: `Template lookup: ${tpl.error.message}` }, 500);
  const emmpTemplate: any = tpl.data?.schema ?? null;

  const dl = await admin.storage.from(BUCKET).download(pdfPath);
  if (dl.error || !dl.data) return json({ error: `PDF download: ${dl.error?.message ?? 'no data'}` }, 500);
  const bytes = new Uint8Array(await dl.data.arrayBuffer());
  let b64 = ''; const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) b64 += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  const pdfB64 = btoa(b64);

  // EMMP row map. The id is the SCHEMA item.id verbatim — same key the
  // form uses to store responses. Earlier versions invented positional keys
  // (.m0, .m1, .n0...) which drifted out of sync with the schema's 1-indexed
  // ids and caused off-by-one bugs between form input and PDF render.
  const emmpRows = emmpTemplate ? emmpTemplate.sections.flatMap((s: any) => s.rows.map((r: any) => ({
    id: r.id, activity: r.activity,
    impacts: r.impacts.map((it: any) => ({ id: it.id, label: it.label })),
    mitigations: r.mitigations.map((it: any) => ({ id: it.id, label: it.label })),
    monitoring: r.monitoring.map((it: any) => ({ id: it.id, label: it.label })),
  }))) : [];

  const sys = `You extract structured responses from scanned Lesotho SADP-II ESMP forms (Environmental and Social Screening Form + EMMP table). Return STRICT JSON only, no prose, no markdown fences. If a field is unreadable, omit it and add a note in the notes array.

CRITICAL — checkbox detection on these printed forms:

Every selectable item (impacts, mitigations, monitoring parameters, Yes/No/NA columns) is printed with a small empty square (☐) in front of the text. The field supervisor selects an item by drawing a handwritten tick / X / cross / slash. On these particular SADP-II forms, the handwritten mark almost NEVER lands inside the printed square — it usually appears OUTSIDE and slightly LEFT of the box, in a kind of selection gutter between the cell's left border and the printed square. Sometimes it overlaps the edge of the box; sometimes it sits in clean whitespace to the left.

When deciding if an item is selected, look at the ENTIRE row of that item across the whole cell, not just the inside of the printed square. ANY visible handwritten mark — ✓, check, X, cross, diagonal slash, line, dot, filled circle, scribble — in line with that item's row counts as SELECTED. The printed square will almost always remain empty even when the item is selected.

Bias toward over-detection of ticks in the impacts/mitigations/monitoring columns. A human reviews every draft before approval, so false positives are corrected easily. False negatives — missing a real tick — force the reviewer to re-tick by hand, which defeats the point of auto-extraction.

For the ESSF Yes/No/NA columns (sections 2 and 3), the mark is usually a single tick in one of the three boxes and is much closer to the boxes themselves; treat those normally.

For EMMP free-text columns (Person to Implement, Person to Monitor, Time Frame), return empty string when the cell says N/A or NOT APPLICABLE or is visually blank.`;

  const usr = `Extract from the attached PDF.

ESSF schema:
${JSON.stringify(ESSF_SCHEMA, null, 2)}

${emmpTemplate ? `EMMP template (${emmpTemplate.title}, ${emmpTemplate.version}):
${JSON.stringify(emmpRows, null, 2)}

For EMMP, return an emmp.checks array of item ids (the 'id' field from above, used VERBATIM — e.g. '1.1.r5.m2', '1.1.r5.p1') for EVERY item whose checkbox is ticked in the PDF. Do NOT invent ids, do NOT change indexing, do NOT add suffixes. Also return per-row free-text keys '<row.id>.person_implement', '<row.id>.person_monitor', '<row.id>.timeframe' as strings when the cells contain handwriting; omit otherwise.` : 'No EMMP template for this enterprise type.'}

Return JSON: { essf: { header: {...}, site_sensitivity: {id: 'low|medium|high'}, completeness: {id: 'yes|no|n_a'}, checklist: {id: 'yes|no'} }, emmp: { checks: [...item ids verbatim...], '<row.id>.person_implement': '...', ... }, notes: [ { field, note, confidence } ] }. Omit keys you couldnt read. Always include at least one notes entry.`;

  const cRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: CLAUDE_MAX_TOKENS, system: sys, messages: [{ role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfB64 } }, { type: 'text', text: usr }] }] }),
  });
  if (!cRes.ok) { const e = await cRes.text(); return json({ error: `Claude ${cRes.status}: ${e.slice(0,500)}` }, 502); }
  const cBody = await cRes.json();
  const out = (cBody.content?.[0]?.text ?? '').trim();
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) return json({ error: 'Claude returned no JSON', raw: out.slice(0,800) }, 502);
  let extracted: any;
  try { extracted = JSON.parse(m[0]); } catch (e) { return json({ error: `JSON parse: ${(e as Error).message}`, raw: out.slice(0,800) }, 502); }

  const essfPayload = extracted.essf ?? {};
  const emmpPayload = extracted.emmp ?? {};
  const notes = Array.isArray(extracted.notes) ? extracted.notes : [];

  // Build a set of valid item ids from the template so we silently drop any
  // hallucinated keys (e.g. .m0 / .n0 from an older prompt). Person/timeframe
  // text fields are allowed through.
  const validItemIds = new Set<string>();
  for (const r of emmpRows) {
    for (const it of r.impacts) validItemIds.add(it.id);
    for (const it of r.mitigations) validItemIds.add(it.id);
    for (const it of r.monitoring) validItemIds.add(it.id);
  }
  const validTextSuffix = (k: string) =>
    k.endsWith('.person_implement') || k.endsWith('.person_monitor') || k.endsWith('.timeframe');

  const emmpResponses: Record<string, unknown> = {};
  if (Array.isArray(emmpPayload.checks)) {
    for (const k of emmpPayload.checks) {
      if (typeof k === 'string' && validItemIds.has(k)) emmpResponses[k] = true;
    }
  }
  for (const [k, v] of Object.entries(emmpPayload)) {
    if (k === 'checks') continue;
    if (v === false || v === null || v === undefined || v === '') continue;
    if (validItemIds.has(k)) { emmpResponses[k] = true; continue; }
    if (validTextSuffix(k) && typeof v === 'string') emmpResponses[k] = v;
  }

  const importedAt = new Date().toISOString();
  const filledBy = typeof userId === 'string' ? userId : null;

  const existingEssf = await admin.from('essf_submissions').select('id, status').eq('enterprise_id', enterpriseId).maybeSingle();
  if (existingEssf.error) return json({ error: `ESSF lookup: ${existingEssf.error.message}` }, 500);
  if (existingEssf.data?.status === 'approved') return json({ error: 'Approved ESSF exists; reopen it before re-importing.' }, 409);
  const essfRow: any = { responses: essfPayload, filled_by: filledBy, status: 'draft', imported_from_pdf_path: pdfPath, imported_at: importedAt, import_notes: notes };
  if (existingEssf.data) { const up = await admin.from('essf_submissions').update(essfRow).eq('id', existingEssf.data.id); if (up.error) return json({ error: `ESSF update: ${up.error.message}` }, 500); }
  else { const ins = await admin.from('essf_submissions').insert({ enterprise_id: enterpriseId, organization_id: ent.data.organization_id, ...essfRow }); if (ins.error) return json({ error: `ESSF insert: ${ins.error.message}` }, 500); }

  let emmpStatus: 'imported'|'no_template'|'approved_skip' = 'imported';
  if (!emmpTemplate || !tpl.data) emmpStatus = 'no_template';
  else {
    const existingEmmp = await admin.from('emmp_submissions').select('id, status').eq('enterprise_id', enterpriseId).maybeSingle();
    if (existingEmmp.error) return json({ error: `EMMP lookup: ${existingEmmp.error.message}` }, 500);
    if (existingEmmp.data?.status === 'approved') emmpStatus = 'approved_skip';
    else {
      const emmpRow: any = { responses: emmpResponses, filled_by: filledBy, status: 'draft', template_id: tpl.data.id, imported_from_pdf_path: pdfPath, imported_at: importedAt, import_notes: notes };
      if (existingEmmp.data) { const up = await admin.from('emmp_submissions').update(emmpRow).eq('id', existingEmmp.data.id); if (up.error) return json({ error: `EMMP update: ${up.error.message}` }, 500); }
      else { const ins = await admin.from('emmp_submissions').insert({ enterprise_id: enterpriseId, organization_id: ent.data.organization_id, ...emmpRow }); if (ins.error) return json({ error: `EMMP insert: ${ins.error.message}` }, 500); }
    }
  }

  return json({ ok: true, enterprise_id: enterpriseId, essf: { status: 'imported', has_data: Object.keys(essfPayload).length > 0 }, emmp: { status: emmpStatus, has_data: Object.keys(emmpResponses).length > 0 }, notes });
});
