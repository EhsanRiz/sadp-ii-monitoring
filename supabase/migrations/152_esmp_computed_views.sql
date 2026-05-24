-- 152_esmp_computed_views.sql
-- Two views the UI consumes to surface aggregate ESMP + Milestone-1 readiness
-- state without re-computing the same logic per enterprise.
--
-- Both views use security_invoker = on so they respect the caller's RLS rather
-- than running with view-owner permissions (advisor: 0010_security_definer_view).
--
-- These DO NOT replace enterprises.esmp_status (which keeps a 'completed_uploaded'
-- legacy fallback for paper-scanned ESMPs). They complement it.

-- ---------------------------------------------------------------------------
-- enterprise_esmp_status — derived from essf_submissions + emmp_submissions
-- Status values:
--   'complete'     — both ESSF and EMMP approved
--   'in_progress'  — at least one submission exists, not yet both approved
--   'legacy_pdf'   — paper ESMP uploaded via esmp_uploaded_pdf_url
--   'not_started'  — nothing yet
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.enterprise_esmp_status AS
SELECT
  e.id            AS enterprise_id,
  e.organization_id,
  CASE
    WHEN ess.status = 'approved' AND emm.status = 'approved'  THEN 'complete'
    WHEN ess.id IS NOT NULL OR emm.id IS NOT NULL              THEN 'in_progress'
    WHEN e.esmp_uploaded_pdf_url IS NOT NULL                   THEN 'legacy_pdf'
    ELSE 'not_started'
  END AS computed_status,
  ess.id          AS essf_submission_id,
  ess.status      AS essf_status,
  emm.id          AS emmp_submission_id,
  emm.status      AS emmp_status,
  emm.template_id AS emmp_template_id
FROM public.enterprises e
LEFT JOIN public.essf_submissions ess ON ess.enterprise_id = e.id
LEFT JOIN public.emmp_submissions emm ON emm.enterprise_id = e.id;

ALTER VIEW public.enterprise_esmp_status SET (security_invoker = on);
GRANT SELECT ON public.enterprise_esmp_status TO authenticated;

-- ---------------------------------------------------------------------------
-- enterprise_m1_ready — composite Milestone-1 readiness flag
-- Phase 2 definition: cover-page-ready AND ESSF approved AND EMMP approved.
-- Phase 3 will expand this to also require the other M1 attachments
-- (Narrative Report, Cashbook, Financial Report, Bank docs, Procurement docs)
-- once those are modelled.
--
-- NULL-safe: any missing status counts as "not approved" instead of NULL.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.enterprise_m1_ready AS
SELECT
  e.id            AS enterprise_id,
  e.organization_id,
  e.beneficiary_short_name,
  (
    e.registration_completeness = 'cover_page_ready'
    AND COALESCE(ess.status, '') = 'approved'
    AND COALESCE(emm.status, '') = 'approved'
  ) AS m1_ready,
  e.registration_completeness = 'cover_page_ready' AS cover_page_ready,
  COALESCE(ess.status, 'missing') AS essf_status,
  COALESCE(emm.status, 'missing') AS emmp_status
FROM public.enterprises e
LEFT JOIN public.essf_submissions ess ON ess.enterprise_id = e.id
LEFT JOIN public.emmp_submissions emm ON emm.enterprise_id = e.id;

ALTER VIEW public.enterprise_m1_ready SET (security_invoker = on);
GRANT SELECT ON public.enterprise_m1_ready TO authenticated;

-- ---------------------------------------------------------------------------
-- Clean up Phase 1 RLS helpers: switch from SECURITY DEFINER to SECURITY
-- INVOKER (they only read auth.jwt(), which authenticated can already do)
-- to silence the advisor warnings.
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.current_user_org_id()   SECURITY INVOKER;
ALTER FUNCTION public.current_user_role()     SECURITY INVOKER;
ALTER FUNCTION public.is_super_admin()        SECURITY INVOKER;
