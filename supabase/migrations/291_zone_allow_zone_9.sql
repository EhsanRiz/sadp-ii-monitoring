-- Migration 291: extend the Maseru monitoring Zone range from 1-8 to 1-9.
--
-- The field team added Zone 9 (Semonkong) to the SADP-II zoning. The `zone`
-- column (migration 290) was constrained to 1-8; relax it to 1-9 so Zone 9
-- can be assigned. Idempotent: drops the existing constraint if present and
-- re-adds the widened one.

ALTER TABLE public.enterprises
  DROP CONSTRAINT IF EXISTS enterprises_zone_range;

ALTER TABLE public.enterprises
  ADD CONSTRAINT enterprises_zone_range
    CHECK (zone IS NULL OR (zone BETWEEN 1 AND 9));

COMMENT ON COLUMN public.enterprises.zone IS
  'Maseru-only monitoring Zone (1-9): a cluster of nearby villages used by the '
  'field team for visit planning. NULL = Unzoned / non-Maseru district.';
