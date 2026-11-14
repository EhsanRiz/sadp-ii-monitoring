-- =============================================================================
-- 410 — MGP tracker: enterprise lifecycle stage + per-stage finances
--
-- Adds the M1 -> M2 -> Graduation lifecycle to the tracker. This is a DIFFERENT
-- axis from mgp_tracking.stage (the M1 *approval workflow*: approved / at_sadp /
-- …): lifecycle_stage is the coarse "which milestone is this enterprise on",
-- and stage_finances holds the per-milestone money (farmer & SADP contribution,
-- budget allocation, fund depletion, report) the staff asked to capture.
--
-- Kept on mgp_tracking (not public.enterprises) so it stays inside the tracker's
-- own mgp_* tables, governed by the tracker's RLS, and works for custom rows
-- (enterprise_id IS NULL). Backfilled once from public.enterprises so the
-- Round 3 import done in the monitoring app carries over.
-- =============================================================================

ALTER TABLE public.mgp_tracking
  ADD COLUMN IF NOT EXISTS lifecycle_stage text NOT NULL DEFAULT 'm1'
    CHECK (lifecycle_stage IN ('m1','m2','graduated')),
  ADD COLUMN IF NOT EXISTS stage_finances jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS mgp_tracking_lifecycle_idx
  ON public.mgp_tracking(lifecycle_stage);

-- One-time backfill from the monitoring catalog (Round 3 import lives there).
-- Guarded to the freshly-added defaults so re-running never clobbers tracker edits.
UPDATE public.mgp_tracking t
   SET lifecycle_stage = coalesce(e.lifecycle_stage, 'm1'),
       stage_finances  = coalesce(e.stage_finances, '{}'::jsonb)
  FROM public.enterprises e
 WHERE t.enterprise_id = e.id
   AND t.lifecycle_stage = 'm1'
   AND t.stage_finances = '{}'::jsonb
   AND (e.lifecycle_stage IS DISTINCT FROM 'm1'
        OR (e.stage_finances IS NOT NULL AND e.stage_finances <> '{}'::jsonb));

-- mgp_tracking is already in the supabase_realtime publication (migration 400),
-- so the new columns stream to every open tracker screen automatically.
-- Table-level grants on mgp_tracking cover the new columns; RLS (mgp_can_edit)
-- already governs who may write them.
