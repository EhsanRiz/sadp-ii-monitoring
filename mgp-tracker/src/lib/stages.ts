export type StageKey =
  | 'approved'
  | 'at_sadp'
  | 'sadp_queries'
  | 'under_review'
  | 'with_isp'
  | 'blocked_infra'
  | 'withdrawn';

export interface StageDef {
  key: StageKey;
  code: string; // whiteboard numbering
  label: string;
  short: string;
  hint: string;
  color: string; // tailwind classes for chips
  dot: string;
}

const ALL_STAGES: StageDef[] = [
  { key: 'approved', code: '1', label: 'Approved', short: 'Approved', hint: 'Approved by SADP — done', color: 'bg-brand-light text-brand-dark border-brand/30', dot: 'bg-brand-logo' },
  { key: 'at_sadp', code: '2', label: 'At SADP – Pending Approval', short: 'At SADP', hint: 'Submitted to SADP, awaiting approval', color: 'bg-fdblue-light text-sky-800 border-fdblue/30', dot: 'bg-fdblue' },
  { key: 'sadp_queries', code: '3(a)(i)', label: 'Resolving SADP Queries', short: 'SADP Queries', hint: 'Returned by SADP with queries — 4D resolving', color: 'bg-amber-100 text-amber-900 border-amber-200', dot: 'bg-amber-500' },
  { key: 'under_review', code: '3(a)(ii)', label: 'Under 4D Review', short: '4D Review', hint: 'Submitted by ISP/farmer — 4D checking before SADP', color: 'bg-fdlime-light text-lime-900 border-fdlime/40', dot: 'bg-fdlime' },
  { key: 'with_isp', code: '3(b)', label: 'With ISPs', short: 'With ISPs', hint: 'Report still with the ISP', color: 'bg-[#F3EEEC] text-fdbrown border-fdbrown-light/40', dot: 'bg-fdbrown-light' },
  { key: 'blocked_infra', code: '3(c)', label: 'Borehole / Shadenet', short: 'Borehole/Shadenet', hint: 'Waiting on borehole or shadenet', color: 'bg-violet-100 text-violet-800 border-violet-200', dot: 'bg-violet-500' },
  { key: 'withdrawn', code: '3(d)', label: 'Withdrawal', short: 'Withdrawn', hint: 'Enterprise withdrawing', color: 'bg-slate-200 text-slate-700 border-slate-300', dot: 'bg-slate-500' },
];

// 'withdrawn' is retired (withdrawn enterprises are removed from the tracker) but kept for old history rows.
export const STAGES: StageDef[] = ALL_STAGES.filter((s) => s.key !== 'withdrawn');
export const STAGE: Record<StageKey, StageDef> = Object.fromEntries(ALL_STAGES.map((s) => [s.key, s])) as Record<StageKey, StageDef>;

export const DISTRICTS = ['Maseru', 'Berea', 'Thaba-Tseka'] as const;
export type District = (typeof DISTRICTS)[number];
export const DISTRICT_SHORT: Record<string, string> = { Maseru: 'MSU', Berea: 'Berea', 'Thaba-Tseka': 'T/T' };
