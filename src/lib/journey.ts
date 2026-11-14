/**
 * Derives the per-enterprise "journey" — the M1 → M2 → Graduation strip shown
 * on the enterprise page — from the macro stage (lifecycle_stage) and the
 * per-stage money (stage_finances).
 *
 * Pure + tested: the component renders whatever this returns. Each step gets a
 * status (done / active / pending / flag) and a short detail string.
 */
import { stageOrder, type LifecycleStage } from '@/lib/stage';
import {
  MONEY_STAGES,
  stageFinanceOrEmpty,
  farmerVariance,
  pctDepleted,
  hasAnyFinance,
  formatLslShort,
  parseStageFinances,
  type MoneyStage,
  type StageFinance,
} from '@/lib/stage-finances';
import type { Json } from '@/types/database';

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

function farmerNode(f: StageFinance): { status: NodeStatus; detail: string } {
  const contract = f.farmer_contract_lsl;
  const paid = f.farmer_contributed_lsl;
  if (contract == null && paid == null) return { status: 'pending', detail: 'Not recorded' };
  const detail = `${formatLslShort(paid ?? 0)} / ${formatLslShort(contract)}`;
  const variance = farmerVariance(f);
  if (variance != null && variance <= 0) return { status: 'done', detail };
  if ((paid ?? 0) > 0) return { status: 'active', detail };
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
  const inMotion =
    (f.funds_allocated_lsl ?? 0) > 0 ||
    (f.funds_depleted_lsl ?? 0) > 0 ||
    (f.yet_to_report_lsl ?? 0) > 0;
  const pct = pctDepleted(f);
  if (f.report_status === 'approved') {
    return { status: 'done', detail: pct != null ? `${pct}% depleted` : 'Reported' };
  }
  if (!inMotion) return { status: 'pending', detail: '—' };
  // Everything allocated has been reported → done.
  if (f.yet_to_report_lsl != null && f.yet_to_report_lsl === 0 && (f.funds_depleted_lsl ?? 0) > 0) {
    return { status: 'done', detail: pct != null ? `${pct}% depleted` : 'Reported' };
  }
  if (f.yet_to_report_lsl != null && f.yet_to_report_lsl > 0) {
    return { status: 'active', detail: `${formatLslShort(f.yet_to_report_lsl)} to report` };
  }
  return { status: 'active', detail: pct != null ? `${pct}% depleted` : 'In progress' };
}

function reportNode(f: StageFinance): { status: NodeStatus; detail: string } {
  switch (f.report_status) {
    case 'approved': return { status: 'done', detail: 'Approved' };
    case 'submitted': return { status: 'active', detail: 'Submitted' };
    default: return { status: 'pending', detail: 'Pending' };
  }
}

const DONE_PAST: Record<JourneyNode['key'], string> = {
  farmer: 'Complete',
  ba: 'Approved',
  fd: 'Reported',
  report: 'Approved',
};

/**
 * Build the journey for one enterprise.
 *
 * A stage strictly *before* the current stage with no money entered is shown as
 * complete (the enterprise demonstrably advanced past it); a stage *after* the
 * current one with no data is shown as not-started. The current stage, and any
 * stage with data entered, is driven by that data.
 */
export function deriveJourney(
  currentStage: LifecycleStage,
  stageFinances: Json | null | undefined,
): Journey {
  const map = parseStageFinances(stageFinances);
  const curOrder = stageOrder(currentStage);

  const stages: JourneyStage[] = MONEY_STAGES.map((stage) => {
    const f = stageFinanceOrEmpty(map, stage);
    const past = stageOrder(stage) < curOrder;
    const future = stageOrder(stage) > curOrder;
    const hasData = hasAnyFinance(f);

    const derived: Record<JourneyNode['key'], { status: NodeStatus; detail: string }> = {
      farmer: farmerNode(f),
      ba: baNode(f),
      fd: fdNode(f),
      report: reportNode(f),
    };

    const labels: Record<JourneyNode['key'], string> = {
      farmer: 'Farmer contr.',
      ba: 'Budget alloc.',
      fd: 'Fund depletion',
      report: `${stage.toUpperCase()} report`,
    };

    const nodes: JourneyNode[] = (['farmer', 'ba', 'fd', 'report'] as JourneyNode['key'][]).map(
      (key) => {
        if (!hasData && past) return { key, label: labels[key], status: 'done', detail: DONE_PAST[key] };
        if (!hasData && future) return { key, label: labels[key], status: 'pending', detail: '—' };
        const d = derived[key];
        return { key, label: labels[key], status: d.status, detail: d.detail };
      },
    );

    return { stage, isCurrent: stage === currentStage, nodes };
  });

  return { stages, graduated: currentStage === 'graduated' };
}
