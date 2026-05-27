-- ====================================================================
-- Migration 210: Enterprise lifecycle status (11 RSDA-style milestones)
-- ====================================================================
-- Adds enterprises.lifecycle_status jsonb to track the 6 manual milestones
-- from the RSDA Master Sheet that aren't derivable from existing data, and
-- creates the enterprise_lifecycle view that merges them with the 5 derived
-- milestones into a single 11-column ✓/×/N/A matrix.
--
-- Milestone IDs (in RSDA column order):
--   1.  contracts_signed         (DERIVED) — both principal_applicant_signed_date
--                                            and service_provider_signed_date set
--   2.  contract_available       (MANUAL)  — was the signed contract PDF received
--   3.  beneficiary_contributed  (MANUAL)  — beneficiary's cash contribution received
--   4.  sadp_contributed         (DERIVED) — current_grant_payment_lsl > 0
--   5.  business_plan            (DERIVED) — business_plan_status IN
--                                            ('done_validated', 'validated_submitted')
--   6.  esmp                     (DERIVED) — both ESSF and EMMP submissions approved
--   7.  verified_borehole_site   (MANUAL)  — pre-drilling site verification done
--   8.  budget_transfer          (MANUAL)  — M1 budget approved + funds transferred
--   9.  supervision              (MANUAL)  — drilling + site clearing supervised
--   10. procurement              (MANUAL)  — equipment + materials procured
--   11. m1_submitted             (DERIVED) — m1_submissions.status IN
--                                            ('submitted', 'approved')
--
-- Stored values for the 6 manual ones: 'yes' | 'no' | 'n_a' | NULL (not yet tracked).
-- Derived ones always return 'yes' or 'no' (never N/A, never NULL).

BEGIN;

-- ---------- Column ----------
ALTER TABLE enterprises
  ADD COLUMN IF NOT EXISTS lifecycle_status jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN enterprises.lifecycle_status IS
  'Manual portion of the RSDA 11-milestone tracker. Keys: contract_available, '
  'beneficiary_contributed, verified_borehole_site, budget_transfer, supervision, '
  'procurement. Values: yes | no | n_a. The other 5 milestones are derived in '
  'enterprise_lifecycle view.';

-- ---------- View ----------
DROP VIEW IF EXISTS enterprise_lifecycle;

CREATE VIEW enterprise_lifecycle AS
SELECT
  e.id              AS enterprise_id,
  e.organization_id,
  e.district_id,
  e.beneficiary_short_name,
  e.enterprise_type_id,
  -- Derived (5)
  CASE WHEN e.principal_applicant_signed_date IS NOT NULL
        AND e.service_provider_signed_date  IS NOT NULL
       THEN 'yes' ELSE 'no' END AS contracts_signed,
  CASE WHEN COALESCE(e.current_grant_payment_lsl, 0) > 0
       THEN 'yes' ELSE 'no' END AS sadp_contributed,
  CASE WHEN e.business_plan_status IN ('done_validated', 'validated_submitted')
       THEN 'yes' ELSE 'no' END AS business_plan,
  CASE WHEN ess.status = 'approved' AND emm.status = 'approved'
       THEN 'yes' ELSE 'no' END AS esmp,
  CASE WHEN m1.status IN ('submitted', 'approved')
       THEN 'yes' ELSE 'no' END AS m1_submitted,
  -- Manual (6) — pulled from the jsonb; NULL when not tracked yet
  NULLIF(e.lifecycle_status->>'contract_available',      '') AS contract_available,
  NULLIF(e.lifecycle_status->>'beneficiary_contributed', '') AS beneficiary_contributed,
  NULLIF(e.lifecycle_status->>'verified_borehole_site',  '') AS verified_borehole_site,
  NULLIF(e.lifecycle_status->>'budget_transfer',         '') AS budget_transfer,
  NULLIF(e.lifecycle_status->>'supervision',             '') AS supervision,
  NULLIF(e.lifecycle_status->>'procurement',             '') AS procurement
FROM enterprises e
LEFT JOIN essf_submissions ess ON ess.enterprise_id = e.id
LEFT JOIN emmp_submissions emm ON emm.enterprise_id = e.id
LEFT JOIN m1_submissions   m1  ON m1.enterprise_id  = e.id;

ALTER VIEW enterprise_lifecycle SET (security_invoker = on);

COMMIT;
