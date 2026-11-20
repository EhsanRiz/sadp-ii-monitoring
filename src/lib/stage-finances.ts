/**
 * Enterprise money tracking (migration 410, reshaped 450).
 *
 * Stored as `mgp_tracking.stage_finances` jsonb:
 *   - `contract`  — the single enterprise-level contract value (SADP + farmer),
 *     NOT split across milestones. Standard programme contract is M500,000
 *     (SADP M400,000 + farmer M100,000).
 *   - `m1` / `m2` — per-milestone records: contributions to date, budget
 *     allocation, funds, and the report → PFO → SADP approval flow, including
 *     any rounds where SADP returned the report with queries.
 *
 * All amounts are Maloti (LSL).
 */

/** Loosely-typed jsonb as it arrives from supabase-js. */
export type Json = unknown;

/** Milestones that have a money record (graduation is terminal, no money block). */
export type MoneyStage = 'm1' | 'm2';
export const MONEY_STAGES: MoneyStage[] = ['m1', 'm2'];

/** Budget-allocation approval state (from the SADP budget sheet). */
export type BaStatus = 'pending' | 'submitted' | 'approved' | 'partially_paid';

/** Stage report (M1/M2) approval state — the journey gate. */
export type StageReportStatus = 'pending' | 'submitted' | 'approved';

/**
 * One round of SADP returning a milestone report with queries. Staff address
 * the queries and resend; if SADP returns it again a further round is added.
 */
export interface SadpReturn {
  /** When SADP returned the report with queries. */
  returned_date: string | null;
  /** What SADP queried / asked to be fixed. */
  queries: string | null;
  /** When the (corrected) report was sent back to SADP. */
  resubmitted_date: string | null;
}

export interface StageFinance {
  /** Farmer (counterpart) contribution paid in for this milestone. */
  farmer_contributed_lsl: number | null;
  /** SADP contribution received for this milestone. */
  sadp_contributed_lsl: number | null;
  ba_status: BaStatus | null;
  ba_submitted_date: string | null;
  funds_allocated_lsl: number | null;
  funds_depleted_lsl: number | null;
  yet_to_report_lsl: number | null;
  report_status: StageReportStatus | null;
  report_date: string | null;
  /** Target date for this milestone's report. */
  report_target_date: string | null;
  /** Report submitted to the PFO (Project Field Officer, SADP). */
  pfo_submitted_date: string | null;
  /** Report approved by the PFO. */
  pfo_approved_date: string | null;
  /** Report approved by SADP. */
  sadp_approved_date: string | null;
  /** Rounds where SADP returned the report with queries (oldest first). */
  sadp_returns: SadpReturn[];
}

/** The single enterprise-level contract value (not per milestone). */
export interface ContractValue {
  sadp_lsl: number | null;
  farmer_lsl: number | null;
}

export type StageFinancesMap = Partial<Record<MoneyStage, StageFinance>>;

/** The whole money record for an enterprise: one contract + the milestone records. */
export interface EnterpriseFinances {
  contract: ContractValue;
  stages: StageFinancesMap;
}

/** A blank record — every field unset. */
export function emptyStageFinance(): StageFinance {
  return {
    farmer_contributed_lsl: null,
    sadp_contributed_lsl: null,
    ba_status: null,
    ba_submitted_date: null,
    funds_allocated_lsl: null,
    funds_depleted_lsl: null,
    yet_to_report_lsl: null,
    report_status: null,
    report_date: null,
    report_target_date: null,
    pfo_submitted_date: null,
    pfo_approved_date: null,
    sadp_approved_date: null,
    sadp_returns: [],
  };
}

/** A blank contract value. */
export function emptyContract(): ContractValue {
  return { sadp_lsl: null, farmer_lsl: null };
}

/** The standard programme contract: SADP M400,000 + farmer M100,000 = M500,000. */
export const STANDARD_CONTRACT: ContractValue = { sadp_lsl: 400000, farmer_lsl: 100000 };

const NUM_FIELDS = [
  'farmer_contributed_lsl',
  'sadp_contributed_lsl',
  'funds_allocated_lsl',
  'funds_depleted_lsl',
  'yet_to_report_lsl',
] as const;

const BA_STATUSES: BaStatus[] = ['pending', 'submitted', 'approved', 'partially_paid'];
const REPORT_STATUSES: StageReportStatus[] = ['pending', 'submitted', 'approved'];

function coerceNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function coerceDate(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

/** Parse one SADP-return round from arbitrary jsonb. */
function parseReturn(raw: unknown): SadpReturn {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    returned_date: coerceDate(o.returned_date),
    queries: typeof o.queries === 'string' ? o.queries : null,
    resubmitted_date: coerceDate(o.resubmitted_date),
  };
}

/** Safely parse one stage's record from arbitrary jsonb. */
function parseOne(raw: unknown): StageFinance {
  const out = emptyStageFinance();
  if (!raw || typeof raw !== 'object') return out;
  const o = raw as Record<string, unknown>;
  for (const f of NUM_FIELDS) out[f] = coerceNum(o[f]);
  out.ba_status = BA_STATUSES.includes(o.ba_status as BaStatus) ? (o.ba_status as BaStatus) : null;
  out.report_status = REPORT_STATUSES.includes(o.report_status as StageReportStatus) ? (o.report_status as StageReportStatus) : null;
  out.ba_submitted_date = coerceDate(o.ba_submitted_date);
  out.report_date = coerceDate(o.report_date);
  out.report_target_date = coerceDate(o.report_target_date);
  out.pfo_submitted_date = coerceDate(o.pfo_submitted_date);
  out.pfo_approved_date = coerceDate(o.pfo_approved_date);
  out.sadp_approved_date = coerceDate(o.sadp_approved_date);
  out.sadp_returns = Array.isArray(o.sadp_returns) ? o.sadp_returns.map(parseReturn) : [];
  return out;
}

/** Parse the enterprise-level contract value. */
export function parseContract(json: Json | null | undefined): ContractValue {
  if (!json || typeof json !== 'object') return emptyContract();
  const c = (json as Record<string, unknown>).contract;
  if (!c || typeof c !== 'object') return emptyContract();
  const o = c as Record<string, unknown>;
  return { sadp_lsl: coerceNum(o.sadp_lsl), farmer_lsl: coerceNum(o.farmer_lsl) };
}

/** Parse the milestone records from `stage_finances` jsonb into a typed map. */
export function parseStageFinances(json: Json | null | undefined): StageFinancesMap {
  const map: StageFinancesMap = {};
  if (!json || typeof json !== 'object') return map;
  const o = json as Record<string, unknown>;
  for (const s of MONEY_STAGES) {
    if (o[s] && typeof o[s] === 'object') map[s] = parseOne(o[s]);
  }
  return map;
}

/** Parse the whole money record (contract + milestones). */
export function parseFinances(json: Json | null | undefined): EnterpriseFinances {
  return { contract: parseContract(json), stages: parseStageFinances(json) };
}

/** True when a SADP-return round has any value worth keeping. */
export function hasReturnData(r: SadpReturn): boolean {
  return !!r.returned_date || !!r.resubmitted_date || !!(r.queries && r.queries.trim());
}

/** Serialise a map back to jsonb, dropping stages with no data entered. */
export function serializeStageFinances(map: StageFinancesMap): Record<string, StageFinance> {
  const out: Record<string, StageFinance> = {};
  for (const s of MONEY_STAGES) {
    const f = map[s];
    if (!f || !hasAnyFinance(f)) continue;
    out[s] = { ...f, sadp_returns: f.sadp_returns.filter(hasReturnData) };
  }
  return out;
}

/** Serialise the whole money record (contract + milestones) to jsonb. */
export function serializeFinances(ef: EnterpriseFinances): Record<string, unknown> {
  const out: Record<string, unknown> = serializeStageFinances(ef.stages);
  if (ef.contract.sadp_lsl != null || ef.contract.farmer_lsl != null) {
    out.contract = { sadp_lsl: ef.contract.sadp_lsl, farmer_lsl: ef.contract.farmer_lsl };
  }
  return out;
}

/** Get a stage's record, or a blank one when not tracked yet. */
export function stageFinanceOrEmpty(map: StageFinancesMap, stage: MoneyStage): StageFinance {
  return map[stage] ?? emptyStageFinance();
}

/** The contract value total (SADP + farmer), or null when neither is set. */
export function contractTotal(c: ContractValue): number | null {
  if (c.sadp_lsl == null && c.farmer_lsl == null) return null;
  return (c.sadp_lsl ?? 0) + (c.farmer_lsl ?? 0);
}

/** Total farmer contribution paid in across the milestones. */
export function totalFarmerContributed(map: StageFinancesMap): number {
  return MONEY_STAGES.reduce((a, s) => a + (map[s]?.farmer_contributed_lsl ?? 0), 0);
}

/** Total SADP contribution received across the milestones. */
export function totalSadpContributed(map: StageFinancesMap): number {
  return MONEY_STAGES.reduce((a, s) => a + (map[s]?.sadp_contributed_lsl ?? 0), 0);
}

/**
 * Outstanding farmer contribution for the enterprise: contract farmer amount −
 * total paid in across milestones. Null when no farmer contract is captured.
 */
export function farmerOutstanding(c: ContractValue, map: StageFinancesMap): number | null {
  if (c.farmer_lsl == null) return null;
  return c.farmer_lsl - totalFarmerContributed(map);
}

/** Percent of allocated funds depleted (0–100+), or null if nothing allocated. */
export function pctDepleted(f: StageFinance): number | null {
  if (!f.funds_allocated_lsl || f.funds_allocated_lsl <= 0) return null;
  return Math.round(((f.funds_depleted_lsl ?? 0) / f.funds_allocated_lsl) * 100);
}

/** True when a stage record has at least one value entered. */
export function hasAnyFinance(f: StageFinance): boolean {
  return (
    NUM_FIELDS.some((k) => f[k] != null) ||
    f.ba_status != null ||
    f.report_status != null ||
    !!f.ba_submitted_date ||
    !!f.report_date ||
    !!f.report_target_date ||
    !!f.pfo_submitted_date ||
    !!f.pfo_approved_date ||
    !!f.sadp_approved_date ||
    f.sadp_returns.some(hasReturnData)
  );
}

/** Days between two YYYY-MM-DD dates (to − from), or null when either is missing/invalid/negative. */
function dateDiffDays(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const days = Math.round((b - a) / 86_400_000);
  return days >= 0 ? days : null; // ignore approved-before-submitted (data-entry slip)
}

/** Days from PFO submission to SADP approval (the full approval turnaround), or null. */
export function approvalTurnaroundDays(f: StageFinance): number | null {
  return dateDiffDays(f.pfo_submitted_date, f.sadp_approved_date);
}

/** Days from PFO submission to PFO approval (the PFO leg), or null. */
export function pfoApprovalDays(f: StageFinance): number | null {
  return dateDiffDays(f.pfo_submitted_date, f.pfo_approved_date);
}

/** How many times SADP returned this milestone's report with queries. */
export function returnCount(f: StageFinance): number {
  return f.sadp_returns.filter(hasReturnData).length;
}

/** Format an LSL amount as "M100,000"; em-dash when unset. */
export function formatLsl(n: number | null | undefined): string {
  if (n == null) return '—';
  return `M${Math.round(n).toLocaleString('en-US')}`;
}

/** Compact LSL for tight chips: "M60k", "M1.2M", "M0"; em-dash when unset. */
export function formatLslShort(n: number | null | undefined): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `M${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `M${Math.round(n / 1_000)}k`;
  return `M${Math.round(n)}`;
}

export const BA_STATUS_META: Record<BaStatus, { label: string; tone: 'neutral' | 'progress' | 'success' | 'flag' }> = {
  pending: { label: 'Pending', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'progress' },
  approved: { label: 'Approved', tone: 'success' },
  partially_paid: { label: 'Partially paid', tone: 'flag' },
};

export const REPORT_STATUS_META: Record<StageReportStatus, { label: string; tone: 'neutral' | 'progress' | 'success' }> = {
  pending: { label: 'Pending', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'progress' },
  approved: { label: 'Approved', tone: 'success' },
};
