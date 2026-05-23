-- 090_rls_policies.sql
-- Row-Level Security policies for every Phase 1 table.
-- Matches the role × permission matrix in PHASE_1_DESIGN.md §4.

-- ============================================================================
-- Enable RLS on every table
-- ============================================================================
ALTER TABLE public.organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_councils  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_centers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprises         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log           ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- organizations: all authenticated read; Super Admin write
-- ============================================================================
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY organizations_write ON public.organizations
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============================================================================
-- rounds: all authenticated read; Super Admin write
-- ============================================================================
CREATE POLICY rounds_select ON public.rounds
  FOR SELECT TO authenticated USING (true);
CREATE POLICY rounds_write ON public.rounds
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============================================================================
-- user_profiles: self always; same-org read; Super Admin all
-- ============================================================================
CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT TO authenticated USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR organization_id = public.current_user_org_id()
  );

CREATE POLICY user_profiles_self_update ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    AND organization_id IS NOT DISTINCT FROM (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY user_profiles_super_admin_all ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================================================
-- Geo catalog tables: org-scoped read; Super Admin write; villages allow Field Supervisor INSERT
-- ============================================================================
-- districts
CREATE POLICY districts_select ON public.districts
  FOR SELECT TO authenticated USING (
    public.is_super_admin() OR organization_id = public.current_user_org_id()
  );
CREATE POLICY districts_write ON public.districts
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- community_councils
CREATE POLICY cc_select ON public.community_councils
  FOR SELECT TO authenticated USING (
    public.is_super_admin() OR organization_id = public.current_user_org_id()
  );
CREATE POLICY cc_write ON public.community_councils
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- resource_centers
CREATE POLICY rc_select ON public.resource_centers
  FOR SELECT TO authenticated USING (
    public.is_super_admin() OR organization_id = public.current_user_org_id()
  );
CREATE POLICY rc_write ON public.resource_centers
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- villages: Field Supervisor can INSERT (but not UPDATE/DELETE); Super Admin can do all
CREATE POLICY villages_select ON public.villages
  FOR SELECT TO authenticated USING (
    public.is_super_admin() OR organization_id = public.current_user_org_id()
  );
CREATE POLICY villages_insert_field_supervisor ON public.villages
  FOR INSERT TO authenticated WITH CHECK (
    public.is_super_admin()
    OR (
      organization_id = public.current_user_org_id()
      AND public.current_user_role() IN ('field_supervisor','me_officer')
    )
  );
CREATE POLICY villages_update_delete_super_admin ON public.villages
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============================================================================
-- enterprise_types: read for all; write Super Admin
-- ============================================================================
CREATE POLICY etypes_select ON public.enterprise_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY etypes_write ON public.enterprise_types
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============================================================================
-- enterprises: org-scoped read; M&E + Field Supervisor write; Super Admin DELETE
-- ============================================================================
CREATE POLICY enterprises_select ON public.enterprises
  FOR SELECT TO authenticated USING (
    public.is_super_admin() OR organization_id = public.current_user_org_id()
  );

CREATE POLICY enterprises_insert ON public.enterprises
  FOR INSERT TO authenticated WITH CHECK (
    public.is_super_admin()
    OR (
      organization_id = public.current_user_org_id()
      AND public.current_user_role() IN ('field_supervisor','me_officer')
    )
  );

CREATE POLICY enterprises_update ON public.enterprises
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      organization_id = public.current_user_org_id()
      AND public.current_user_role() IN ('field_supervisor','me_officer')
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR organization_id = public.current_user_org_id()
  );

CREATE POLICY enterprises_delete ON public.enterprises
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- ============================================================================
-- audit_log: read-only for org users; no INSERT/UPDATE/DELETE from clients.
-- The audit_trigger function (SECURITY DEFINER) bypasses RLS, so it can still write.
-- ============================================================================
CREATE POLICY audit_select ON public.audit_log
  FOR SELECT TO authenticated USING (
    public.is_super_admin() OR organization_id = public.current_user_org_id()
  );
-- Intentionally no INSERT / UPDATE / DELETE policies. Even Super Admin
-- cannot tamper with audit rows from the client.
