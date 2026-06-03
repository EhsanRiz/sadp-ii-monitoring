-- 271_fix_jwt_role_path.sql
-- HOTFIX: 260 and 270 used the wrong JWT path for the role check.
--
-- The custom_access_token_hook puts the role at the TOP level of the JWT
-- claims as `user_role` (not nested under `app_metadata.role`).  So:
--
--   coalesce(auth.jwt() ->> 'user_role', '') = 'super_admin'    -- CORRECT
--   coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = ... -- WRONG (empty)
--
-- Result of the bug: every role check returned false, locking even super
-- admins out of:
--   * public.user_admin_list()
--   * public.user_login_history(uuid)
--   * SELECT/INSERT/DELETE on public.period_reports
--
-- This migration replaces all three functions/policies with the correct path.

CREATE OR REPLACE FUNCTION public.user_admin_list()
RETURNS TABLE (
  id uuid, email text, full_name text, phone text, role text,
  organization_id uuid, organization_name text, is_active boolean,
  created_at timestamptz, last_sign_in_at timestamptz,
  sign_in_count_total bigint, sign_in_count_30d bigint, failed_30d bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'user_role', '') <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden — super admin only';
  END IF;
  RETURN QUERY
  SELECT
    p.id, u.email::text, p.full_name, p.phone, p.role,
    p.organization_id, o.name AS organization_name, p.is_active,
    p.created_at, u.last_sign_in_at,
    (SELECT count(*) FROM login_events e WHERE e.user_id = p.id AND e.kind = 'login') AS sign_in_count_total,
    (SELECT count(*) FROM login_events e WHERE e.user_id = p.id AND e.kind = 'login' AND e.occurred_at > now() - interval '30 days') AS sign_in_count_30d,
    (SELECT count(*) FROM login_events e WHERE e.user_id = p.id AND e.kind = 'failed' AND e.occurred_at > now() - interval '30 days') AS failed_30d
  FROM user_profiles p
  LEFT JOIN auth.users u  ON u.id = p.id
  LEFT JOIN organizations o ON o.id = p.organization_id
  ORDER BY u.last_sign_in_at DESC NULLS LAST, p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_login_history(p_user_id uuid)
RETURNS TABLE (kind text, email text, ip text, occurred_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'user_role', '') <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden — super admin only';
  END IF;
  RETURN QUERY
  SELECT e.kind, e.email, e.ip, e.occurred_at
  FROM login_events e
  WHERE e.user_id = p_user_id OR lower(e.email) = lower((
    SELECT u.email FROM auth.users u WHERE u.id = p_user_id
  ))
  ORDER BY e.occurred_at DESC
  LIMIT 50;
END;
$$;

DROP POLICY IF EXISTS period_reports_select ON period_reports;
CREATE POLICY period_reports_select ON period_reports
  FOR SELECT TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'user_role', '') = 'super_admin'
    OR scope_org_id = nullif(auth.jwt() ->> 'organization_id', '')::uuid
  );

DROP POLICY IF EXISTS period_reports_insert ON period_reports;
CREATE POLICY period_reports_insert ON period_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    coalesce(auth.jwt() ->> 'user_role', '') = 'super_admin'
    OR scope_org_id = nullif(auth.jwt() ->> 'organization_id', '')::uuid
  );

DROP POLICY IF EXISTS period_reports_delete ON period_reports;
CREATE POLICY period_reports_delete ON period_reports
  FOR DELETE TO authenticated
  USING (
    coalesce(auth.jwt() ->> 'user_role', '') = 'super_admin'
  );
