-- 300_security_hardening.sql
-- Tighten function execute grants flagged by the Supabase security advisor.
-- These are defense-in-depth: the admin functions already raise
-- "Forbidden — super admin only" for non-admins, but the live ACL had leaked
-- EXECUTE back to `anon` (Postgres' default-to-PUBLIC behaviour). We revoke the
-- grants that shouldn't exist and pin a search_path on the one function missing
-- it. No behaviour change for the app, which calls these as an authenticated
-- (super-admin) user.

-- Admin reads: internally super-admin-guarded; anon never needs them.
REVOKE EXECUTE ON FUNCTION public.user_admin_list()            FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_login_history(uuid)     FROM anon;

-- log_successful_login is an auth.users trigger function — it fires in the
-- trigger context regardless of grants, so no client/REST role should be able
-- to invoke it directly.
REVOKE EXECUTE ON FUNCTION public.log_successful_login() FROM PUBLIC, anon, authenticated;

-- Period report generation is for signed-in staff only; revoke anon and pin
-- the search_path (advisor: function_search_path_mutable).
REVOKE EXECUTE ON FUNCTION public.generate_period_report(date, date, uuid) FROM anon;
ALTER FUNCTION public.generate_period_report(date, date, uuid) SET search_path = public;

-- NOTE: public.log_failed_login(text) is deliberately left anon-callable — the
-- login page records failed sign-in attempts before a session exists. It is
-- SECURITY DEFINER with a pinned search_path and only performs an INSERT.
