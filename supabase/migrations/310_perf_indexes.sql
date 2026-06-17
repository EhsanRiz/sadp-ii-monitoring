-- 310_perf_indexes.sql
-- Performance hygiene from the Supabase performance advisor. All additive /
-- behaviour-preserving.
--
-- 1) Covering indexes for foreign keys that lacked one. Cheap insurance as the
--    submission/photo tables grow (and speeds up cascade checks + joins).
-- 2) period_reports RLS init-plan fix: wrap auth.jwt() in a scalar sub-select
--    so it's evaluated once per query instead of once per row. Identical logic.

-- ---------------------------------------------------------------------------
-- 1) Unindexed foreign keys
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_emmp_submissions_approved_by      ON public.emmp_submissions (approved_by);
CREATE INDEX IF NOT EXISTS idx_emmp_submissions_filled_by        ON public.emmp_submissions (filled_by);
CREATE INDEX IF NOT EXISTS idx_essf_submissions_approved_by      ON public.essf_submissions (approved_by);
CREATE INDEX IF NOT EXISTS idx_essf_submissions_filled_by        ON public.essf_submissions (filled_by);
CREATE INDEX IF NOT EXISTS idx_inspection_visits_approved_by     ON public.inspection_visits (approved_by);
CREATE INDEX IF NOT EXISTS idx_inspection_visits_filled_by       ON public.inspection_visits (filled_by);
CREATE INDEX IF NOT EXISTS idx_m1_submissions_approved_by        ON public.m1_submissions (approved_by);
CREATE INDEX IF NOT EXISTS idx_m1_submissions_filled_by          ON public.m1_submissions (filled_by);
CREATE INDEX IF NOT EXISTS idx_m1_docs_enterprise               ON public.m1_supporting_documents (enterprise_id);
CREATE INDEX IF NOT EXISTS idx_m1_docs_uploaded_by              ON public.m1_supporting_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_mvp_enterprise                  ON public.monitoring_visit_photos (enterprise_id);
CREATE INDEX IF NOT EXISTS idx_mvp_organization                ON public.monitoring_visit_photos (organization_id);
CREATE INDEX IF NOT EXISTS idx_mvp_uploaded_by                 ON public.monitoring_visit_photos (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_monitoring_visits_conducted_by  ON public.monitoring_visits (conducted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_period_reports_generated_by     ON public.period_reports (generated_by);

-- ---------------------------------------------------------------------------
-- 2) period_reports RLS — evaluate auth.jwt() once per statement
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS period_reports_select ON public.period_reports;
CREATE POLICY period_reports_select ON public.period_reports
  FOR SELECT TO authenticated
  USING (
    (COALESCE(((select auth.jwt()) ->> 'user_role'), '') = 'super_admin')
    OR (scope_org_id = (NULLIF(((select auth.jwt()) ->> 'organization_id'), ''))::uuid)
  );

DROP POLICY IF EXISTS period_reports_insert ON public.period_reports;
CREATE POLICY period_reports_insert ON public.period_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    (COALESCE(((select auth.jwt()) ->> 'user_role'), '') = 'super_admin')
    OR (scope_org_id = (NULLIF(((select auth.jwt()) ->> 'organization_id'), ''))::uuid)
  );

DROP POLICY IF EXISTS period_reports_delete ON public.period_reports;
CREATE POLICY period_reports_delete ON public.period_reports
  FOR DELETE TO authenticated
  USING (COALESCE(((select auth.jwt()) ->> 'user_role'), '') = 'super_admin');
