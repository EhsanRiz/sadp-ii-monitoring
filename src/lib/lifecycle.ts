/**
 * Enterprise macro-stage on the M1 → M2 → Graduation journey (migration 410).
 *
 * This is a DIFFERENT axis from the approval workflow in `stages.ts`
 * (approved / at_sadp / …): that tracks where an M1 report sits in the approval
 * pipeline; this tracks which *milestone* the enterprise is on. Stored as
 * `mgp_tracking.lifecycle_stage` ('m1' | 'm2' | 'graduated').
 */
export type LifecycleStage = 'm1' | 'm2' | 'graduated';

/** Stages in journey order (left to right). */
export const LIFECYCLE_STAGES: LifecycleStage[] = ['m1', 'm2', 'graduated'];

export interface LifecycleMeta {
  id: LifecycleStage;
  /** Short label for chips/badges, e.g. "M1". */
  label: string;
  /** Full label for menus/descriptions, e.g. "Milestone 1". */
  full: string;
  /** One-line explanation of the stage. */
  description: string;
  /** Tailwind chip classes (bg/text/border) matching StageChip's language. */
  chip: string;
  /** Tailwind dot colour. */
  dot: string;
}

export const LIFECYCLE_META: Record<LifecycleStage, LifecycleMeta> = {
  m1: {
    id: 'm1',
    label: 'M1',
    full: 'Milestone 1',
    description: 'Farmer & SADP contribution, budget allocation, fund depletion, then M1 report approval.',
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  m2: {
    id: 'm2',
    label: 'M2',
    full: 'Milestone 2',
    description: 'The same steps as M1 for the second milestone, ending in M2 report approval.',
    chip: 'bg-fdblue-light text-sky-800 border-fdblue/30',
    dot: 'bg-fdblue',
  },
  graduated: {
    id: 'graduated',
    label: 'Graduated',
    full: 'Graduated',
    description: 'M2 complete and approved — the enterprise has completed the programme journey.',
    chip: 'bg-brand-light text-brand-dark border-brand/30',
    dot: 'bg-brand-logo',
  },
};

/** Short display label for a stage value, or an em-dash when unset. */
export function lifecycleLabel(s: LifecycleStage | null | undefined): string {
  return s ? LIFECYCLE_META[s].label : '—';
}

/** Position of a stage in the journey (0 = M1). Useful for sorting/progress. */
export function stageOrder(s: LifecycleStage): number {
  return LIFECYCLE_STAGES.indexOf(s);
}

/** Normalise a possibly-missing stage to a safe default (guards old cached rows). */
export function stageOrDefault(s: LifecycleStage | null | undefined): LifecycleStage {
  return s && LIFECYCLE_STAGES.includes(s) ? s : 'm1';
}
