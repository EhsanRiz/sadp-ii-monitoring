-- 110_super_admin_optional_org.sql
-- Phase 1 amendment (post-v0.4): Super Admins may optionally have a "home"
-- organization_id. This is a UI convenience — RLS still grants Super Admin
-- cross-org access via the is_super_admin() check, which OR's with org scope
-- in every policy. The home org just lets the frontend pre-select sensibly
-- on registration forms.
--
-- Background: original 030_user_profiles.sql enforced mutual exclusivity
-- (`super_admin AND organization_id IS NULL`). Real-world usage showed
-- Super Admins are typically employees of one of the partner orgs and
-- want their forms to default to it.

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_super_admin_no_org;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_org_required_for_non_super_admin CHECK (
    role = 'super_admin' OR organization_id IS NOT NULL
  );
