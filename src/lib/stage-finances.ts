/**
 * Enterprise money tracking (migration 410, reshaped 450 / 460).
 *
 * Stored as `mgp_tracking.stage_finances` jsonb:
 *   - `contract` — the FIXED contract value, shown once at the top of the editor.
 *     Standard enterprises carry a per-milestone split
 *     `{ m1: {sadp,farmer}, m2: {sadp,farmer} }` (M1 160/40 = 200k, M2 240/60 =
 *     300k, total 500k). A couple of non-standard enterprises carry a flat
 *     `{ sadp_lsl, farmer_lsl }` instead and are left as-is. Read-only.
 *   - `m1` / `m2` — per-milestone records: the SADP + farmer contributions entered
 *     against the contract (shown together at the top, not here), a FROZEN
 *     `allocated_lsl` (the SADP grant), the `depletion[]` history (cumulative
 *     readings, each locked with who/when), and the report → PFO → SADP flow.
 *
 * SADP queries live on `mgp_actions` (kind='sadp_query'), not here.
 * All amounts are Maloti (LSL).
 */

/** Loosely-typed jsonb as it arrives from supabase-js. */
export type Json = unknown;

/** Milestones that have a money record (graduation is terminal, no money block). */
export type MoneyStage = 'm1' | 'm2';
export const MONEY_STAGES: MoneyStage[] = ['m1', 'm2'];

/** Budget-allocation approval state (kept in the data, not surfaced in the editor). */
export type BaStatus = 'pending' | 'submitted' | 'approved' | 'partially_paid';


/** One reading in a milestone's fund-depletion history (cumulative total to date). */
export interface SpendEntry {
  /** Cumulative funds depleted as at this reading. */
  amount: number;
  /** When the reading was recorded (ISO). */
  at: string;
  /** Who recorded it (mgp_users.id). */
  by: string | null;
}

export interface StageFinance {
  /** SADP contribution received for this milestone (entered against the contract). */
  sadp_contributed_lsl: number | null;
  /** Farmer counterpart contribution paid in for this milestone. */
  farmer_contributed_lsl: number | null;
  /** FROZEN allocated funds (the SADP grant: M1 160k, M2 240k). */
  allocated_lsl: number | null;
  /** Fund-depletion history — cumulative readings, each locked with who/when. */
  depletion: SpendEntry[];
  // Report dates — each locked once set and stamped with who/when (admin-only revise).
  report_target_date: string | null;
  report_target_by: string | null;
  report_target_at: string | null;
  pfo_submitted_date: string | null;
  pfo_submitted_by: string | null;
  pfo_submitted_at: string | null;
  pfo_approved_date: string | null;
  pfo_approved_by: string | null;
  pfo_approved_at: string | null;
  sadp_approved_date: string | null;
  sadp_approved_by: string | null;
  sadp_approved_at: string | null;
  ba_status: BaStatus | null;
  ba_submitted_date: string | null;
}

/** The four stamped, lockable report dates (base key → used as `${base}_date/_by/_at`). */
export type ReportDateKey = 'report_target' | 'pfo_submitted' | 'pfo_approved' | 'sadp_approved';
export const REPORT_DATE_KEYS: ReportDateKey[] = ['report_target', 'pfo_submitted', 'pfo_approved', 'sadp_approved'];

/** One side's contract amounts for a milestone. */
export interface ContractCell {
  sadp: number | null;
  farmer: number | null;
}

/** The FIXED contract value. `m1`/`m2` for the standard split; `flat` for non-standard. */
export interface ContractValue {
  m1: ContractCell | null;
  m2: ContractCell | null;
  flat: ContractCell | null;
}

export type StageFinancesMap = Partial<Record<MoneyStage, StageFinance>>;

/** The whole money record for an enterprise: fixed contract + milestone records. */
export interface EnterpriseFinances {
  contract: ContractValue;
  stages: StageFinancesMap;
}

/** The standard per-milestone contract split. */
export const STANDARD_CONTRACT: ContractValue = {
  m1: { sadp: 160000, farmer: 40000 },
  m2: { sadp: 240000, farmer: 60000 },
  flat: null,
};

/** The standard frozen allocation (SADP grant) per milestone. */
export const STANDARD_ALLOCATED: Record<MoneyStage, number> = { m1: 160000, m2: 240000 };

/** A blank milestone record. */
export function emptyStageFinance(): StageFinance {
  return {
    sadp_contributed_lsl: null,
    farmer_contributed_lsl: null,
    allocated_lsl: null,
    depletion: [],
    report_target_date: null,
    report_target_by: null,
    report_target_at: null,
    pfo_submitted_date: null,
    pfo_submitted_by: null,
    pfo_submitted_at: null,
    pfo_approved_date: null,
    pfo_approved_by: null,
    pfo_approved_at: null,
    sadp_approved_date: null,
    sadp_approved_by: null,
    sadp_approved_at: null,
    ba_status: null,
    ba_submitted_date: null,
  };
}

export function emptyContract(): ContractValue {
  return { m1: null, m2: null, flat: null };
}

const NUM_FIELDS = ['sadp_contributed_lsl', 'farmer_contributed_lsl', 'allocated_lsl'] as const;

const BA_STATUSES: BaStatus[] = ['pending', 'submitted', 'approved', 'partially_paid'];

function coerceNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function coerceDate(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function parseSpend(raw: unknown): SpendEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const amount = coerceNum(o.amount);
  if (amount == null) return null;
  return { amount, at: coerceDate(o.at) ?? '', by: typeof o.by === 'string' ? o.by : null };
}

/** Safely parse one stage's record from arbitrary jsonb. */
function parseOne(raw: unknown): StageFinance {
  const out = emptyStageFinance();
  if (!raw || typeof raw !== 'object') return out;
  const o = raw as Record<string, unknown>;
  for (const f of NUM_FIELDS) out[f] = coerceNum(o[f]);
  out.ba_status = BA_STATUSES.includes(o.ba_status as BaStatus) ? (o.ba_status as BaStatus) : null;
  out.ba_submitted_date = coerceDate(o.ba_submitted_date);
  for (const base of REPORT_DATE_KEYS) {
    out[`${base}_date`] = coerceDate(o[`${base}_date`]);
    out[`${base}_by`] = typeof o[`${base}_by`] === 'string' ? (o[`${base}_by`] as string) : null;
    out[`${base}_at`] = coerceDate(o[`${base}_at`]);
  }
  out.depletion = Array.isArray(o.depletion) ? (o.depletion.map(parseSpend).filter(Boolean) as SpendEntry[]) : [];
  return out;
}

function parseCell(raw: unknown): ContractCell | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const sadp = coerceNum(o.sadp);
  const farmer = coerceNum(o.farmer);
  if (sadp == null && farmer == null) return null;
  return { sadp, farmer };
}

/** Parse the fixed contract value (split or flat). */
export function parseContract(json: Json | null | undefined): ContractValue {
  if (!json || typeof json !== 'object') return emptyContract();
  const c = (json as Record<string, unknown>).contract;
  if (!c || typeof c !== 'object') return emptyContract();
  const o = c as Record<string, unknown>;
  const m1 = parseCell(o.m1);
  const m2 = parseCell(o.m2);
  if (m1 || m2) return { m1, m2, flat: null };
  // Legacy / non-standard flat form: { sadp_lsl, farmer_lsl }
  const sadp = coerceNum(o.sadp_lsl);
  const farmer = coerceNum(o.farmer_lsl);
  if (sadp != null || farmer != null) return { m1: null, m2: null, flat: { sadp, farmer } };
  return emptyContract();
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

/** True when a stage record has at least one value entered. */
export function hasAnyFinance(f: StageFinance): boolean {
  return (
    NUM_FIELDS.some((k) => f[k] != null) ||
    f.depletion.length > 0 ||
    f.ba_status != null ||
    !!f.ba_submitted_date ||
    !!f.report_target_date ||
    !!f.pfo_submitted_date ||
    !!f.pfo_approved_date ||
    !!f.sadp_approved_date
  );
}

/** Serialise a stage map back to jsonb, dropping stages with no data. */
export function serializeStageFinances(map: StageFinancesMap): Record<string, StageFinance> {
  const out: Record<string, StageFinance> = {};
  for (const s of MONEY_STAGES) {
    const f = map[s];
    if (f && hasAnyFinance(f)) out[s] = f;
  }
  return out;
}

/** Serialise the contract value back to jsonb (split or flat), or null when empty. */
export function serializeContract(c: ContractValue): Record<string, unknown> | null {
  if (c.m1 || c.m2) {
    return { m1: c.m1 ?? null, m2: c.m2 ?? null };
  }
  if (c.flat) return { sadp_lsl: c.flat.sadp, farmer_lsl: c.flat.farmer };
  return null;
}

/** Serialise the whole money record (contract + milestones) to jsonb. */
export function serializeFinances(ef: EnterpriseFinances): Record<string, unknown> {
  const out: Record<string, unknown> = serializeStageFinances(ef.stages);
  const contract = serializeContract(ef.contract);
  if (contract) out.contract = contract;
  return out;
}

/** Get a stage's record, or a blank one when not tracked yet. */
export function stageFinanceOrEmpty(map: StageFinancesMap, stage: MoneyStage): StageFinance {
  return map[stage] ?? emptyStageFinance();
}

// ---- Contract / deficit helpers ----

export function cellTotal(cell: ContractCell | null): number {
  if (!cell) return 0;
  return (cell.sadp ?? 0) + (cell.farmer ?? 0);
}

/** True when the enterprise carries the standard per-milestone split. */
export function hasSplit(c: ContractValue): boolean {
  return !!(c.m1 || c.m2);
}

/** Total contracted SADP across the contract (split or flat). */
export function contractSadp(c: ContractValue): number {
  if (hasSplit(c)) return (c.m1?.sadp ?? 0) + (c.m2?.sadp ?? 0);
  return c.flat?.sadp ?? 0;
}

/** Total contracted farmer across the contract (split or flat). */
export function contractFarmer(c: ContractValue): number {
  if (hasSplit(c)) return (c.m1?.farmer ?? 0) + (c.m2?.farmer ?? 0);
  return c.flat?.farmer ?? 0;
}

/** Grand total contract value. */
export function contractGrandTotal(c: ContractValue): number {
  return contractSadp(c) + contractFarmer(c);
}

/** Total SADP contribution received across the milestones. */
export function totalSadpContributed(map: StageFinancesMap): number {
  return MONEY_STAGES.reduce((a, s) => a + (map[s]?.sadp_contributed_lsl ?? 0), 0);
}

/** Total farmer contribution paid in across the milestones. */
export function totalFarmerContributed(map: StageFinancesMap): number {
  return MONEY_STAGES.reduce((a, s) => a + (map[s]?.farmer_contributed_lsl ?? 0), 0);
}

/** SADP deficit for the enterprise: contracted − contributed (floored at 0). */
export function sadpDeficit(c: ContractValue, map: StageFinancesMap): number {
  return Math.max(0, contractSadp(c) - totalSadpContributed(map));
}

/** Farmer deficit for the enterprise: contracted − contributed (floored at 0). */
export function farmerDeficit(c: ContractValue, map: StageFinancesMap): number {
  return Math.max(0, contractFarmer(c) - totalFarmerContributed(map));
}

/** Total outstanding deficit (SADP + farmer). */
export function totalDeficit(c: ContractValue, map: StageFinancesMap): number {
  return sadpDeficit(c, map) + farmerDeficit(c, map);
}

// ---- Depletion helpers ----

/** Total funds depleted for a milestone — the sum of every recorded drawdown, or null. */
export function currentDepleted(f: StageFinance): number | null {
  if (!f.depletion.length) return null;
  return f.depletion.reduce((a, d) => a + d.amount, 0);
}

/** Percent of allocated funds depleted (latest ÷ allocated), or null. */
export function pctDepleted(f: StageFinance): number | null {
  const dep = currentDepleted(f);
  if (dep == null || !f.allocated_lsl || f.allocated_lsl <= 0) return null;
  return Math.round((dep / f.allocated_lsl) * 100);
}

// ---- Date helpers ----

function dateDiffDays(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const days = Math.round((b - a) / 86_400_000);
  return days >= 0 ? days : null;
}

/** Days from PFO submission to SADP approval (the full approval turnaround), or null. */
export function approvalTurnaroundDays(f: StageFinance): number | null {
  return dateDiffDays(f.pfo_submitted_date, f.sadp_approved_date);
}

/** Days from PFO submission to PFO approval (the PFO leg), or null. */
export function pfoApprovalDays(f: StageFinance): number | null {
  return dateDiffDays(f.pfo_submitted_date, f.pfo_approved_date);
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
