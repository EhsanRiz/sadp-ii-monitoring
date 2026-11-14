-- =============================================================================
-- 420 — expose service_provider_name through the tracker's enterprise catalog
--
-- Adds a `service_provider` column to mgp_enterprise_catalog() so the tracker
-- can filter enterprises by service provider. Dropping first because
-- CREATE OR REPLACE cannot change a function's TABLE return columns.
-- =============================================================================

DROP FUNCTION IF EXISTS public.mgp_enterprise_catalog();

CREATE FUNCTION public.mgp_enterprise_catalog()
RETURNS TABLE (
  enterprise_id uuid, name text, organisation_name text, district text,
  enterprise_type text, community_council text, phone text, service_provider text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT e.id,
         coalesce(nullif(e.beneficiary_short_name,''), e.applicant_organisation_name),
         e.applicant_organisation_name,
         d.name, et.name, cc.name, e.beneficiary_contact_phone,
         nullif(trim(e.service_provider_name), '')
    FROM public.enterprises e
    JOIN public.organizations o ON o.id = e.organization_id AND o.code = '4D'
    LEFT JOIN public.districts d ON d.id = e.district_id
    LEFT JOIN public.enterprise_types et ON et.id = e.enterprise_type_id
    LEFT JOIN public.community_councils cc ON cc.id = e.community_council_id
   WHERE public.mgp_is_member()
     AND NOT EXISTS (SELECT 1 FROM public.mgp_excluded x WHERE x.enterprise_id = e.id)
   ORDER BY 2
$$;

REVOKE ALL ON FUNCTION public.mgp_enterprise_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mgp_enterprise_catalog() TO authenticated;
