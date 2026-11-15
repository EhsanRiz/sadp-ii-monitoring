/**
 * Graduation readiness — how far an enterprise is through the whole journey to
 * graduation, and exactly what's left.
 *
 * Readiness = completed steps / 8, where the 8 steps are the M1 and M2 journey
 * nodes (farmer contribution, budget allocation, fund depletion, report) from
 * deriveJourney — so it stays consistent with the journey strip and the flow.
 * M1's report step is the SADP approval stage; M2's is its report status.
 */
import { deriveJourney } from './journey';
import type { Item } from './data';

export type ReadinessTier = 'graduated' | 'ready' | 'nearly' | 'progressing' | 'early';
export interface MissingStep { stage: 'M1' | 'M2'; label: string }

export interface Readiness {
  pct: number; // 0..100
  done: number;
  total: number; // 8
  missing: MissingStep[]; // outstanding steps, in journey order
  tier: ReadinessTier;
}

export const TIER_META: Record<ReadinessTier, { label: string; chip: string; dot: string; bar: string }> = {
  graduated: { label: 'Graduated', chip: 'border-brand/20 bg-brand-light text-brand-dark', dot: 'bg-brand-logo', bar: 'bg-brand-logo' },
  ready: { label: 'Ready', chip: 'border-fdblue/30 bg-fdblue-light text-sky-800', dot: 'bg-fdblue', bar: 'bg-fdblue' },
  nearly: { label: 'Nearly there', chip: 'border-fdlime/40 bg-fdlime-light text-lime-900', dot: 'bg-fdlime', bar: 'bg-fdlime' },
  progressing: { label: 'In progress', chip: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  early: { label: 'Early', chip: 'border-slate-200 bg-slate-100 text-slate-600', dot: 'bg-slate-400', bar: 'bg-slate-400' },
};

export function deriveReadiness(it: Item): Readiness {
  const total = 8;
  if (it.lifecycle_stage === 'graduated') {
    return { pct: 100, done: total, total, missing: [], tier: 'graduated' };
  }

  const journey = deriveJourney(it.lifecycle_stage, it.stage_finances, it.stage);
  let done = 0;
  const missing: MissingStep[] = [];
  for (const s of journey.stages) {
    const tag = s.stage.toUpperCase() as 'M1' | 'M2';
    for (const n of s.nodes) {
      if (n.status === 'done') done++;
      else missing.push({ stage: tag, label: n.label });
    }
  }

  const pct = Math.round((done / total) * 100);
  let tier: ReadinessTier;
  if (done >= total - 1) tier = 'ready'; // one step from graduating
  else if (pct >= 75) tier = 'nearly';
  else if (pct >= 25) tier = 'progressing';
  else tier = 'early';

  return { pct, done, total, missing, tier };
}
