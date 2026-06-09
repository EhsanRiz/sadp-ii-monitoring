/**
 * 11-milestone enterprise lifecycle tracker.
 *
 * Mirrors the columns on RSDA's Master Sheet so 4D + RSDA share one tracking
 * vocabulary. After migration 282 all 11 milestones are MANUAL (stored in
 * `enterprises.lifecycle_status` jsonb). The "Upload" pill on the ESMP and M1
 * rows is a navigation action (deep-link into the relevant module's tab),
 * NOT a value — the user still has to mark Yes/No themselves once they've
 * uploaded / submitted.
 *
 * Storage shape (jsonb): one key per milestone id, value 'yes' | 'no' | 'n_a'.
 * Missing keys mean "not yet tracked" — shown as a blank cell, not a ✗.
 *
 * Read shape (from enterprise_lifecycle view): one row per enterprise with all
 * 11 columns hydrated (`'yes' | 'no' | 'n_a' | null`).
 */

export type LifecycleValue = 'yes' | 'no' | 'n_a';

/** A single milestone's metadata + how the UI sources its value. */
export interface LifecycleMilestone {
  /** stable id — matches the column name in enterprise_lifecycle */
  id: LifecycleMilestoneId;
  /** column header text (exact RSDA wording) */
  label: string;
  /** short label for tight contexts (mobile, dashboard) */
  short: string;
  /** All milestones are manual after migration 282. */
  source: 'manual';
  /**
   * Optional deep-link target. When set, the editor renders an "Upload"
   * pill alongside Yes/No/N/A that navigates to this URL (relative to the
   * current enterprise detail page). Used by ESMP + M1 so the user can jump
   * straight from the Progress tab into the module where they'd actually
   * upload or finish the work.
   */
  upload_link?: { label: string; href: (enterpriseId: string) => string };
}

export type LifecycleMilestoneId =
  | 'contracts_signed'
  | 'contract_available'
  | 'beneficiary_contributed'
  | 'sadp_contributed'
  | 'business_plan'
  | 'esmp'
  | 'verified_borehole_site'
  | 'budget_transfer'
  | 'supervision'
  | 'procurement'
  | 'm1_submitted';

/** Canonical milestone list in RSDA column order. */
export const LIFECYCLE_MILESTONES: LifecycleMilestone[] = [
  { id: 'contracts_signed',        label: 'Contracts signed',                       short: 'Contract',     source: 'manual' },
  { id: 'contract_available',      label: 'Contract available',                     short: 'Contract PDF', source: 'manual' },
  { id: 'beneficiary_contributed', label: 'Beneficiary contributed',                short: 'Benef. $',     source: 'manual' },
  { id: 'sadp_contributed',        label: 'SADP contributed',                       short: 'SADP $',       source: 'manual' },
  { id: 'business_plan',           label: 'Business plan',                          short: 'BP',           source: 'manual' },
  {
    id: 'esmp',
    label: 'ESMP',
    short: 'ESMP',
    source: 'manual',
    upload_link: {
      label: 'Upload',
      href: (id) => `/enterprises/${id}?tab=esmp`,
    },
  },
  { id: 'verified_borehole_site',  label: 'Verified site borehole selection',       short: 'Site verif.',  source: 'manual' },
  { id: 'budget_transfer',         label: 'Budget and transfer (M1 budget)',        short: 'M1 budget',    source: 'manual' },
  { id: 'supervision',             label: 'Supervision (drilling + site clearing)', short: 'Supervision',  source: 'manual' },
  { id: 'procurement',             label: 'Procurement (equipment + materials)',    short: 'Procurement',  source: 'manual' },
  {
    id: 'm1_submitted',
    label: 'Submission of M1 report',
    short: 'M1',
    source: 'manual',
    upload_link: {
      label: 'Upload',
      href: (id) => `/enterprises/${id}?tab=m1`,
    },
  },
];

/** Milestone ids that the user edits (all of them, after migration 282). */
export const MANUAL_MILESTONE_IDS: LifecycleMilestoneId[] = LIFECYCLE_MILESTONES
  .filter((m) => m.source === 'manual')
  .map((m) => m.id);

/** Glyph + tone for rendering a single cell value. */
export function lifecycleGlyph(v: LifecycleValue | null | undefined):
  { glyph: string; tone: 'success' | 'destructive' | 'muted' | 'empty'; label: string } {
  switch (v) {
    case 'yes': return { glyph: '✓', tone: 'success',     label: 'Yes' };
    case 'no':  return { glyph: '✗', tone: 'destructive', label: 'No' };
    case 'n_a': return { glyph: 'N/A', tone: 'muted',     label: 'Not applicable' };
    default:    return { glyph: '–', tone: 'empty',       label: 'Not tracked' };
  }
}

/** Shape returned by the enterprise_lifecycle view. */
export interface EnterpriseLifecycleRow {
  enterprise_id: string;
  organization_id: string;
  district_id: string;
  beneficiary_short_name: string;
  enterprise_type_id: number;
  contracts_signed:         LifecycleValue | null;
  contract_available:       LifecycleValue | null;
  beneficiary_contributed:  LifecycleValue | null;
  sadp_contributed:         LifecycleValue | null;
  business_plan:            LifecycleValue | null;
  esmp:                     LifecycleValue | null;
  verified_borehole_site:   LifecycleValue | null;
  budget_transfer:          LifecycleValue | null;
  supervision:              LifecycleValue | null;
  procurement:              LifecycleValue | null;
  m1_submitted:             LifecycleValue | null;
}

/**
 * Aggregate counts of 'yes' per milestone, grouped by some key (district id,
 * organization id, etc.). Pure function — used by Dashboard to build the
 * "Analysed beneficiary"-style district × milestone table.
 */
export function aggregateLifecycle<K extends string | number>(
  rows: EnterpriseLifecycleRow[],
  groupBy: (r: EnterpriseLifecycleRow) => K,
): Map<K, { total: number; counts: Record<LifecycleMilestoneId, number> }> {
  const out = new Map<K, { total: number; counts: Record<LifecycleMilestoneId, number> }>();
  for (const r of rows) {
    const key = groupBy(r);
    let bucket = out.get(key);
    if (!bucket) {
      bucket = {
        total: 0,
        counts: Object.fromEntries(
          LIFECYCLE_MILESTONES.map((m) => [m.id, 0]),
        ) as Record<LifecycleMilestoneId, number>,
      };
      out.set(key, bucket);
    }
    bucket.total += 1;
    for (const m of LIFECYCLE_MILESTONES) {
      if (r[m.id] === 'yes') bucket.counts[m.id] += 1;
    }
  }
  return out;
}
