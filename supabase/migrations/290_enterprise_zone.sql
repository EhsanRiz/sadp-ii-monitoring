-- Migration 290: Operational "Zone" on enterprises (Maseru district only).
--
-- 4D's field team groups Maseru beneficiaries into 8 monitoring Zones, each a
-- cluster of nearby villages (see the "Zones" block in the SADP-II Master
-- Check List). Zones let the team plan field visits and sort/filter the
-- enterprise list by travel cluster.
--
-- Notes:
--   - smallint 1..8, nullable. NULL = "Unzoned" (a village the Zone list
--     doesn't cover, or a non-Maseru district — zoning is Maseru-only).
--   - Manually editable per-enterprise from the Details tab, so the field
--     team can correct an auto-assigned zone.

ALTER TABLE public.enterprises
  ADD COLUMN IF NOT EXISTS zone smallint;

ALTER TABLE public.enterprises
  DROP CONSTRAINT IF EXISTS enterprises_zone_range;

ALTER TABLE public.enterprises
  ADD CONSTRAINT enterprises_zone_range
    CHECK (zone IS NULL OR (zone BETWEEN 1 AND 8));

CREATE INDEX IF NOT EXISTS idx_enterprises_zone
  ON public.enterprises (zone) WHERE zone IS NOT NULL;

COMMENT ON COLUMN public.enterprises.zone IS
  'Maseru-only monitoring Zone (1-8): a cluster of nearby villages used by the '
  'field team for visit planning. NULL = Unzoned / non-Maseru district.';
