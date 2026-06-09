-- Migration 282: Drop derivation for the last 2 milestones (esmp + m1_submitted).
--
-- All 11 milestones now read from enterprises.lifecycle_status jsonb. The user
-- decides when to mark each one Yes/No. The "Upload" pill on these two rows
-- in the editor is a NAVIGATION action (links to the ESMP / M1 module) — it
-- doesn't write a value, so we don't need any new columns or backing data.
--
-- This is a UX simplification: derived values surprised users when ESSF or
-- EMMP was approved out-of-band (e.g. through the backfill flow) and the
-- milestone flipped without anyone explicitly marking it. Now the user has
-- to mark it Yes themselves.
--
-- Existing app data in lifecycle_status['esmp'] / lifecycle_status['m1_submitted']
-- will start being respected (previously they were ignored because the view
-- computed those values).

DROP VIEW IF EXISTS public.enterprise_lifecycle;

CREATE VIEW public.enterprise_lifecycle AS
SELECT
  e.id                AS enterprise_id,
  e.organization_id,
  e.district_id,
  e.beneficiary_short_name,
  e.enterprise_type_id,
  NULLIF(e.lifecycle_status->>'contracts_signed',        '') AS contracts_signed,
  NULLIF(e.lifecycle_status->>'contract_available',      '') AS contract_available,
  NULLIF(e.lifecycle_status->>'beneficiary_contributed', '') AS beneficiary_contributed,
  NULLIF(e.lifecycle_status->>'sadp_contributed',        '') AS sadp_contributed,
  NULLIF(e.lifecycle_status->>'business_plan',           '') AS business_plan,
  NULLIF(e.lifecycle_status->>'esmp',                    '') AS esmp,
  NULLIF(e.lifecycle_status->>'verified_borehole_site',  '') AS verified_borehole_site,
  NULLIF(e.lifecycle_status->>'budget_transfer',         '') AS budget_transfer,
  NULLIF(e.lifecycle_status->>'supervision',             '') AS supervision,
  NULLIF(e.lifecycle_status->>'procurement',             '') AS procurement,
  NULLIF(e.lifecycle_status->>'m1_submitted',            '') AS m1_submitted
FROM public.enterprises e;

ALTER VIEW public.enterprise_lifecycle SET (security_invoker = on);

GRANT SELECT ON public.enterprise_lifecycle TO anon, authenticated;
