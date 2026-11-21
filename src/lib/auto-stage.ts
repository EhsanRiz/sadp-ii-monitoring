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
  sadp_received_date: string | null;
  sadp_sent_back_date: string | null;
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

  // A SADP query has come back and hasn't been sent back yet → resolving queries.
  const openReceived = queries.some((a) => a.status === 'open' && !!a.sadp_received_date && !a.sadp_sent_back_date);
  if (openReceived) return 'sadp_queries';

  // A query response is back with SADP, or the report was submitted → At SADP.
  const resent = queries.some((a) => a.status === 'open' && !!a.sadp_sent_back_date);
  if (resent || f.pfo_submitted_date) return 'at_sadp';

  return null;
}
