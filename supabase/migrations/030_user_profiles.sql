-- 030_user_profiles.sql
-- Extends Supabase's auth.users with org + role.
-- Super Admin has NULL organization_id; all other roles must have an org.

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid        REFERENCES public.organizations(id),
  role            text        NOT NULL CHECK (role IN ('super_admin','team_leader','me_officer','field_supervisor')),
  full_name       text        NOT NULL,
  phone           text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_profiles_super_admin_no_org CHECK (
    (role = 'super_admin' AND organization_id IS NULL)
    OR (role <> 'super_admin' AND organization_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_org_role
  ON public.user_profiles (organization_id, role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_active
  ON public.user_profiles (organization_id, is_active);

CREATE TRIGGER user_profiles_set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: when an auth.users row is created (via invite or Studio),
-- materialise a user_profiles row using metadata.
-- The invite-user edge function sets these via user_metadata:
--   { organization_id: '...', role: '...', full_name: '...', phone: '...' }
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta ->> 'role';
  v_org  uuid := NULLIF(meta ->> 'organization_id', '')::uuid;
BEGIN
  -- If no metadata provided (e.g., signup flow without invite), skip and
  -- let the admin manually populate user_profiles later.
  IF v_role IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_profiles (id, organization_id, role, full_name, phone)
  VALUES (
    NEW.id,
    v_org,
    v_role,
    COALESCE(meta ->> 'full_name', NEW.email),
    meta ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
