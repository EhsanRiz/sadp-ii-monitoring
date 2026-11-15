/**
 * Graduation funnel — how the cohort converts along the M1 → M2 → Graduation
 * journey, and how long that takes.
 *
 * The funnel is cumulative: every tracked enterprise is enrolled (on M1 at
 * least); some reach M2 (lifecycle_stage m2 or graduated); some graduate. The
 * drop-off between steps is the conversion rate — the single number that says
 * how well the programme is moving enterprises toward graduation.
 *
 * Breakdowns (by district / service provider / type) use the same counts, so a
 * low converter stands out against the cohort. No stage-transition timestamps
 * exist for the lifecycle axis, so "time to graduate" uses created_at →
 * updated_at for graduated enterprises, and tenure (days since created_at) is
 * the in-programme proxy for everyone still on the journey.
 */
import { daysSince, type Item } from './data';

export type FunnelStepKey = 'enrolled' | 'm2' | 'graduated';

export interface FunnelStep {
  key: FunnelStepKey;
  label: string;
  /** Count of enterprises that reached this step (cumulative). */
  count: number;
  /** count / enrolled * 100 — width of this step's bar. */
  pctOfTop: number;
  /** % of the previous step that reached this one (null for the top step). */
  conv: number | null;
}

export interface Funnel {
  steps: FunnelStep[];
  enrolled: number;
  reachedM2: number;
  graduated: number;
  /** Avg days since created_at for enterprises still on the journey (not graduated). */
  avgTenureDays: number | null;
  /** Avg created_at → updated_at for graduated enterprises (best available). */
  avgTimeToGraduateDays: number | null;
}

export interface FunnelGroupRow {
  key: string;
  label: string;
  enrolled: number;
  reachedM2: number;
  graduated: number;
  /** reachedM2 / enrolled * 100. */
  pctM2: number;
  /** graduated / enrolled * 100. */
  pctGrad: number;
}

const didReachM2 = (it: Item) => it.lifecycle_stage === 'm2' || it.lifecycle_stage === 'graduated';
const didGraduate = (it: Item) => it.lifecycle_stage === 'graduated';
const pct = (n: number, d: number): number => (d > 0 ? Math.round((n / d) * 100) : 0);

function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000));
}

export function deriveFunnel(items: Item[]): Funnel {
  const enrolled = items.length;
  const reachedM2 = items.filter(didReachM2).length;
  const graduated = items.filter(didGraduate).length;

  const steps: FunnelStep[] = [
    { key: 'enrolled', label: 'Enrolled', count: enrolled, pctOfTop: 100, conv: null },
    { key: 'm2', label: 'Reached M2', count: reachedM2, pctOfTop: pct(reachedM2, enrolled), conv: enrolled ? pct(reachedM2, enrolled) : null },
    { key: 'graduated', label: 'Graduated', count: graduated, pctOfTop: pct(graduated, enrolled), conv: reachedM2 ? pct(graduated, reachedM2) : null },
  ];

  const onJourney = items.filter((it) => !didGraduate(it));
  const avgTenureDays = onJourney.length
    ? Math.round(onJourney.reduce((a, it) => a + daysSince(it.created_at), 0) / onJourney.length)
    : null;

  const grads = items.filter(didGraduate);
  const avgTimeToGraduateDays = grads.length
    ? Math.round(grads.reduce((a, it) => a + daysBetween(it.created_at, it.updated_at), 0) / grads.length)
    : null;

  return { steps, enrolled, reachedM2, graduated, avgTenureDays, avgTimeToGraduateDays };
}

/**
 * Funnel counts grouped by a key (district / service provider / type). Groups
 * with no enterprises are dropped; rows are sorted by graduation then M2
 * conversion, then size, so the strongest (and weakest) converters surface.
 */
export function groupFunnel(items: Item[], keyOf: (it: Item) => string | null): FunnelGroupRow[] {
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    const k = keyOf(it)?.trim();
    if (!k) continue;
    const list = groups.get(k.toLowerCase()) ?? [];
    list.push(it);
    groups.set(k.toLowerCase(), list);
  }

  const rows: FunnelGroupRow[] = [];
  for (const list of groups.values()) {
    // Prefer a label that has capitals (handles case-dup source data).
    const label = list
      .map((it) => keyOf(it)!.trim())
      .reduce((best, cur) => (/[A-Z]/.test(cur) && !/[A-Z]/.test(best) ? cur : best));
    const enrolled = list.length;
    const reachedM2 = list.filter(didReachM2).length;
    const graduated = list.filter(didGraduate).length;
    rows.push({
      key: label.toLowerCase(),
      label,
      enrolled,
      reachedM2,
      graduated,
      pctM2: pct(reachedM2, enrolled),
      pctGrad: pct(graduated, enrolled),
    });
  }

  return rows.sort(
    (a, b) => b.pctGrad - a.pctGrad || b.pctM2 - a.pctM2 || b.enrolled - a.enrolled || a.label.localeCompare(b.label),
  );
}
