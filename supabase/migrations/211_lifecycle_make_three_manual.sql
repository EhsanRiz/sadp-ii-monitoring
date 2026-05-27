-- Migration 211: Move 3 lifecycle milestones from DERIVED to MANUAL.
--
-- Per user decision: contracts_signed, sadp_contributed, business_plan are
-- subtler than the derivation rules captured — they need explicit human
-- judgment (signature date set but contract not exchanged; grant payment
-- recorded but not cleared; business plan validated by system but pending
-- final partner sign-off).
--
-- After this migration: 2 derived milestones (esmp, m1_submitted — both
-- app-internal states), 9 manual milestones.

DROP VIEW IF EXISTS enterprise_lifecycle;

CREATE VIEW enterprise_lifecycle AS
SELECT
  e.id              AS enterprise_id,
  e.organization_id,
  e.district_id,
  e.beneficiary_short_name,
  e.enterprise_type_id,
  -- Derived (2)
  CASE WHEN ess.status = 'approved' AND emm.status = 'approved'
       THEN 'yes' ELSE 'no' END AS esmp,
  CASE WHEN m1.status IN ('submitted', 'approved')
       THEN 'yes' ELSE 'no' END AS m1_submitted,
  -- Manual (9)
  NULLIF(e.lifecycle_status->>'contracts_signed',        '') AS contracts_signed,
  NULLIF(e.lifecycle_status->>'contract_available',      '') AS contract_available,
  NULLIF(e.lifecycle_status->>'beneficiary_contributed', '') AS beneficiary_contributed,
  NULLIF(e.lifecycle_status->>'sadp_contributed',        '') AS sadp_contributed,
  NULLIF(e.lifecycle_status->>'business_plan',           '') AS business_plan,
  NULLIF(e.lifecycle_status->>'verified_borehole_site',  '') AS verified_borehole_site,
  NULLIF(e.lifecycle_status->>'budget_transfer',         '') AS budget_transfer,
  NULLIF(e.lifecycle_status->>'supervision',             '') AS supervision,
  NULLIF(e.lifecycle_status->>'procurement',             '') AS procurement
FROM enterprises e
LEFT JOIN essf_submissions ess ON ess.enterprise_id = e.id
LEFT JOIN emmp_submissions emm ON emm.enterprise_id = e.id
LEFT JOIN m1_submissions   m1  ON m1.enterprise_id  = e.id;

ALTER VIEW enterprise_lifecycle SET (security_invoker = on);
