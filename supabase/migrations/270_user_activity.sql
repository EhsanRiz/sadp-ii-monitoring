-- 270_user_activity.sql
-- Lightweight user-activity tracking for the Users admin page.
-- See src/pages/admin/UsersAdminPage.tsx + ActivitySheet for the consumers.
CREATE TABLE IF NOT EXISTS login_events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('login','failed')),
  ip           text,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_events_user_idx     ON login_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS login_events_kind_idx     ON login_events (kind, occurred_at DESC);
CREATE INDEX IF NOT EXISTS login_events_occurred_idx ON login_events (occurred_at DESC);

ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS login_events_no_direct ON login_events;
CREATE POLICY login_events_no_direct ON login_events FOR SELECT TO authenticated USING (false);

-- Trigger: capture every successful sign-in into login_events.
CREATE OR REPLACE FUNCTION public.log_successful_login()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at
     AND NEW.last_sign_in_at IS NOT NULL THEN
    INSERT INTO public.login_events (user_id, email, kind, occurred_at)
    VALUES (NEW.id, NEW.email, 'login', NEW.last_sign_in_at);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_user_login_trigger ON auth.users;
CREATE TRIGGER auth_user_login_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_successful_login();

-- Public RPC: log a failed sign-in attempt by email (anon-callable).
CREATE OR REPLACE FUNCTION public.log_failed_login(p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN RETURN; END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(trim(p_email));
  INSERT INTO public.login_events (user_id, email, kind)
  VALUES (v_uid, lower(trim(p_email)), 'failed');
END;
$$;
REVOKE ALL ON FUNCTION public.log_failed_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_failed_login(text) TO anon, authenticated;

-- Super-admin only read: user list with activity summary.
CREATE OR REPLACE FUNCTION public.user_admin_list()
RETURNS TABLE (
  id uuid, email text, full_name text, phone text, role text,
  organization_id uuid, organization_name text, is_active boolean,
  created_at timestamptz, last_sign_in_at timestamptz,
  sign_in_count_total bigint, sign_in_count_30d bigint, failed_30d bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'super_admin' THEN
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
REVOKE ALL ON FUNCTION public.user_admin_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_admin_list() TO authenticated;

-- Super-admin only read: per-user login history.
CREATE OR REPLACE FUNCTION public.user_login_history(p_user_id uuid)
RETURNS TABLE (kind text, email text, ip text, occurred_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'super_admin' THEN
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
REVOKE ALL ON FUNCTION public.user_login_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_login_history(uuid) TO authenticated;

-- Backfill: seed a 'login' row for every user with an existing last_sign_in_at.
INSERT INTO login_events (user_id, email, kind, occurred_at)
SELECT id, email, 'login', last_sign_in_at FROM auth.users
WHERE last_sign_in_at IS NOT NULL
ON CONFLICT DO NOTHING;
