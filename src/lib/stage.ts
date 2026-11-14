/**
 * Enterprise macro-stage on the M1 -> M2 -> Graduated journey (migration 320).
 *
 * This is the coarse "where is this enterprise" pointer that answers the
 * question staff actually asked — *which farmers are in which stage* — and
 * powers the enterprise-list stage filter and the per-enterprise journey view.
 *
 * It sits ABOVE the 11-milestone `lifecycle_status` tracker (see lib/lifecycle):
 * the milestones detail the M1 preparation steps; the stage is the high-level
 * phase. Stored as `enterprises.lifecycle_stage` ('m1' | 'm2' | 'graduated').
 */
import type { LifecycleStage } from '@/types/database';

export type { LifecycleStage };

/** Stages in journey order (left to right). */
export const LIFECYCLE_STAGES: LifecycleStage[] = ['m1', 'm2', 'graduated'];

/** Visual tone for a stage badge — maps to design tokens in the UI. */
export type StageTone = 'neutral' | 'primary' | 'success';

export interface StageMeta {
  id: LifecycleStage;
  /** Short label for chips/badges, e.g. "M1". */
  label: string;
  /** Full label for menus/descriptions, e.g. "Milestone 1". */
  full: string;
  /** One-line explanation of the stage. */
  description: string;
  tone: StageTone;
}

export const STAGE_META: Record<LifecycleStage, StageMeta> = {
  m1: {
    id: 'm1',
    label: 'M1',
    full: 'Milestone 1',
    description:
      'Farmer & SADP contribution, budget allocation, fund depletion, then M1 report approval.',
    tone: 'neutral',
  },
  m2: {
    id: 'm2',
    label: 'M2',
    full: 'Milestone 2',
    description:
      'The same steps as M1 for the second milestone, ending in M2 report approval.',
    tone: 'primary',
  },
  graduated: {
    id: 'graduated',
    label: 'Graduated',
    full: 'Graduated',
    description:
      'M2 complete and approved — the enterprise has completed the programme journey.',
    tone: 'success',
  },
};

/** Short display label for a stage value, or an em-dash when unset. */
export function stageLabel(s: LifecycleStage | null | undefined): string {
  return s ? STAGE_META[s].label : '—';
}

/** Position of a stage in the journey (0 = M1). Useful for sorting/progress. */
export function stageOrder(s: LifecycleStage): number {
  return LIFECYCLE_STAGES.indexOf(s);
}

/**
 * Normalise a possibly-missing stage to a safe default. Guards against
 * React Query cache entries persisted before migration 320 added the column
 * (they lack `lifecycle_stage`).
 */
export function stageOrDefault(s: LifecycleStage | null | undefined): LifecycleStage {
  return s && LIFECYCLE_STAGES.includes(s) ? s : 'm1';
}
