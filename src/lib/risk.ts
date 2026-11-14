/**
 * Per-enterprise risk flags + a RAG level, to drive the "Needs attention" queue.
 *
 * Pure: derived entirely from data the tracker already holds (approval stage +
 * how long in it, open SADP queries, overdue action items, and the current
 * milestone's finances). The goal is to surface the enterprises staff should
 * chase to keep them moving toward graduation — before they stall.
 */
import { daysSince, type Item } from './data';
import { STAGE, type StageKey } from './stages';
import { parseStageFinances, stageFinanceOrEmpty, farmerVariance, formatLslShort } from './stage-finances';

export type RiskLevel = 'red' | 'amber' | 'green' | 'done';
export type RiskSeverity = 'high' | 'med';
export interface RiskFlag { id: string; severity: RiskSeverity; label: string }

const STALL_HIGH = 45; // days in an in-progress approval stage → high
const STALL_MED = 30;

/** Approval stages that are "report in progress" (eligible to be flagged as stalled). */
const IN_PROGRESS: ReadonlySet<StageKey> = new Set(['with_isp', 'under_review', 'sadp_queries', 'at_sadp', 'blocked_infra']);

export const RISK_META: Record<Exclude<RiskLevel, 'done'>, { label: string; dot: string; chip: string }> = {
  red: { label: 'High', dot: 'bg-red-500', chip: 'border-red-200 bg-red-50 text-red-700' },
  amber: { label: 'Watch', dot: 'bg-amber-500', chip: 'border-amber-200 bg-amber-50 text-amber-800' },
  green: { label: 'On track', dot: 'bg-brand-logo', chip: 'border-brand/20 bg-brand-light text-brand-dark' },
};

export const FLAG_CHIP: Record<RiskSeverity, string> = {
  high: 'border-red-200 bg-red-50 text-red-700',
  med: 'border-amber-200 bg-amber-50 text-amber-800',
};

export interface Risk {
  level: RiskLevel;
  flags: RiskFlag[];
  highCount: number;
}

export function deriveRisk(it: Item): Risk {
  if (it.lifecycle_stage === 'graduated') return { level: 'done', flags: [], highCount: 0 };

  const flags: RiskFlag[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // SADP queries — the "N" red flag: report returned / queries to resolve.
  if (it.stage === 'sadp_queries' || it.openQueries > 0) {
    const n = it.openQueries;
    flags.push({ id: 'queries', severity: 'high', label: n > 0 ? `${n} SADP quer${n === 1 ? 'y' : 'ies'} open` : 'Returned by SADP — queries' });
  }

  // Stalled: too long in an in-progress approval stage.
  if (IN_PROGRESS.has(it.stage)) {
    const d = daysSince(it.stage_since);
    if (d >= STALL_HIGH) flags.push({ id: 'stalled', severity: 'high', label: `Stalled ${d}d in ${STAGE[it.stage].short}` });
    else if (d >= STALL_MED) flags.push({ id: 'stalled', severity: 'med', label: `${d}d in ${STAGE[it.stage].short}` });
  }

  // Blocked on infrastructure (borehole / shadenet) — waiting, can't progress.
  if (it.stage === 'blocked_infra') {
    flags.push({ id: 'blocked', severity: 'med', label: 'Waiting on borehole / shadenet' });
  }

  // Overdue action items.
  const overdue = it.actions.filter((a) => a.status === 'open' && a.due_date && a.due_date < today).length;
  if (overdue > 0) flags.push({ id: 'overdue', severity: 'med', label: `${overdue} overdue action${overdue === 1 ? '' : 's'}` });

  // Current-milestone finance signals.
  const ms = it.lifecycle_stage === 'm2' ? 'm2' : 'm1';
  const f = stageFinanceOrEmpty(parseStageFinances(it.stage_finances), ms);
  const variance = farmerVariance(f);
  if (variance != null && variance > 0) flags.push({ id: 'farmer', severity: 'med', label: `Farmer short ${formatLslShort(variance)}` });
  if ((f.yet_to_report_lsl ?? 0) > 0) flags.push({ id: 'unreported', severity: 'med', label: `Funds unreported ${formatLslShort(f.yet_to_report_lsl)}` });

  const highCount = flags.filter((fl) => fl.severity === 'high').length;
  const level: RiskLevel = highCount > 0 ? 'red' : flags.length > 0 ? 'amber' : 'green';
  return { level, flags, highCount };
}
