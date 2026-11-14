/**
 * Per-milestone money tracking for an enterprise (migration 410).
 *
 * Stored as `mgp_tracking.stage_finances` jsonb, keyed by milestone ('m1'|'m2').
 * Mirrors the team's Round 3 contribution + SADP budget sheets:
 *   - Farmer (counterpart) contribution: contract amount, contributed to date
 *     (variance = contract − contributed).
 *   - SADP / Budget Allocation: amount, BA status + submission date.
 *   - Funds: allocated, depleted, "yet to report", plus the stage report status.
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

export interface StageFinance {
  farmer_contract_lsl: number | null;
  farmer_contributed_lsl: number | null;
  sadp_contributed_lsl: number | null;
  ba_status: BaStatus | null;
  ba_submitted_date: string | null;
  funds_allocated_lsl: number | null;
  funds_depleted_lsl: number | null;
  yet_to_report_lsl: number | null;
  report_status: StageReportStatus | null;
  report_date: string | null;
  /** Report submitted to the PFO (Project Field Officer, SADP). */
  pfo_submitted_date: string | null;
  /** Report approved by SADP. */
  sadp_approved_date: string | null;
}

export type StageFinancesMap = Partial<Record<MoneyStage, StageFinance>>;

/** A blank record — every field unset. */
export function emptyStageFinance(): StageFinance {
  return {
    farmer_contract_lsl: null,
    farmer_contributed_lsl: null,
    sadp_contributed_lsl: null,
    ba_status: null,
    ba_submitted_date: null,
    funds_allocated_lsl: null,
    funds_depleted_lsl: null,
    yet_to_report_lsl: null,
    report_status: null,
    report_date: null,
    pfo_submitted_date: null,
    sadp_approved_date: null,
  };
}

const NUM_FIELDS = [
  'farmer_contract_lsl',
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

/** Safely parse one stage's record from arbitrary jsonb. */
function parseOne(raw: unknown): StageFinance {
  const out = emptyStageFinance();
  if (!raw || typeof raw !== 'object') return out;
  const o = raw as Record<string, unknown>;
  for (const f of NUM_FIELDS) out[f] = coerceNum(o[f]);
  out.ba_status = BA_STATUSES.includes(o.ba_status as BaStatus) ? (o.ba_status as BaStatus) : null;
  out.report_status = REPORT_STATUSES.includes(o.report_status as StageReportStatus) ? (o.report_status as StageReportStatus) : null;
  out.ba_submitted_date = typeof o.ba_submitted_date === 'string' ? o.ba_submitted_date : null;
  out.report_date = typeof o.report_date === 'string' ? o.report_date : null;
  out.pfo_submitted_date = typeof o.pfo_submitted_date === 'string' ? o.pfo_submitted_date : null;
  out.sadp_approved_date = typeof o.sadp_approved_date === 'string' ? o.sadp_approved_date : null;
  return out;
}

/** Parse the whole `stage_finances` jsonb into a typed map. */
export function parseStageFinances(json: Json | null | undefined): StageFinancesMap {
  const map: StageFinancesMap = {};
  if (!json || typeof json !== 'object') return map;
  const o = json as Record<string, unknown>;
  for (const s of MONEY_STAGES) {
    if (o[s] && typeof o[s] === 'object') map[s] = parseOne(o[s]);
  }
  return map;
}

/** Serialise a map back to jsonb, dropping stages with no data entered. */
export function serializeStageFinances(map: StageFinancesMap): Record<string, StageFinance> {
  const out: Record<string, StageFinance> = {};
  for (const s of MONEY_STAGES) {
    const f = map[s];
    if (f && hasAnyFinance(f)) out[s] = f;
  }
  return out;
}

/** Get a stage's record, or a blank one when not tracked yet. */
export function stageFinanceOrEmpty(map: StageFinancesMap, stage: MoneyStage): StageFinance {
  return map[stage] ?? emptyStageFinance();
}

/** Outstanding farmer contribution: contract − contributed (null if no contract). */
export function farmerVariance(f: StageFinance): number | null {
  if (f.farmer_contract_lsl == null) return null;
  return f.farmer_contract_lsl - (f.farmer_contributed_lsl ?? 0);
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
    !!f.pfo_submitted_date ||
    !!f.sadp_approved_date
  );
}

/** Days from PFO submission to SADP approval (the approval turnaround), or null. */
export function approvalTurnaroundDays(f: StageFinance): number | null {
  if (!f.pfo_submitted_date || !f.sadp_approved_date) return null;
  const submitted = new Date(`${f.pfo_submitted_date}T00:00:00`).getTime();
  const approved = new Date(`${f.sadp_approved_date}T00:00:00`).getTime();
  if (!Number.isFinite(submitted) || !Number.isFinite(approved)) return null;
  const days = Math.round((approved - submitted) / 86_400_000);
  return days >= 0 ? days : null; // ignore approved-before-submitted (data entry slip)
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
