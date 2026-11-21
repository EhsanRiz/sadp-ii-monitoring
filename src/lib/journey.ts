/**
 * Derives the per-enterprise "journey" — the M1 → M2 → Graduation strip shown
 * in the enterprise drawer and the Summary flow — from the macro stage
 * (lifecycle_stage), the per-stage money (stage_finances), and, for M1, the
 * approval workflow stage.
 *
 * The M1 *report* step is governed by the approval workflow (this is the "M1
 * Approval Tracker"): the report's real status is `mgp_tracking.stage`
 * (approved / at_sadp / …), not a separate finance field. When the M1 report is
 * submitted-or-beyond, the M1 money steps that have no data entered are shown as
 * complete (you can't get a report to SADP without them).
 *
 * Pure: the component renders whatever this returns.
 */
import { stageOrder, type LifecycleStage } from './lifecycle';
import { type StageKey } from './stages';
import {
  MONEY_STAGES,
  stageFinanceOrEmpty,
  pctDepleted,
  currentDepleted,
  hasAnyFinance,
  formatLslShort,
  parseStageFinances,
  type Json,
  type MoneyStage,
  type StageFinance,
} from './stage-finances';

export type NodeStatus = 'done' | 'active' | 'pending' | 'flag';

export interface JourneyNode {
  key: 'farmer' | 'ba' | 'fd' | 'report';
  label: string;
  status: NodeStatus;
  detail: string;
}

export interface JourneyStage {
  stage: MoneyStage;
  isCurrent: boolean;
  nodes: JourneyNode[];
}

export interface Journey {
  stages: JourneyStage[];
  graduated: boolean;
}

/** Approval stages at which the M1 report has been compiled and sent to 4D/SADP. */
export const M1_REPORT_REACHED: ReadonlySet<StageKey> = new Set(['approved', 'at_sadp', 'under_review', 'sadp_queries']);

/** The M1 report node, read from the approval workflow stage. */
function m1ReportNode(stage: StageKey): { status: NodeStatus; detail: string } {
  switch (stage) {
    case 'approved': return { status: 'done', detail: 'Approved by SADP' };
    case 'at_sadp': return { status: 'active', detail: 'At SADP' };
    case 'under_review': return { status: 'active', detail: 'Under 4D review' };
    case 'sadp_queries': return { status: 'flag', detail: 'SADP queries' };
    case 'with_isp': return { status: 'pending', detail: 'With ISP' };
    case 'blocked_infra': return { status: 'flag', detail: 'Borehole / shadenet' };
    default: return { status: 'pending', detail: 'Pending' };
  }
}

function farmerNode(f: StageFinance): { status: NodeStatus; detail: string } {
  // Contract is enterprise-level now, so this node just shows what the farmer has
  // contributed for this milestone; "done" for the milestone is driven by the
  // report being approved (handled by the past/reached logic in deriveJourney).
  const paid = f.farmer_contributed_lsl;
  if (paid == null) return { status: 'pending', detail: 'Not recorded' };
  const detail = formatLslShort(paid);
  if (f.sadp_approved_date) return { status: 'done', detail };
  if (paid > 0) return { status: 'active', detail };
  return { status: 'pending', detail };
}

function baNode(f: StageFinance): { status: NodeStatus; detail: string } {
  switch (f.ba_status) {
    case 'approved': return { status: 'done', detail: 'Approved' };
    case 'submitted': return { status: 'active', detail: 'Submitted' };
    case 'partially_paid': return { status: 'flag', detail: 'Partially paid' };
    default: return { status: 'pending', detail: 'Pending' };
  }
}

function fdNode(f: StageFinance): { status: NodeStatus; detail: string } {
  const pct = pctDepleted(f);
  const dep = currentDepleted(f);
  if (f.sadp_approved_date) {
    return { status: 'done', detail: pct != null ? `${pct}% depleted` : 'Reported' };
  }
  if (dep == null) return { status: 'pending', detail: '—' };
  return { status: 'active', detail: pct != null ? `${pct}% depleted` : formatLslShort(dep) };
}

function reportNode(f: StageFinance): { status: NodeStatus; detail: string } {
  if (f.sadp_approved_date) return { status: 'done', detail: 'Approved' };
  if (f.pfo_submitted_date) return { status: 'active', detail: 'Submitted' };
  return { status: 'pending', detail: 'Pending' };
}

const DONE_PAST: Record<JourneyNode['key'], string> = {
  farmer: 'Complete',
  ba: 'Approved',
  fd: 'Reported',
  report: 'Approved',
};

const KEYS: JourneyNode['key'][] = ['farmer', 'ba', 'fd', 'report'];

/**
 * Build the journey for one enterprise. `approvalStage` (mgp_tracking.stage)
 * drives the M1 report node when given.
 */
export function deriveJourney(
  currentStage: LifecycleStage,
  stageFinances: Json | null | undefined,
  approvalStage?: StageKey | null,
): Journey {
  const map = parseStageFinances(stageFinances);
  const curOrder = stageOrder(currentStage);

  const stages: JourneyStage[] = MONEY_STAGES.map((stage) => {
    const f = stageFinanceOrEmpty(map, stage);
    const past = stageOrder(stage) < curOrder;
    const future = stageOrder(stage) > curOrder;
    const isCurrent = stage === currentStage;
    const hasData = hasAnyFinance(f);

    // M1's report comes from the approval workflow; when it has reached SADP the
    // (unrecorded) M1 money steps are treated as complete.
    const useApproval = stage === 'm1' && approvalStage != null;
    const reportReached = useApproval && M1_REPORT_REACHED.has(approvalStage!);

    const derived: Record<JourneyNode['key'], { status: NodeStatus; detail: string }> = {
      farmer: farmerNode(f),
      ba: baNode(f),
      fd: fdNode(f),
      report: useApproval ? m1ReportNode(approvalStage!) : reportNode(f),
    };

    const labels: Record<JourneyNode['key'], string> = {
      farmer: 'Farmer contr.',
      ba: 'Budget alloc.',
      fd: 'Fund depletion',
      report: `${stage.toUpperCase()} report`,
    };

    const nodes: JourneyNode[] = KEYS.map((key) => {
      const label = labels[key];
      if (key === 'report' && useApproval) {
        if (past) return { key, label, status: 'done', detail: DONE_PAST.report };
        return { key, label, status: derived.report.status, detail: derived.report.detail };
      }
      if (!hasData && past) return { key, label, status: 'done', detail: DONE_PAST[key] };
      if (!hasData && future) return { key, label, status: 'pending', detail: '—' };
      if (!hasData && isCurrent && reportReached && key !== 'report') return { key, label, status: 'done', detail: DONE_PAST[key] };
      const d = derived[key];
      return { key, label, status: d.status, detail: d.detail };
    });

    return { stage, isCurrent, nodes };
  });

  return { stages, graduated: currentStage === 'graduated' };
}
