-- 140_advisor_fixes.sql
-- Fixes from Supabase's security + performance advisors after Phase 1 schema
-- stabilised. See get_advisors(type=security) / (type=performance).
--
-- Two classes of fix:
--   1. SECURITY — pin search_path on trigger fns, revoke RPC access on
--      trigger-only SECURITY DEFINER fns, revoke RLS helpers from anon.
--   2. PERFORMANCE — split FOR ALL policies that were inflating SELECT
--      cost; wrap auth.uid() in (SELECT auth.uid()) inside RLS so it
--      evaluates once per query; add single-column FK indexes on enterprises.

-- ---------------------------------------------------------------------------
-- SECURITY
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.set_updated_at()             SET search_path = '';
ALTER FUNCTION public.set_org_from_district()      SET search_path = '';
ALTER FUNCTION public.enterprises_geo_consistency() SET search_path = '';

-- Trigger-only SD functions — never call via REST
REVOKE EXECUTE ON FUNCTION public.audit_trigger()        FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon, authenticated, PUBLIC;

-- RLS helpers — revoke from anon (keep authenticated for RLS policy use)
REVOKE EXECUTE ON FUNCTION public.current_user_org_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role()   FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()      FROM anon, PUBLIC;

-- ---------------------------------------------------------------------------
-- PERFORMANCE: split FOR ALL → discrete commands
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS organizations_write ON public.organizations;
CREATE POLICY organizations_insert ON public.organizations FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY organizations_update ON public.organizations FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY organizations_delete ON public.organizations FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS rounds_write ON public.rounds;
CREATE POLICY rounds_insert ON public.rounds FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY rounds_update ON public.rounds FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY rounds_delete ON public.rounds FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS districts_write ON public.districts;
CREATE POLICY districts_insert ON public.districts FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY districts_update ON public.districts FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY districts_delete ON public.districts FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS cc_write ON public.community_councils;
CREATE POLICY cc_insert ON public.community_councils FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY cc_update ON public.community_councils FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY cc_delete ON public.community_councils FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS rc_write ON public.resource_centers;
CREATE POLICY rc_insert ON public.resource_centers FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY rc_update ON public.resource_centers FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY rc_delete ON public.resource_centers FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS etypes_write ON public.enterprise_types;
CREATE POLICY etypes_insert ON public.enterprise_types FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY etypes_update ON public.enterprise_types FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY etypes_delete ON public.enterprise_types FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS villages_update_delete_super_admin ON public.villages;
CREATE POLICY villages_update_super_admin ON public.villages FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY villages_delete_super_admin ON public.villages FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS user_profiles_super_admin_all ON public.user_profiles;
CREATE POLICY user_profiles_super_admin_insert ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY user_profiles_super_admin_update ON public.user_profiles FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY user_profiles_super_admin_delete ON public.user_profiles FOR DELETE TO authenticated USING (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- PERFORMANCE: (SELECT auth.uid()) so it evaluates once per query
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR id = (SELECT auth.uid())
    OR organization_id = public.current_user_org_id()
  );

DROP POLICY IF EXISTS user_profiles_self_update ON public.user_profiles;
CREATE POLICY user_profiles_self_update ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = (SELECT role FROM public.user_profiles WHERE id = (SELECT auth.uid()))
    AND organization_id IS NOT DISTINCT FROM (SELECT organization_id FROM public.user_profiles WHERE id = (SELECT auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- PERFORMANCE: single-column FK indexes on enterprises (advisor flagged)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_enterprises_cc          ON public.enterprises (community_council_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_district    ON public.enterprises (district_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_rc          ON public.enterprises (resource_center_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_village     ON public.enterprises (village_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_type        ON public.enterprises (enterprise_type_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_round       ON public.enterprises (round_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_created_by  ON public.enterprises (created_by);
