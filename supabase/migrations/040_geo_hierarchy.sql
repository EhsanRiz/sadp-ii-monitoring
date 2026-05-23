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
