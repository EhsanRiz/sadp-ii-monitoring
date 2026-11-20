/**
 * Data-completeness report — which enterprises are missing the data the rest of
 * the tracker depends on (service provider, enterprise type, the current
 * milestone's finances, and the report dates once a report is in). Drives a
 * "what's missing, who's missing it" report so staff fill the gaps — every
 * other card (compliance, SLA, funnel, approval time) only works once these are
 * captured.
 *
 * Pure, from the catalog + stage_finances the tracker already holds. Date fields
 * are only *expected* once a report has been submitted/approved, so an
 * enterprise isn't dinged for data it can't have yet.
 */
import { parseStageFinances, parseContract, stageFinanceOrEmpty, type MoneyStage } from './stage-finances';
import type { Item } from './data';

export type FieldGroup = 'profile' | 'finance' | 'dates';
export interface MissingField {
  id: string;
  label: string;
  group: FieldGroup;
}

/** The checklist, in report order. */
export const COMPLETENESS_FIELDS: MissingField[] = [
  { id: 'service_provider', label: 'Service provider', group: 'profile' },
  { id: 'enterprise_type', label: 'Enterprise type', group: 'profile' },
  { id: 'farmer_contract', label: 'Farmer contract', group: 'finance' },
  { id: 'farmer_contributed', label: 'Farmer contribution', group: 'finance' },
  { id: 'funds_allocated', label: 'Funds allocated', group: 'finance' },
  { id: 'funds_depleted', label: 'Funds depleted', group: 'finance' },
  { id: 'report_status', label: 'Report status', group: 'finance' },
  { id: 'pfo_submitted', label: 'PFO submission date', group: 'dates' },
  { id: 'sadp_approved', label: 'SADP approval date', group: 'dates' },
];

export const GROUP_META: Record<FieldGroup, { label: string; chip: string }> = {
  profile: { label: 'Profile', chip: 'border-slate-200 bg-slate-50 text-slate-600' },
  finance: { label: 'Finances', chip: 'border-amber-200 bg-amber-50 text-amber-800' },
  dates: { label: 'Dates', chip: 'border-fdblue/30 bg-fdblue-light text-sky-800' },
};

export interface Completeness {
  present: number;
  total: number; // expected fields for this enterprise
  pct: number; // 0..100
  missing: MissingField[];
  complete: boolean;
}

const BY_ID = new Map(COMPLETENESS_FIELDS.map((f) => [f.id, f]));
const fld = (id: string): MissingField => BY_ID.get(id)!;

export function deriveCompleteness(it: Item): Completeness {
  const ms: MoneyStage = it.lifecycle_stage === 'm2' || it.lifecycle_stage === 'graduated' ? 'm2' : 'm1';
  const f = stageFinanceOrEmpty(parseStageFinances(it.stage_finances), ms);
  const contract = parseContract(it.stage_finances);
  const reportSubmitted = f.report_status === 'submitted' || f.report_status === 'approved';

  const checks: { id: string; expected: boolean; filled: boolean }[] = [
    { id: 'service_provider', expected: true, filled: !!it.service_provider?.trim() },
    { id: 'enterprise_type', expected: true, filled: !!it.enterprise_type?.trim() },
    { id: 'farmer_contract', expected: true, filled: contract.farmer_lsl != null },
    { id: 'farmer_contributed', expected: true, filled: f.farmer_contributed_lsl != null },
    { id: 'funds_allocated', expected: true, filled: f.funds_allocated_lsl != null },
    { id: 'funds_depleted', expected: true, filled: f.funds_depleted_lsl != null },
    { id: 'report_status', expected: true, filled: f.report_status != null },
    { id: 'pfo_submitted', expected: reportSubmitted, filled: !!f.pfo_submitted_date },
    { id: 'sadp_approved', expected: f.report_status === 'approved', filled: !!f.sadp_approved_date },
  ];

  const expected = checks.filter((c) => c.expected);
  const present = expected.filter((c) => c.filled).length;
  const total = expected.length;
  const missing = expected.filter((c) => !c.filled).map((c) => fld(c.id));
  const pct = total ? Math.round((present / total) * 100) : 100;
  return { present, total, pct, missing, complete: missing.length === 0 };
}
