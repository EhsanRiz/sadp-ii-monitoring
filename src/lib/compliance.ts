/**
 * Financial-compliance signals — the two money risks that can undo a
 * "successful" graduation, aggregated across the cohort:
 *
 *   1. Farmer counterpart shortfall — contracted contribution not yet paid in
 *      (Σ max(0, contract − contributed) over M1 + M2). An enterprise that
 *      hasn't met its counterpart can't legitimately graduate.
 *   2. Funds spent but unreported — money depleted that hasn't been accounted
 *      for to SADP (Σ yet_to_report_lsl). Unreported spend is an audit risk
 *      that can reverse a graduation after the fact.
 *
 * Pure, from stage_finances the tracker already holds. The "Contributions &
 * funds" rollup shows the totals; this reframes them as a compliance gap and
 * feeds a chase queue of the enterprises carrying exposure.
 */
import { parseFinances, contractFarmer, totalFarmerContributed } from './stage-finances';
import type { Item } from './data';

export interface EntCompliance {
  contract: number;
  contributed: number;
  /** Σ max(0, contract − contributed) over the milestones. */
  farmerShortfall: number;
  /** Σ yet_to_report_lsl over the milestones. */
  unreported: number;
  /** farmerShortfall + unreported — total money exposure for this enterprise. */
  exposure: number;
  hasShortfall: boolean;
  hasUnreported: boolean;
  /** Any exposure at all. */
  flagged: boolean;
}

export function deriveCompliance(it: Item): EntCompliance {
  const { contract: c, stages: map } = parseFinances(it.stage_finances);
  // Contract is the fixed farmer figure; contributions are summed across the
  // milestones. Shortfall = contract − contributed (floored at 0).
  const contract = contractFarmer(c);
  const contributed = totalFarmerContributed(map);
  const farmerShortfall = Math.max(0, contract - contributed);
  const unreported = 0; // "funds spent but unreported" was retired with the depletion-history redesign
  const exposure = farmerShortfall + unreported;
  return {
    contract,
    contributed,
    farmerShortfall,
    unreported,
    exposure,
    hasShortfall: farmerShortfall > 0,
    hasUnreported: unreported > 0,
    flagged: exposure > 0,
  };
}

export interface ComplianceTotals {
  contract: number;
  contributed: number;
  farmerShortfall: number;
  shortfallCount: number;
  unreported: number;
  unreportedCount: number;
  flaggedCount: number;
  /** contributed / contract * 100, or null when no contract captured. */
  contributedPct: number | null;
  exposure: number;
}

export function aggregateCompliance(rows: EntCompliance[]): ComplianceTotals {
  const t: ComplianceTotals = {
    contract: 0,
    contributed: 0,
    farmerShortfall: 0,
    shortfallCount: 0,
    unreported: 0,
    unreportedCount: 0,
    flaggedCount: 0,
    contributedPct: null,
    exposure: 0,
  };
  for (const r of rows) {
    t.contract += r.contract;
    t.contributed += r.contributed;
    t.farmerShortfall += r.farmerShortfall;
    t.unreported += r.unreported;
    if (r.hasShortfall) t.shortfallCount++;
    if (r.hasUnreported) t.unreportedCount++;
    if (r.flagged) t.flaggedCount++;
  }
  t.exposure = t.farmerShortfall + t.unreported;
  t.contributedPct = t.contract > 0 ? Math.min(100, Math.round((t.contributed / t.contract) * 100)) : null;
  return t;
}
