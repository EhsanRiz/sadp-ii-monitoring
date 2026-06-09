-- Migration 280: GPS coordinates on enterprises + resource_centers.
--
-- Decimal-degree WGS84. Captured by the browser's geolocation API on the
-- enterprise Details page and on the new /admin/geography page for RCs.
-- gps_captured_at tracks when the value was last set so stale coords are
-- visible (auto-bumped in the app code, not by a trigger, so manual entry
-- doesn't get an automatic now()).

ALTER TABLE public.enterprises
  ADD COLUMN IF NOT EXISTS gps_lat         numeric,
  ADD COLUMN IF NOT EXISTS gps_lng         numeric,
  ADD COLUMN IF NOT EXISTS gps_captured_at timestamptz;

ALTER TABLE public.enterprises
  DROP CONSTRAINT IF EXISTS enterprises_gps_lat_range,
  DROP CONSTRAINT IF EXISTS enterprises_gps_lng_range;

ALTER TABLE public.enterprises
  ADD CONSTRAINT enterprises_gps_lat_range
    CHECK (gps_lat IS NULL OR (gps_lat BETWEEN -90  AND 90)),
  ADD CONSTRAINT enterprises_gps_lng_range
    CHECK (gps_lng IS NULL OR (gps_lng BETWEEN -180 AND 180));

ALTER TABLE public.resource_centers
  ADD COLUMN IF NOT EXISTS gps_lat         numeric,
  ADD COLUMN IF NOT EXISTS gps_lng         numeric,
  ADD COLUMN IF NOT EXISTS gps_captured_at timestamptz;

ALTER TABLE public.resource_centers
  DROP CONSTRAINT IF EXISTS resource_centers_gps_lat_range,
  DROP CONSTRAINT IF EXISTS resource_centers_gps_lng_range;

ALTER TABLE public.resource_centers
  ADD CONSTRAINT resource_centers_gps_lat_range
    CHECK (gps_lat IS NULL OR (gps_lat BETWEEN -90  AND 90)),
  ADD CONSTRAINT resource_centers_gps_lng_range
    CHECK (gps_lng IS NULL OR (gps_lng BETWEEN -180 AND 180));

COMMENT ON COLUMN public.enterprises.gps_lat IS
  'WGS84 latitude (decimal degrees). Captured at the enterprise site by the field supervisor.';
COMMENT ON COLUMN public.enterprises.gps_lng IS
  'WGS84 longitude (decimal degrees).';
COMMENT ON COLUMN public.enterprises.gps_captured_at IS
  'When the enterprise coords were last set/edited.';
COMMENT ON COLUMN public.resource_centers.gps_lat IS
  'WGS84 latitude of the Resource Center building.';
COMMENT ON COLUMN public.resource_centers.gps_lng IS
  'WGS84 longitude of the Resource Center building.';
COMMENT ON COLUMN public.resource_centers.gps_captured_at IS
  'When the RC coords were last set/edited.';
