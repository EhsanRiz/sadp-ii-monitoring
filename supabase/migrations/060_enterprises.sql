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
