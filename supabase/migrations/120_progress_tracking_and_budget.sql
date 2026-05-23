-- 120_progress_tracking_and_budget.sql
-- Phase 1 amendment (post-v0.4): the May 2026 Central Region progress report
-- showed five real progress dimensions the schema didn't yet track:
--   ESMP, Procurement Plan, Business Plan, Milestone 1 Report, Drilling.
-- We already had esmp_status; the other four needed columns. Also added a
-- standalone budget_lsl field (operational; distinct from the contract-bound
-- total_project_cost_lsl / total_grant_lsl / current_grant_payment_lsl on
-- the Annex V/A cover page).
--
-- The three legacy borehole booleans (borehole_pre_existing/drilled/
-- drilling_incomplete) collapse into a single drilling_status enum which is
-- both more accurate and more queryable.

-- ----------------------------------------------------------------------------
-- New columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.enterprises
  ADD COLUMN IF NOT EXISTS procurement_plan_status text NOT NULL DEFAULT 'not_started'
    CHECK (procurement_plan_status IN ('not_started','in_progress','done')),
  ADD COLUMN IF NOT EXISTS business_plan_status text NOT NULL DEFAULT 'not_started'
    CHECK (business_plan_status IN (
      'not_started','in_progress',
      'done_to_be_validated','done_validated','submitted','validated_submitted'
    )),
  ADD COLUMN IF NOT EXISTS milestone1_report_status text NOT NULL DEFAULT 'not_started'
    CHECK (milestone1_report_status IN (
      'not_started','in_progress','done_not_submitted','done_submitted'
    )),
  ADD COLUMN IF NOT EXISTS drilling_status text NOT NULL DEFAULT 'unknown'
    CHECK (drilling_status IN (
      'unknown','not_needed','pre_existing','in_progress','drilled','not_drilled'
    )),
  ADD COLUMN IF NOT EXISTS budget_lsl numeric(14,2);

-- ----------------------------------------------------------------------------
-- Drop legacy borehole booleans (no real rows depend on them yet)
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_enterprises_borehole_partial;
ALTER TABLE public.enterprises
  DROP COLUMN IF EXISTS borehole_pre_existing,
  DROP COLUMN IF EXISTS borehole_drilled,
  DROP COLUMN IF EXISTS borehole_drilling_incomplete;

-- ----------------------------------------------------------------------------
-- Dashboard-friendly indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_enterprises_m1_status
  ON public.enterprises (organization_id, milestone1_report_status);
CREATE INDEX IF NOT EXISTS idx_enterprises_drilling
  ON public.enterprises (organization_id, drilling_status);
CREATE INDEX IF NOT EXISTS idx_enterprises_biz_plan
  ON public.enterprises (organization_id, business_plan_status);
