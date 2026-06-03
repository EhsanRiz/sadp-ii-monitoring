/**
 * Borehole Supervision schema — 6 fixed milestones for drilling-related
 * activities. Stored as a single jsonb column on `enterprises`.
 *
 * Stored shape:
 *   { drilling_permit:           { done: boolean; date?: 'YYYY-MM-DD' },
 *     borehole_drilling:         { done: boolean; date?: 'YYYY-MM-DD' },
 *     borehole_casing:           { done: boolean; date?: 'YYYY-MM-DD' },
 *     borehole_yield_test:       { done: boolean; date?: 'YYYY-MM-DD' },
 *     borehole_drilling_report:  { done: boolean; date?: 'YYYY-MM-DD' },
 *     water_use_permit:          { done: boolean; date?: 'YYYY-MM-DD' },
 *     notes?: string }
 *
 * Missing keys mean "not yet recorded" — same convention as lifecycle_status.
 */

export type BoreholeMilestoneId =
  | 'drilling_permit'
  | 'borehole_drilling'
  | 'borehole_casing'
  | 'borehole_yield_test'
  | 'borehole_drilling_report'
  | 'water_use_permit';

export interface BoreholeMilestoneEntry {
  done: boolean;
  date?: string; // ISO yyyy-mm-dd
}

export interface BoreholeSupervisionResponses {
  drilling_permit?:           BoreholeMilestoneEntry;
  borehole_drilling?:         BoreholeMilestoneEntry;
  borehole_casing?:           BoreholeMilestoneEntry;
  borehole_yield_test?:       BoreholeMilestoneEntry;
  borehole_drilling_report?:  BoreholeMilestoneEntry;
  water_use_permit?:          BoreholeMilestoneEntry;
  notes?: string;
}

export interface BoreholeMilestone {
  id: BoreholeMilestoneId;
  label: string;
  short: string;
  helper?: string;
}

/** Canonical milestone list in execution order. */
export const BOREHOLE_MILESTONES: BoreholeMilestone[] = [
  {
    id: 'drilling_permit',
    label: 'Drilling permit',
    short: 'Permit',
    helper: 'Permit from the relevant ministry / authority to commence drilling.',
  },
  {
    id: 'borehole_drilling',
    label: 'Borehole drilling',
    short: 'Drilling',
    helper: 'Physical drilling completed by the contractor.',
  },
  {
    id: 'borehole_casing',
    label: 'Borehole casing',
    short: 'Casing',
    helper: 'Casing installed to required depth + grade.',
  },
  {
    id: 'borehole_yield_test',
    label: 'Borehole yield test / water pumping test',
    short: 'Yield test',
    helper: 'Pumping test performed; flow rate recorded.',
  },
  {
    id: 'borehole_drilling_report',
    label: 'Borehole drilling report',
    short: 'Report',
    helper: 'Drilling contractor’s technical report received + filed.',
  },
  {
    id: 'water_use_permit',
    label: 'Water use permit',
    short: 'Water permit',
    helper: 'Permit authorising water abstraction for the enterprise.',
  },
];

/** Count completed milestones — pure helper used by the form + dashboards. */
export function countCompleted(r: BoreholeSupervisionResponses | null | undefined): number {
  if (!r) return 0;
  return BOREHOLE_MILESTONES.filter((m) => r[m.id]?.done === true).length;
}
