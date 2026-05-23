-- 100_auth_hook.sql
-- Custom Access Token Hook: injects organization_id and user_role into the JWT
-- so RLS policies (and the client) can read them without joining user_profiles
-- on every query.
--
-- After running this migration, enable the hook in Supabase Studio:
--   Authentication → Hooks → Custom Access Token Hook
--   → Select function: public.custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  claims  jsonb := event -> 'claims';
  profile record;
BEGIN
  SELECT organization_id, role, is_active
    INTO profile
    FROM public.user_profiles
   WHERE id = (event ->> 'user_id')::uuid;

  -- If no profile row yet (e.g., between auth.users insert and the handler trigger
  -- running), return claims unchanged. The next sign-in will pick them up.
  IF NOT FOUND THEN
    RETURN event;
  END IF;

  -- Block sign-in for soft-disabled users by raising an exception.
  IF profile.is_active = false THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'User is disabled';
  END IF;

  claims := jsonb_set(claims, '{organization_id}',
                      COALESCE(to_jsonb(profile.organization_id::text), 'null'::jsonb));
  claims := jsonb_set(claims, '{user_role}', to_jsonb(profile.role));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Supabase requires the hook function to be callable by supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT SELECT ON public.user_profiles TO supabase_auth_admin;
