/**
 * Report approval SLA — which reports are aging while they wait on SADP, so
 * staff can chase the bottleneck instead of discovering it after the fact.
 *
 * Two sources, both already in the tracker:
 *   1. Dated in-flight report — a milestone with a PFO-submitted date but no
 *      SADP-approved date yet. daysWaiting = today − pfo_submitted. This is the
 *      precise report SLA (the turnaround clock, still running).
 *   2. Pipeline fallback — an enterprise whose approval stage is "At SADP"
 *      (awaiting approval) but whose PFO/SADP dates aren't filled in yet;
 *      daysWaiting = days in that stage (stage_since). Keeps the queue useful
 *      before staff capture dates.
 *
 * The complementary "Report approval time" card measures *completed* turnaround
 * (PFO → SADP) by milestone and district; this measures the clock that is still
 * ticking. Per-PFO turnaround isn't derivable — the PFO a report is submitted to
 * isn't captured per enterprise — so grouping stays at district level elsewhere.
 */
import { daysSince, type Item } from './data';
import { parseStageFinances, MONEY_STAGES, type MoneyStage } from './stage-finances';

export type SlaLevel = 'breach' | 'warn' | 'ok';

/** Approve within this many days of PFO submission; past it is an SLA breach. */
export const SLA_TARGET_DAYS = 30;
/** Approaching the target — worth chasing before it breaches. */
export const SLA_WARN_DAYS = 21;

export const SLA_META: Record<SlaLevel, { label: string; chip: string; bar: string; text: string }> = {
  breach: { label: 'Overdue', chip: 'border-red-200 bg-red-50 text-red-700', bar: 'bg-red-500', text: 'text-red-700' },
  warn: { label: 'Due soon', chip: 'border-amber-200 bg-amber-50 text-amber-800', bar: 'bg-amber-500', text: 'text-amber-700' },
  ok: { label: 'On time', chip: 'border-slate-200 bg-slate-50 text-slate-600', bar: 'bg-fdblue', text: 'text-slate-600' },
};

export function slaLevel(days: number): SlaLevel {
  if (days >= SLA_TARGET_DAYS) return 'breach';
  if (days >= SLA_WARN_DAYS) return 'warn';
  return 'ok';
}

/** One dated report still waiting on SADP approval. */
export interface InflightReport {
  stage: MoneyStage;
  submitted: string; // pfo_submitted_date
  daysWaiting: number;
  level: SlaLevel;
}

export interface ReportSla {
  /** True when something (a dated report or the At-SADP stage) is awaiting approval. */
  waiting: boolean;
  /** Worst days-waiting across all signals (null when nothing is waiting). */
  days: number | null;
  level: SlaLevel;
  /** Where the worst signal came from. */
  source: 'report' | 'pipeline' | null;
  /** The milestone of the worst dated report (null when the signal is pipeline-only). */
  stage: MoneyStage | null;
  /** All dated in-flight reports (for the drawer detail). */
  inflight: InflightReport[];
}

function daysSinceDate(d: string): number | null {
  const t = new Date(`${d}T00:00:00`).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

const NONE: ReportSla = { waiting: false, days: null, level: 'ok', source: null, stage: null, inflight: [] };

export function deriveReportSla(it: Item): ReportSla {
  // Graduated — the journey's done, nothing left to chase.
  if (it.lifecycle_stage === 'graduated') return NONE;

  const map = parseStageFinances(it.stage_finances);
  const inflight: InflightReport[] = [];
  for (const s of MONEY_STAGES) {
    const f = map[s];
    if (!f?.pfo_submitted_date || f.sadp_approved_date) continue; // not submitted, or already approved
    const dw = daysSinceDate(f.pfo_submitted_date);
    if (dw == null) continue;
    inflight.push({ stage: s, submitted: f.pfo_submitted_date, daysWaiting: dw, level: slaLevel(dw) });
  }

  // Pipeline fallback: sitting in the "At SADP" approval stage (awaiting approval).
  const atSadpDays = it.stage === 'at_sadp' ? daysSince(it.stage_since) : null;

  const worstReport = inflight.reduce<InflightReport | null>((a, r) => (!a || r.daysWaiting > a.daysWaiting ? r : a), null);
  const reportDays = worstReport?.daysWaiting ?? null;

  if (reportDays == null && atSadpDays == null) return NONE;

  // Prefer the dated report (precise); fall back to the pipeline when it's older or the only signal.
  const useReport = reportDays != null && (atSadpDays == null || reportDays >= atSadpDays);
  const days = useReport ? reportDays! : atSadpDays!;
  return {
    waiting: true,
    days,
    level: slaLevel(days),
    source: useReport ? 'report' : 'pipeline',
    stage: useReport ? worstReport!.stage : null,
    inflight,
  };
}
