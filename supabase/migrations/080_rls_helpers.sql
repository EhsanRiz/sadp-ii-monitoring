-- 080_rls_helpers.sql
-- Tiny helper functions used in every RLS policy. They read org + role from the
-- JWT custom claims set by 100_auth_hook.sql.

CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULLIF(auth.jwt() ->> 'organization_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.jwt() ->> 'user_role';
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_user_role() = 'super_admin';
$$;

-- Grant execute so RLS policies running under `authenticated` can call them
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin()     TO authenticated;
