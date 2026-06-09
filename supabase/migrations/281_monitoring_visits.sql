-- Migration 281: monitoring_visits + monitoring_visit_photos.
--
-- A *lightweight* field visit record. Different from inspection_visits (which
-- is the heavy 21-aspect ESMP compliance form). Monitoring visits are casual,
-- frequent observations — "popped by, things looked good, here are 3 photos".
--
-- Five quick yes/no signals capture the most-actionable info without slowing
-- down field entry; the bulk of the record is free-form text + photos + GPS.
--
-- No approval workflow on this entity — status flips draft → submitted when
-- the field staffer finishes the entry. The submitted record stands as a
-- record; it doesn't gate any other status (unlike inspection visits).

-- ============================================================================
-- monitoring_visits
-- ============================================================================
CREATE TABLE public.monitoring_visits (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id               uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  organization_id             uuid NOT NULL REFERENCES public.organizations(id),

  visit_date                  date NOT NULL DEFAULT current_date,
  conducted_by_user_id        uuid REFERENCES public.user_profiles(id),
  conducted_by_name           text NOT NULL,

  visit_type                  text NOT NULL DEFAULT 'routine'
                              CHECK (visit_type IN ('routine', 'follow_up', 'complaint', 'opportunistic')),
  enterprise_phase            text NOT NULL DEFAULT 'unknown'
                              CHECK (enterprise_phase IN ('pre_construction', 'construction', 'operation', 'unknown')),

  owner_present               boolean,
  others_present              text,

  -- 5 quick yes/no signals. NULL means "not assessed on this visit".
  signal_activity_on_track    boolean,
  signal_inputs_supplied      boolean,
  signal_records_maintained   boolean,
  signal_site_safe            boolean,
  signal_major_issues         boolean,

  observations                text,
  issues_noted                text,
  actions_agreed              text,
  actions_due_date            date,
  next_visit_planned          date,
  weather                     text,

  gps_lat                     numeric,
  gps_lng                     numeric,
  photo_count                 int NOT NULL DEFAULT 0,

  status                      text NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'submitted')),
  submitted_at                timestamptz,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT monitoring_visits_gps_lat_range
    CHECK (gps_lat IS NULL OR (gps_lat BETWEEN -90  AND 90)),
  CONSTRAINT monitoring_visits_gps_lng_range
    CHECK (gps_lng IS NULL OR (gps_lng BETWEEN -180 AND 180))
);

CREATE INDEX idx_monitoring_visits_enterprise_date
  ON public.monitoring_visits (enterprise_id, visit_date DESC);
CREATE INDEX idx_monitoring_visits_org_status
  ON public.monitoring_visits (organization_id, status);

CREATE TRIGGER monitoring_visits_set_org
  BEFORE INSERT OR UPDATE ON public.monitoring_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_enterprise();

CREATE TRIGGER monitoring_visits_set_updated_at
  BEFORE UPDATE ON public.monitoring_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER audit_monitoring_visit
  AFTER INSERT OR UPDATE OR DELETE ON public.monitoring_visits
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

ALTER TABLE public.monitoring_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY monitoring_visit_select ON public.monitoring_visits FOR SELECT
  USING (public._submission_select(organization_id));

CREATE POLICY monitoring_visit_insert ON public.monitoring_visits FOR INSERT
  WITH CHECK (public._submission_write(organization_id));

CREATE POLICY monitoring_visit_update ON public.monitoring_visits FOR UPDATE
  USING (public._submission_write(organization_id))
  WITH CHECK (public._submission_write(organization_id));

CREATE POLICY monitoring_visit_delete ON public.monitoring_visits FOR DELETE
  USING (public.is_super_admin());

-- ============================================================================
-- monitoring_visit_photos
-- ============================================================================
CREATE TABLE public.monitoring_visit_photos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id         uuid NOT NULL REFERENCES public.monitoring_visits(id) ON DELETE CASCADE,
  enterprise_id    uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES public.organizations(id),
  storage_path     text NOT NULL,
  caption          text,
  gps_lat          numeric,
  gps_lng          numeric,
  taken_at         timestamptz,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  uploaded_by      uuid REFERENCES public.user_profiles(id),

  CONSTRAINT monitoring_visit_photos_gps_lat_range
    CHECK (gps_lat IS NULL OR (gps_lat BETWEEN -90  AND 90)),
  CONSTRAINT monitoring_visit_photos_gps_lng_range
    CHECK (gps_lng IS NULL OR (gps_lng BETWEEN -180 AND 180))
);

CREATE INDEX idx_mv_photos_visit ON public.monitoring_visit_photos (visit_id, uploaded_at DESC);

ALTER TABLE public.monitoring_visit_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY monitoring_photo_select ON public.monitoring_visit_photos FOR SELECT
  USING (public._submission_select(organization_id));
CREATE POLICY monitoring_photo_insert ON public.monitoring_visit_photos FOR INSERT
  WITH CHECK (public._submission_write(organization_id));
CREATE POLICY monitoring_photo_delete ON public.monitoring_visit_photos FOR DELETE
  USING (public._submission_write(organization_id));

CREATE OR REPLACE FUNCTION public.bump_monitoring_visit_photo_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.monitoring_visits
      SET photo_count = photo_count + 1
      WHERE id = NEW.visit_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.monitoring_visits
      SET photo_count = GREATEST(0, photo_count - 1)
      WHERE id = OLD.visit_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER mv_photo_count_ins
  AFTER INSERT ON public.monitoring_visit_photos
  FOR EACH ROW EXECUTE FUNCTION public.bump_monitoring_visit_photo_count();
CREATE TRIGGER mv_photo_count_del
  AFTER DELETE ON public.monitoring_visit_photos
  FOR EACH ROW EXECUTE FUNCTION public.bump_monitoring_visit_photo_count();

-- ============================================================================
-- Bucket + storage policies (mirrors m1-supporting-docs pattern: enterprise_id
-- is the first path segment so RLS can join to enterprises by split_part)
-- Path layout: {enterprise_id}/{visit_id}/{photo_id}.jpg
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'monitoring-visit-photos',
    'monitoring-visit-photos',
    false,
    10485760,
    ARRAY['image/jpeg','image/png','image/heic','image/webp']
  )
  ON CONFLICT (id) DO UPDATE
    SET file_size_limit     = 10485760,
        allowed_mime_types  = ARRAY['image/jpeg','image/png','image/heic','image/webp'];

CREATE POLICY mv_photo_storage_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'monitoring-visit-photos'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.enterprises e
        WHERE e.id::text = split_part(objects.name, '/', 1)
          AND e.organization_id = public.current_user_org_id()
      )
    )
  );

CREATE POLICY mv_photo_storage_write ON storage.objects FOR ALL
  USING (
    bucket_id = 'monitoring-visit-photos'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.enterprises e
        WHERE e.id::text = split_part(objects.name, '/', 1)
          AND e.organization_id = public.current_user_org_id()
          AND public.current_user_role() = ANY (ARRAY['field_supervisor','me_officer','team_leader'])
      )
    )
  )
  WITH CHECK (
    bucket_id = 'monitoring-visit-photos'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.enterprises e
        WHERE e.id::text = split_part(objects.name, '/', 1)
          AND e.organization_id = public.current_user_org_id()
          AND public.current_user_role() = ANY (ARRAY['field_supervisor','me_officer','team_leader'])
      )
    )
  );

COMMENT ON TABLE public.monitoring_visits IS
  'Lightweight field-visit records. Many per enterprise. Distinct from inspection_visits (heavy 21-aspect ESMP compliance form). Captures observations + 5 quick signal yes/nos + photos + GPS.';
