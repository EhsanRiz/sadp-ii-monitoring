/**
 * Auto-move: derive the board stage from what staff have entered, so the
 * enterprise moves between sections on its own (no manual dragging) — the
 * confirmed rules:
 *
 *   report submitted to PFO (date set)        → At SADP
 *   a SADP query received, not yet resent      → SADP queries
 *   query response sent back to SADP           → At SADP
 *   SADP approval date set / report approved   → Approved
 *
 * With-ISP / 4D review / Borehole-shadenet aren't derivable from these inputs,
 * so when none of the rules fire this returns null → leave the stage as-is.
 *
 * Precedence: Approved > SADP queries > At SADP.
 */
import { parseStageFinances, stageFinanceOrEmpty } from './stage-finances';
import type { StageKey } from './stages';
import type { LifecycleStage } from './lifecycle';
import type { Json } from './stage-finances';

export interface AutoStageActionLite {
  kind: string;
  status: string;
  milestone: string | null;
}

export function deriveAutoStage(
  stageFinances: Json | null | undefined,
  lifecycleStage: LifecycleStage,
  actions: AutoStageActionLite[],
): StageKey | null {
  const map = parseStageFinances(stageFinances);
  const cur = lifecycleStage === 'm2' ? 'm2' : 'm1';
  const f = stageFinanceOrEmpty(map, cur);

  // Approved by SADP.
  if (f.sadp_approved_date) return 'approved';

  // Only the current milestone's queries drive the stage.
  const queries = actions.filter((a) => a.kind === 'sadp_query' && (a.milestone ?? 'm1') === cur);
  const openQueries = queries.filter((a) => a.status === 'open');

  // Unaddressed queries, or addressed but the report pack hasn't been resent yet.
  if (openQueries.length > 0) return 'sadp_queries';
  if (queries.length > 0 && !f.report_resubmitted_date) return 'sadp_queries';

  // Report pack resent after queries, or the report was submitted → At SADP.
  if (f.report_resubmitted_date || f.pfo_submitted_date) return 'at_sadp';

  return null;
}
