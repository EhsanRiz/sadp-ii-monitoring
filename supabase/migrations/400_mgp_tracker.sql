-- =============================================================================
-- 400 — MGP M1 Approval Tracker (separate tool at tracker.4dcs.co.za)
--
-- Standalone tables prefixed mgp_. Tracker users are NOT monitoring-app users:
-- they have no user_profiles row, so the monitoring app grants them nothing.
-- Tracker access is governed only by public.mgp_users.
-- =============================================================================

-- ---------- Users ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mgp_users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name       text NOT NULL,
  phone           text NOT NULL UNIQUE CHECK (phone ~ '^266[0-9]{8}$'),
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('super_admin','admin','member','viewer')),
  pin_hash        text,
  pin_expires_at  timestamptz,
  pin_attempts    smallint NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  activated_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mgp_users ENABLE ROW LEVEL SECURITY;

-- ---------- Helpers (SECURITY DEFINER, fixed search_path) --------------------
CREATE OR REPLACE FUNCTION public.mgp_current_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT u.role FROM public.mgp_users u
   WHERE u.auth_user_id = (SELECT auth.uid()) AND u.is_active
$$;

CREATE OR REPLACE FUNCTION public.mgp_is_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.mgp_current_role() IS NOT NULL $$;

CREATE OR REPLACE FUNCTION public.mgp_can_edit()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT coalesce(public.mgp_current_role() IN ('super_admin','admin','member'), false) $$;

CREATE OR REPLACE FUNCTION public.mgp_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT coalesce(public.mgp_current_role() IN ('super_admin','admin'), false) $$;

CREATE OR REPLACE FUNCTION public.mgp_current_user_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT u.id FROM public.mgp_users u
   WHERE u.auth_user_id = (SELECT auth.uid()) AND u.is_active
$$;

CREATE POLICY mgp_users_select ON public.mgp_users FOR SELECT TO authenticated
  USING ((SELECT public.mgp_is_member()));
-- All writes to mgp_users go through admin RPCs / the activation edge function.

-- ---------- Enterprise catalog (read-only view of 4D enterprises) ------------
CREATE OR REPLACE FUNCTION public.mgp_enterprise_catalog()
RETURNS TABLE (
  enterprise_id uuid, name text, organisation_name text, district text,
  enterprise_type text, community_council text, phone text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT e.id,
         coalesce(nullif(e.beneficiary_short_name,''), e.applicant_organisation_name),
         e.applicant_organisation_name,
         d.name, et.name, cc.name, e.beneficiary_contact_phone
    FROM public.enterprises e
    JOIN public.organizations o ON o.id = e.organization_id AND o.code = '4D'
    LEFT JOIN public.districts d ON d.id = e.district_id
    LEFT JOIN public.enterprise_types et ON et.id = e.enterprise_type_id
    LEFT JOIN public.community_councils cc ON cc.id = e.community_council_id
   WHERE public.mgp_is_member()
   ORDER BY 2
$$;

-- ---------- Tracking: one row per enterprise on the board ---------------------
CREATE TABLE IF NOT EXISTS public.mgp_tracking (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id   uuid UNIQUE REFERENCES public.enterprises(id) ON DELETE CASCADE,
  -- for enterprises not (yet) in the monitoring catalog:
  custom_name     text,
  custom_district text CHECK (custom_district IN ('Maseru','Berea','Thaba-Tseka')),
  stage           text NOT NULL CHECK (stage IN (
                    'approved','at_sadp','sadp_queries','under_review',
                    'with_isp','blocked_infra','withdrawn')),
  note            text,
  stage_since     timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES public.mgp_users(id),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (enterprise_id IS NOT NULL OR (custom_name IS NOT NULL AND custom_district IS NOT NULL))
);
ALTER TABLE public.mgp_tracking ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS mgp_tracking_updated_by_idx ON public.mgp_tracking(updated_by);

CREATE POLICY mgp_tracking_select ON public.mgp_tracking FOR SELECT TO authenticated
  USING ((SELECT public.mgp_is_member()));
CREATE POLICY mgp_tracking_insert ON public.mgp_tracking FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.mgp_can_edit()));
CREATE POLICY mgp_tracking_update ON public.mgp_tracking FOR UPDATE TO authenticated
  USING ((SELECT public.mgp_can_edit())) WITH CHECK ((SELECT public.mgp_can_edit()));
CREATE POLICY mgp_tracking_delete ON public.mgp_tracking FOR DELETE TO authenticated
  USING ((SELECT public.mgp_is_admin()));

-- ---------- Stage history (written by trigger) --------------------------------
CREATE TABLE IF NOT EXISTS public.mgp_stage_history (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tracking_id  uuid NOT NULL REFERENCES public.mgp_tracking(id) ON DELETE CASCADE,
  from_stage   text,
  to_stage     text NOT NULL,
  note         text,
  changed_by   uuid REFERENCES public.mgp_users(id),
  changed_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mgp_stage_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS mgp_stage_history_tracking_idx ON public.mgp_stage_history(tracking_id, changed_at);
CREATE INDEX IF NOT EXISTS mgp_stage_history_changed_by_idx ON public.mgp_stage_history(changed_by);
CREATE POLICY mgp_stage_history_select ON public.mgp_stage_history FOR SELECT TO authenticated
  USING ((SELECT public.mgp_is_member()));

CREATE OR REPLACE FUNCTION public.mgp_tracking_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_by := coalesce(public.mgp_current_user_id(), NEW.updated_by);
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_since := now();
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.mgp_tracking_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.mgp_stage_history (tracking_id, from_stage, to_stage, note, changed_by)
    VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.stage END, NEW.stage, NEW.note, NEW.updated_by);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS mgp_tracking_before_trg ON public.mgp_tracking;
CREATE TRIGGER mgp_tracking_before_trg BEFORE INSERT OR UPDATE ON public.mgp_tracking
  FOR EACH ROW EXECUTE FUNCTION public.mgp_tracking_before();
DROP TRIGGER IF EXISTS mgp_tracking_after_trg ON public.mgp_tracking;
CREATE TRIGGER mgp_tracking_after_trg AFTER INSERT OR UPDATE ON public.mgp_tracking
  FOR EACH ROW EXECUTE FUNCTION public.mgp_tracking_after();

-- ---------- Action plan items / SADP queries ----------------------------------
CREATE TABLE IF NOT EXISTS public.mgp_actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id  uuid NOT NULL REFERENCES public.mgp_tracking(id) ON DELETE CASCADE,
  kind         text NOT NULL DEFAULT 'action' CHECK (kind IN ('sadp_query','action')),
  description  text NOT NULL,
  owner        text,
  due_date     date,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  created_by   uuid REFERENCES public.mgp_users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  done_by      uuid REFERENCES public.mgp_users(id),
  done_at      timestamptz
);
ALTER TABLE public.mgp_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS mgp_actions_tracking_idx ON public.mgp_actions(tracking_id);
CREATE INDEX IF NOT EXISTS mgp_actions_created_by_idx ON public.mgp_actions(created_by);
CREATE INDEX IF NOT EXISTS mgp_actions_done_by_idx ON public.mgp_actions(done_by);

CREATE POLICY mgp_actions_select ON public.mgp_actions FOR SELECT TO authenticated
  USING ((SELECT public.mgp_is_member()));
CREATE POLICY mgp_actions_insert ON public.mgp_actions FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.mgp_can_edit()));
CREATE POLICY mgp_actions_update ON public.mgp_actions FOR UPDATE TO authenticated
  USING ((SELECT public.mgp_can_edit())) WITH CHECK ((SELECT public.mgp_can_edit()));
CREATE POLICY mgp_actions_delete ON public.mgp_actions FOR DELETE TO authenticated
  USING ((SELECT public.mgp_can_edit()));

CREATE OR REPLACE FUNCTION public.mgp_actions_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(public.mgp_current_user_id(), NEW.created_by);
  END IF;
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status <> 'done') THEN
    NEW.done_at := now();
    NEW.done_by := public.mgp_current_user_id();
  ELSIF NEW.status = 'open' THEN
    NEW.done_at := NULL;
    NEW.done_by := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS mgp_actions_before_trg ON public.mgp_actions;
CREATE TRIGGER mgp_actions_before_trg BEFORE INSERT OR UPDATE ON public.mgp_actions
  FOR EACH ROW EXECUTE FUNCTION public.mgp_actions_before();

-- ---------- Settings (baseline for "change since" column) ---------------------
CREATE TABLE IF NOT EXISTS public.mgp_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mgp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY mgp_settings_select ON public.mgp_settings FOR SELECT TO authenticated
  USING ((SELECT public.mgp_is_member()));
CREATE POLICY mgp_settings_write ON public.mgp_settings FOR ALL TO authenticated
  USING ((SELECT public.mgp_is_admin())) WITH CHECK ((SELECT public.mgp_is_admin()));

-- ---------- Admin RPCs: users & PINs ------------------------------------------
CREATE OR REPLACE FUNCTION public.mgp_normalize_phone(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT CASE
    WHEN length(regexp_replace(p, '\D', '', 'g')) = 8 THEN '266' || regexp_replace(p, '\D', '', 'g')
    ELSE regexp_replace(p, '\D', '', 'g') END
$$;

-- Issues a fresh 6-digit PIN (valid 14 days). Returns the plain PIN once.
CREATE OR REPLACE FUNCTION public.mgp_admin_issue_pin(p_user_id uuid)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_pin text; v_target_role text;
BEGIN
  IF NOT public.mgp_is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT role INTO v_target_role FROM public.mgp_users WHERE id = p_user_id;
  IF v_target_role = 'super_admin' AND public.mgp_current_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Only the super admin can reset a super admin';
  END IF;
  v_pin := lpad((floor(random() * 1000000))::int::text, 6, '0');
  UPDATE public.mgp_users
     SET pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')),
         pin_expires_at = now() + interval '14 days',
         pin_attempts = 0
   WHERE id = p_user_id;
  RETURN v_pin;
END $$;

CREATE OR REPLACE FUNCTION public.mgp_admin_add_user(p_full_name text, p_phone text, p_role text)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.mgp_is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF p_role = 'super_admin' AND public.mgp_current_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Only the super admin can create a super admin';
  END IF;
  INSERT INTO public.mgp_users (full_name, phone, role)
  VALUES (trim(p_full_name), public.mgp_normalize_phone(p_phone), p_role)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.mgp_admin_update_user(p_user_id uuid, p_full_name text, p_role text, p_is_active boolean)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_target_role text;
BEGIN
  IF NOT public.mgp_is_admin() THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT role INTO v_target_role FROM public.mgp_users WHERE id = p_user_id;
  IF (v_target_role = 'super_admin' OR p_role = 'super_admin') AND public.mgp_current_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Only the super admin can change a super admin';
  END IF;
  IF p_user_id = public.mgp_current_user_id() AND (p_is_active = false OR p_role <> v_target_role) THEN
    RAISE EXCEPTION 'You cannot change your own role or deactivate yourself';
  END IF;
  UPDATE public.mgp_users
     SET full_name = trim(p_full_name), role = p_role, is_active = p_is_active
   WHERE id = p_user_id;
END $$;

-- Called only by the mgp-activate edge function (service_role).
CREATE OR REPLACE FUNCTION public.mgp_check_pin(p_phone text, p_pin text)
RETURNS TABLE (user_id uuid, full_name text, auth_user_id uuid, ok boolean, reason text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE u public.mgp_users%ROWTYPE;
BEGIN
  SELECT * INTO u FROM public.mgp_users WHERE phone = public.mgp_normalize_phone(p_phone);
  IF NOT FOUND OR NOT u.is_active THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::uuid, false, 'Phone number not registered. Ask your admin to add you.'; RETURN;
  END IF;
  IF u.pin_hash IS NULL OR u.pin_expires_at < now() THEN
    RETURN QUERY SELECT u.id, u.full_name, u.auth_user_id, false, 'No valid PIN. Ask your admin for a new PIN.'; RETURN;
  END IF;
  IF u.pin_attempts >= 5 THEN
    RETURN QUERY SELECT u.id, u.full_name, u.auth_user_id, false, 'Too many wrong attempts. Ask your admin for a new PIN.'; RETURN;
  END IF;
  IF extensions.crypt(p_pin, u.pin_hash) <> u.pin_hash THEN
    UPDATE public.mgp_users SET pin_attempts = pin_attempts + 1 WHERE id = u.id;
    RETURN QUERY SELECT u.id, u.full_name, u.auth_user_id, false, 'Wrong PIN.'; RETURN;
  END IF;
  RETURN QUERY SELECT u.id, u.full_name, u.auth_user_id, true, NULL::text;
END $$;

CREATE OR REPLACE FUNCTION public.mgp_complete_activation(p_user_id uuid, p_auth_user_id uuid)
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
  UPDATE public.mgp_users
     SET auth_user_id = p_auth_user_id, pin_hash = NULL, pin_expires_at = NULL,
         pin_attempts = 0, activated_at = coalesce(activated_at, now())
   WHERE id = p_user_id
$$;

-- ---------- Grants -------------------------------------------------------------
REVOKE ALL ON FUNCTION public.mgp_check_pin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mgp_complete_activation(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mgp_check_pin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mgp_complete_activation(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.mgp_admin_issue_pin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mgp_admin_add_user(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mgp_admin_update_user(uuid, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mgp_enterprise_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mgp_admin_issue_pin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mgp_admin_add_user(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mgp_admin_update_user(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mgp_enterprise_catalog() TO authenticated;

REVOKE ALL ON FUNCTION public.mgp_tracking_before() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mgp_tracking_after() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mgp_actions_before() FROM PUBLIC, anon, authenticated;

-- ---------- Seed: super admin ------------------------------------------------
INSERT INTO public.mgp_users (full_name, phone, role)
VALUES ('Ehsan Rizvi', '26656300091', 'super_admin')
ON CONFLICT (phone) DO NOTHING;

-- ---------- Hardening (applied as 401/402) ------------------------------------
-- Members must never read pin_hash: column-level grant only.
REVOKE ALL ON public.mgp_users FROM anon, authenticated;
GRANT SELECT (id, auth_user_id, full_name, phone, role, is_active, activated_at, created_at, pin_expires_at)
  ON public.mgp_users TO authenticated;
REVOKE ALL ON public.mgp_stage_history FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.mgp_stage_history FROM authenticated;
REVOKE ALL ON public.mgp_tracking, public.mgp_actions, public.mgp_settings FROM anon;

REVOKE EXECUTE ON FUNCTION public.mgp_current_role(), public.mgp_is_member(), public.mgp_can_edit(), public.mgp_is_admin(), public.mgp_current_user_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mgp_current_role(), public.mgp_is_member(), public.mgp_can_edit(), public.mgp_is_admin(), public.mgp_current_user_id() TO authenticated, service_role;

-- ---------- Realtime (applied as 403) -----------------------------------------
-- Every open tracker screen refreshes when anyone changes a stage/action/baseline.
-- RLS still applies to realtime: only tracker members receive events.
ALTER PUBLICATION supabase_realtime ADD TABLE public.mgp_tracking, public.mgp_actions, public.mgp_stage_history, public.mgp_settings;

-- ---------- Assignment to registered users (applied as 404) -------------------
ALTER TABLE public.mgp_actions
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.mgp_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES public.mgp_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
CREATE INDEX IF NOT EXISTS mgp_actions_assigned_to_idx ON public.mgp_actions(assigned_to);
CREATE INDEX IF NOT EXISTS mgp_actions_assigned_by_idx ON public.mgp_actions(assigned_by);

CREATE OR REPLACE FUNCTION public.mgp_actions_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(public.mgp_current_user_id(), NEW.created_by);
  END IF;
  -- Assignment to a registered user: stamp who/when, mirror the name into owner.
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
    NEW.assigned_at := now();
    NEW.assigned_by := public.mgp_current_user_id();
    NEW.owner := (SELECT u.full_name FROM public.mgp_users u WHERE u.id = NEW.assigned_to);
  ELSIF NEW.assigned_to IS NULL AND TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT NULL THEN
    NEW.assigned_at := NULL;
    NEW.assigned_by := NULL;
    IF NEW.owner IS NOT DISTINCT FROM OLD.owner THEN NEW.owner := NULL; END IF;
  END IF;
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status <> 'done') THEN
    NEW.done_at := now();
    NEW.done_by := public.mgp_current_user_id();
  ELSIF NEW.status = 'open' THEN
    NEW.done_at := NULL;
    NEW.done_by := NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mgp_actions_before() FROM PUBLIC, anon, authenticated;

-- ---------- Assignees can clear their own items (applied as 405) --------------
DROP POLICY IF EXISTS mgp_actions_update ON public.mgp_actions;
CREATE POLICY mgp_actions_update ON public.mgp_actions FOR UPDATE TO authenticated
  USING ((SELECT public.mgp_can_edit()) OR assigned_to = (SELECT public.mgp_current_user_id()))
  WITH CHECK ((SELECT public.mgp_can_edit()) OR assigned_to = (SELECT public.mgp_current_user_id()));

CREATE OR REPLACE FUNCTION public.mgp_actions_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.mgp_can_edit() THEN
    -- assignee without edit rights: only the status may change
    NEW.tracking_id := OLD.tracking_id; NEW.kind := OLD.kind; NEW.description := OLD.description;
    NEW.owner := OLD.owner; NEW.due_date := OLD.due_date; NEW.assigned_to := OLD.assigned_to;
    NEW.assigned_by := OLD.assigned_by; NEW.assigned_at := OLD.assigned_at;
    NEW.created_by := OLD.created_by; NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mgp_actions_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mgp_actions_a_guard_trg BEFORE UPDATE ON public.mgp_actions
  FOR EACH ROW EXECUTE FUNCTION public.mgp_actions_guard();

-- ---------- 406/407: typed owner names that match a registered user become ----
-- real assignments (old/cached app versions); guard limited to app sessions.
CREATE OR REPLACE FUNCTION public.mgp_actions_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(public.mgp_current_user_id(), NEW.created_by);
  END IF;
  IF NEW.assigned_to IS NULL AND NEW.owner IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.owner IS DISTINCT FROM OLD.owner) THEN
    NEW.assigned_to := (SELECT u.id FROM public.mgp_users u
                         WHERE u.is_active AND lower(trim(u.full_name)) = lower(trim(NEW.owner)) LIMIT 1);
  END IF;
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
    NEW.assigned_at := now();
    NEW.assigned_by := coalesce(public.mgp_current_user_id(), NEW.created_by);
    NEW.owner := (SELECT u.full_name FROM public.mgp_users u WHERE u.id = NEW.assigned_to);
  ELSIF NEW.assigned_to IS NULL AND TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT NULL THEN
    NEW.assigned_at := NULL;
    NEW.assigned_by := NULL;
    IF NEW.owner IS NOT DISTINCT FROM OLD.owner THEN NEW.owner := NULL; END IF;
  END IF;
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status <> 'done') THEN
    NEW.done_at := now();
    NEW.done_by := public.mgp_current_user_id();
  ELSIF NEW.status = 'open' THEN
    NEW.done_at := NULL;
    NEW.done_by := NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mgp_actions_before() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mgp_actions_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL AND NOT public.mgp_can_edit() THEN
    NEW.tracking_id := OLD.tracking_id; NEW.kind := OLD.kind; NEW.description := OLD.description;
    NEW.owner := OLD.owner; NEW.due_date := OLD.due_date; NEW.assigned_to := OLD.assigned_to;
    NEW.assigned_by := OLD.assigned_by; NEW.assigned_at := OLD.assigned_at;
    NEW.created_by := OLD.created_by; NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mgp_actions_guard() FROM PUBLIC, anon, authenticated;

-- ---------- 408: enterprises removed from the tracker (e.g. withdrawn) ---------
CREATE TABLE IF NOT EXISTS public.mgp_excluded (
  enterprise_id uuid PRIMARY KEY REFERENCES public.enterprises(id) ON DELETE CASCADE,
  reason        text,
  excluded_by   uuid REFERENCES public.mgp_users(id) ON DELETE SET NULL,
  excluded_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mgp_excluded ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mgp_excluded FROM anon;
CREATE INDEX IF NOT EXISTS mgp_excluded_by_idx ON public.mgp_excluded(excluded_by);
CREATE POLICY mgp_excluded_select ON public.mgp_excluded FOR SELECT TO authenticated USING ((SELECT public.mgp_is_member()));
CREATE POLICY mgp_excluded_write ON public.mgp_excluded FOR ALL TO authenticated
  USING ((SELECT public.mgp_is_admin())) WITH CHECK ((SELECT public.mgp_is_admin()));
-- mgp_enterprise_catalog() now also filters: AND NOT EXISTS (SELECT 1 FROM public.mgp_excluded x WHERE x.enterprise_id = e.id)
ALTER PUBLICATION supabase_realtime ADD TABLE public.mgp_excluded;
-- Data (3 Nov 2026): City of Grace Park Pty Ltd, Goshen, Mamorena & TM Poultry excluded as Withdrawn.
