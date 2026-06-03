-- 260_period_reports.sql
-- Persisted "period reports" archive + a function that generates a fresh report
-- snapshot as a single jsonb blob. See generate_period_report() in 261.
CREATE TABLE IF NOT EXISTS period_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('monthly','quarterly','custom')),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  period_label    text NOT NULL,
  scope_org_id    uuid REFERENCES organizations(id),
  payload         jsonb NOT NULL,
  title           text,
  notes           text,
  generated_by    uuid REFERENCES auth.users(id),
  generated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS period_reports_period_idx
  ON period_reports (period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS period_reports_org_idx
  ON period_reports (scope_org_id);

ALTER TABLE period_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS period_reports_select ON period_reports;
CREATE POLICY period_reports_select ON period_reports
  FOR SELECT TO authenticated
  USING (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
    OR scope_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );

DROP POLICY IF EXISTS period_reports_insert ON period_reports;
CREATE POLICY period_reports_insert ON period_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
    OR scope_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );

DROP POLICY IF EXISTS period_reports_delete ON period_reports;
CREATE POLICY period_reports_delete ON period_reports
  FOR DELETE TO authenticated
  USING (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
  );

COMMENT ON TABLE period_reports IS
  'Archive of generated monthly/quarterly/custom-range reports.';
