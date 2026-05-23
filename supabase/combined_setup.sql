-- ============================================================================
-- SADP-II Monitoring — combined Supabase setup (Phase 1)
-- ============================================================================
-- Paste this entire file into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run: every statement uses IF NOT EXISTS / ON CONFLICT DO NOTHING /
-- ALTER ... DROP CONSTRAINT IF EXISTS.
--
-- After this completes:
--   1. Authentication → Hooks → Custom Access Token Hook → enable
--      public.custom_access_token_hook
--   2. Authentication → Users → Add user (super admin), then SQL:
--        a. Stamp raw_user_meta_data with {role, full_name, organization_id}
--        b. Insert into user_profiles (id, role, organization_id, full_name)
-- ============================================================================


-- ============================================================================
-- 010_extensions.sql
-- ============================================================================
-- 010_extensions.sql
-- Enable extensions the rest of the schema relies on.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pgcrypto;        -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- belt + braces for uuid generation

-- Generic updated_at trigger function — used on most tables.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 020_organizations_rounds.sql
-- ============================================================================
-- 020_organizations_rounds.sql
-- Top-level tenant table and the SADP-II rounds catalog.

CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS
  'Implementing partners. Phase 1 expects two rows: 4D, RSDA. Seeded by 110_seed_organizations.sql.';

CREATE TABLE IF NOT EXISTS public.rounds (
  id          smallint    PRIMARY KEY,
  name        text        NOT NULL,
  status      text        NOT NULL CHECK (status IN ('upcoming','active','closed')),
  start_date  date,
  end_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rounds IS
  'SADP-II funding rounds. Round 3 active in 2026; Round 4 upcoming. Seeded by 120_seed_rounds.sql.';

-- ============================================================================
-- 030_user_profiles.sql
-- ============================================================================
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

-- ============================================================================
-- 040_geo_hierarchy.sql
-- ============================================================================
-- 040_geo_hierarchy.sql
-- Geographic catalog: District → {Community Council, Resource Center, Village}.
-- CC, RC, Village are SIBLINGS under District (revised in design doc v0.2 because
-- 4D's real data shows RCs routinely serve multiple CCs — e.g., Masianokeng serves 10).

CREATE TABLE IF NOT EXISTS public.districts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  name            text        NOT NULL,
  code            text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, name)
);
COMMENT ON TABLE public.districts IS
  'Each district belongs to exactly ONE organization (4D OR RSDA, never both). organization_id is set at creation and is the root of ownership for everything under this district.';

CREATE TABLE IF NOT EXISTS public.community_councils (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id     uuid        NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  name            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (district_id, name)
);

CREATE TABLE IF NOT EXISTS public.resource_centers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id     uuid        NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  name            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (district_id, name)
);
COMMENT ON TABLE public.resource_centers IS
  'Resource Center belongs to a District directly (not nested under Community Council). A single RC may serve enterprises in many CCs.';

CREATE TABLE IF NOT EXISTS public.villages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id     uuid        NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  name            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (district_id, name)
);

CREATE INDEX IF NOT EXISTS idx_cc_org   ON public.community_councils (organization_id);
CREATE INDEX IF NOT EXISTS idx_rc_org   ON public.resource_centers   (organization_id);
CREATE INDEX IF NOT EXISTS idx_vill_org ON public.villages           (organization_id);

-- Denormalisation trigger: set organization_id from the parent district.
-- This makes RLS one-column-check and prevents drift.
CREATE OR REPLACE FUNCTION public.set_org_from_district()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT organization_id INTO NEW.organization_id
    FROM public.districts WHERE id = NEW.district_id;
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'district % not found or has no organization_id', NEW.district_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_councils_set_org
  BEFORE INSERT OR UPDATE OF district_id ON public.community_councils
  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_district();

CREATE TRIGGER resource_centers_set_org
  BEFORE INSERT OR UPDATE OF district_id ON public.resource_centers
  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_district();

CREATE TRIGGER villages_set_org
  BEFORE INSERT OR UPDATE OF district_id ON public.villages
  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_district();

-- ============================================================================
-- 050_enterprise_types.sql
-- ============================================================================
-- 050_enterprise_types.sql
-- Catalog of enterprise types observed in real 4D data, grouped by category.
-- ESMP templates in Phase 2 will be per-category (crops / livestock / aquaculture / processing).

CREATE TABLE IF NOT EXISTS public.enterprise_types (
  id          smallint    PRIMARY KEY,
  code        text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  category    text        NOT NULL CHECK (category IN ('crops','livestock','aquaculture','processing')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.enterprise_types IS
  '17 types seeded by 130_seed_enterprise_types.sql. category drives Phase 2 ESMP template routing.';

-- ============================================================================
-- 060_enterprises.sql
-- ============================================================================
-- 060_enterprises.sql
-- The main enterprise table. Maps every Annex V/A cover page field plus 4D's
-- operational fields (contact phone, borehole status).
--
-- Schema design notes (PHASE_1_DESIGN.md §6.9, v0.4):
--   - Most cover-page fields are NULLABLE so Round 3 imports can land minimally.
--   - registration_completeness flag tracks whether the row has enough data
--     for the cover-page PDF generator to render.
--   - A CHECK constraint enforces completeness when flag = 'cover_page_ready'.

CREATE TABLE IF NOT EXISTS public.enterprises (
  id                                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                    uuid          NOT NULL REFERENCES public.organizations(id),
  round_id                           smallint      NOT NULL REFERENCES public.rounds(id),
  registration_completeness          text          NOT NULL DEFAULT 'minimal'
                                                   CHECK (registration_completeness IN ('minimal','cover_page_ready')),
  enterprise_type_id                 smallint      NOT NULL REFERENCES public.enterprise_types(id),

  -- Always-required identifiers
  beneficiary_short_name             text          NOT NULL,
  applicant_organisation_name        text          NOT NULL,

  -- Cover-page fields: nullable when 'minimal', required when 'cover_page_ready'
  project_title                      text,
  registration_number                text,
  period_start                       date,
  period_end                         date,
  total_project_cost_lsl             numeric(14,2),
  total_grant_lsl                    numeric(14,2),
  current_grant_payment_lsl          numeric(14,2),
  principal_applicant_name           text,

  -- Geographic
  district_id                        uuid          NOT NULL REFERENCES public.districts(id),
  community_council_id               uuid          REFERENCES public.community_councils(id),
  resource_center_id                 uuid          REFERENCES public.resource_centers(id),
  village_id                         uuid          REFERENCES public.villages(id),
  location_detail                    text,

  -- Operational (not on cover page)
  beneficiary_contact_phone          text,

  -- Signatures (uploaded images in Supabase Storage)
  principal_applicant_signature_url  text,
  principal_applicant_signed_date    date,

  -- Service Provider — plain text, manually filled by Field Supervisor
  service_provider_name              text,
  service_provider_signature_url     text,
  service_provider_signed_date       date,

  -- CGP office-use fields
  cgp_received_date                  date,
  cgp_officer_name                   text,
  cgp_officer_signature_url          text,

  -- Borehole status (3 flags matching 4D's existing tracking)
  borehole_pre_existing              boolean       NOT NULL DEFAULT false,
  borehole_drilled                   boolean       NOT NULL DEFAULT false,
  borehole_drilling_incomplete       boolean       NOT NULL DEFAULT false,

  -- ESMP status
  esmp_status                        text          NOT NULL DEFAULT 'not_started'
                                                   CHECK (esmp_status IN ('not_started','pending_app_completion','completed_uploaded','completed_in_app')),
  esmp_uploaded_pdf_url              text,

  created_by                         uuid          REFERENCES public.user_profiles(id),
  created_at                         timestamptz   NOT NULL DEFAULT now(),
  updated_at                         timestamptz   NOT NULL DEFAULT now(),

  -- Completeness CHECK: cover_page_ready rows must have every cover-page field
  CONSTRAINT enterprises_cover_page_ready_complete CHECK (
    registration_completeness = 'minimal'
    OR (
      registration_completeness = 'cover_page_ready'
      AND project_title          IS NOT NULL
      AND registration_number    IS NOT NULL
      AND period_start           IS NOT NULL
      AND period_end             IS NOT NULL
      AND total_project_cost_lsl IS NOT NULL
      AND total_grant_lsl        IS NOT NULL
      AND principal_applicant_name IS NOT NULL
      AND community_council_id   IS NOT NULL
      AND resource_center_id     IS NOT NULL
    )
  )
);

-- registration_number unique per org, but only when not null
CREATE UNIQUE INDEX IF NOT EXISTS uq_enterprises_org_regno
  ON public.enterprises (organization_id, registration_number)
  WHERE registration_number IS NOT NULL;

-- Dashboard-pattern indexes
CREATE INDEX IF NOT EXISTS idx_enterprises_org_round       ON public.enterprises (organization_id, round_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_org_district    ON public.enterprises (organization_id, district_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_org_rc          ON public.enterprises (organization_id, resource_center_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_org_type        ON public.enterprises (organization_id, enterprise_type_id);
CREATE INDEX IF NOT EXISTS idx_enterprises_esmp_status     ON public.enterprises (esmp_status);
CREATE INDEX IF NOT EXISTS idx_enterprises_completeness    ON public.enterprises (organization_id, registration_completeness);
CREATE INDEX IF NOT EXISTS idx_enterprises_borehole_partial
  ON public.enterprises (organization_id) WHERE borehole_drilling_incomplete = true;

-- updated_at trigger
CREATE TRIGGER enterprises_set_updated_at
  BEFORE UPDATE ON public.enterprises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Geo-consistency trigger: copy organization_id from district, and verify
-- CC / RC / Village (if set) all live in that district.
CREATE OR REPLACE FUNCTION public.enterprises_geo_consistency()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  d_org uuid;
  cc_district uuid;
  rc_district uuid;
  v_district uuid;
BEGIN
  SELECT organization_id INTO d_org FROM public.districts WHERE id = NEW.district_id;
  IF d_org IS NULL THEN
    RAISE EXCEPTION 'enterprises: district % not found', NEW.district_id;
  END IF;
  NEW.organization_id := d_org;

  IF NEW.community_council_id IS NOT NULL THEN
    SELECT district_id INTO cc_district FROM public.community_councils WHERE id = NEW.community_council_id;
    IF cc_district IS DISTINCT FROM NEW.district_id THEN
      RAISE EXCEPTION 'enterprises: community_council % is not in district %', NEW.community_council_id, NEW.district_id;
    END IF;
  END IF;

  IF NEW.resource_center_id IS NOT NULL THEN
    SELECT district_id INTO rc_district FROM public.resource_centers WHERE id = NEW.resource_center_id;
    IF rc_district IS DISTINCT FROM NEW.district_id THEN
      RAISE EXCEPTION 'enterprises: resource_center % is not in district %', NEW.resource_center_id, NEW.district_id;
    END IF;
  END IF;

  IF NEW.village_id IS NOT NULL THEN
    SELECT district_id INTO v_district FROM public.villages WHERE id = NEW.village_id;
    IF v_district IS DISTINCT FROM NEW.district_id THEN
      RAISE EXCEPTION 'enterprises: village % is not in district %', NEW.village_id, NEW.district_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enterprises_geo_consistency_check
  BEFORE INSERT OR UPDATE OF district_id, community_council_id, resource_center_id, village_id
  ON public.enterprises
  FOR EACH ROW EXECUTE FUNCTION public.enterprises_geo_consistency();

-- ============================================================================
-- 070_audit_log.sql
-- ============================================================================
-- 070_audit_log.sql
-- Generic per-row audit trail for tracked tables. Fed by triggers only —
-- application code cannot write here. Even Super Admin cannot delete rows.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name        text          NOT NULL,
  record_id         uuid          NOT NULL,
  action            text          NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by        uuid          REFERENCES public.user_profiles(id),
  changed_at        timestamptz   NOT NULL DEFAULT now(),
  old_values        jsonb,
  new_values        jsonb,
  diff              jsonb,
  organization_id   uuid
);

CREATE INDEX IF NOT EXISTS idx_audit_record  ON public.audit_log (table_name, record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org     ON public.audit_log (organization_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON public.audit_log (changed_by, changed_at DESC);

-- Generic audit trigger function. SECURITY DEFINER so it can always write
-- regardless of the calling role's RLS.
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_j  jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  new_j  jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  diff_j jsonb := NULL;
  k      text;
  org_id uuid;
  rec_id uuid;
BEGIN
  -- Compute diff for UPDATEs: only the columns that changed
  IF TG_OP = 'UPDATE' THEN
    diff_j := '{}'::jsonb;
    FOR k IN SELECT jsonb_object_keys(new_j) LOOP
      IF old_j->k IS DISTINCT FROM new_j->k THEN
        diff_j := diff_j || jsonb_build_object(
          k, jsonb_build_object('from', old_j->k, 'to', new_j->k)
        );
      END IF;
    END LOOP;
    -- Skip writing an audit row if literally nothing changed (e.g., set to same value)
    IF diff_j = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  org_id := COALESCE((new_j->>'organization_id'), (old_j->>'organization_id'))::uuid;
  rec_id := COALESCE((new_j->>'id'),              (old_j->>'id'))::uuid;

  INSERT INTO public.audit_log
    (table_name, record_id, action, changed_by, old_values, new_values, diff, organization_id)
  VALUES
    (TG_TABLE_NAME, rec_id, TG_OP, auth.uid(), old_j, new_j, diff_j, org_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to Phase 1 tracked tables
CREATE TRIGGER audit_enterprises
  AFTER INSERT OR UPDATE OR DELETE ON public.enterprises
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============================================================================
-- 080_rls_helpers.sql
-- ============================================================================
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

-- ============================================================================
-- 090_rls_policies.sql
-- ============================================================================
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

-- ============================================================================
-- 100_auth_hook.sql
-- ============================================================================
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

-- ============================================================================
-- 110_super_admin_optional_org.sql
-- ============================================================================
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

-- ============================================================================
-- 110_seed_organizations.sql
-- ============================================================================
-- 110_seed_organizations.sql
-- The two implementing partners. Run after migrations 010-100.

INSERT INTO public.organizations (code, name)
VALUES ('4D',   '4D Climate Solutions'),
       ('RSDA', 'RSDA')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 120_seed_rounds.sql
-- ============================================================================
-- 120_seed_rounds.sql
-- SADP-II funding rounds. Round 3 is currently active; Round 4 is upcoming.
-- Update start_date / end_date as confirmed by SADP-II programme office.

INSERT INTO public.rounds (id, name, status, start_date, end_date) VALUES
  (3, 'Round 3', 'active',   '2025-01-01', NULL),
  (4, 'Round 4', 'upcoming', NULL,         NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 130_seed_enterprise_types.sql
-- ============================================================================
-- 130_seed_enterprise_types.sql
-- The 17 enterprise types observed in real 4D data, grouped into 4 categories
-- that drive Phase 2 ESMP template routing.

INSERT INTO public.enterprise_types (id, code, name, category) VALUES
  -- crops
  ( 1, 'vegetable_production', 'Vegetable Production', 'crops'),
  ( 2, 'hydroponics',          'Hydroponics',          'crops'),
  ( 3, 'seedling_production',  'Seedling Production',  'crops'),

  -- livestock
  ( 4, 'broiler_production',   'Broiler Production',   'livestock'),
  ( 5, 'egg_production',       'Egg Production',       'livestock'),
  ( 6, 'hatchery',             'Hatchery',             'livestock'),
  ( 7, 'duck_production',      'Duck Production',      'livestock'),
  ( 8, 'piggery',              'Piggery',              'livestock'),
  ( 9, 'dairy_production',     'Dairy Production',     'livestock'),
  (10, 'ram_breeding',         'Ram Breeding',         'livestock'),
  (11, 'ram_buck_breeding',    'Ram & Buck Breeding',  'livestock'),
  (12, 'livestock_production', 'Livestock Production', 'livestock'),

  -- aquaculture
  (13, 'fish_production',      'Fish Production',      'aquaculture'),

  -- processing
  (14, 'meat_processing',      'Meat Processing',      'processing'),
  (15, 'fruit_drying',         'Fruit Drying',         'processing'),
  (16, 'fruit_veg_processing', 'Fruit & Vegetable Processing', 'processing'),
  (17, 'milling',              'Milling',              'processing')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 140_seed_rsda_districts.sql
-- ============================================================================
-- 140_seed_rsda_districts.sql
-- The 4 RSDA districts in southern Lesotho.
-- Community Councils, Resource Centers, and Villages for RSDA are added
-- incrementally via the Geography admin UI as the data is collected (RSDA's
-- catalog hasn't been received yet).

INSERT INTO public.districts (organization_id, name)
SELECT (SELECT id FROM public.organizations WHERE code='RSDA'), d
  FROM (VALUES
    ('Mafeteng'),
    ('Mohale''s Hoek'),
    ('Quithing'),
    ('Qacha''s Nek')
  ) AS t(d)
ON CONFLICT (organization_id, name) DO NOTHING;

-- ============================================================================
-- VERIFY (run separately after the above completes)
-- ============================================================================
-- SELECT count(*) FROM public.organizations;       -- expected: 2  (4D, RSDA)
-- SELECT count(*) FROM public.rounds;              -- expected: 2
-- SELECT count(*) FROM public.enterprise_types;    -- expected: 17
-- SELECT o.code, count(*) FROM public.districts d
--   JOIN public.organizations o ON o.id = d.organization_id
--   GROUP BY o.code;                               -- expected: 4D=3, RSDA=4
