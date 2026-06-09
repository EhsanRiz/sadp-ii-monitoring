-- Migration 283: Extend enterprise_timeline view to include monitoring_visits.
--
-- The History tab on EnterpriseDetailPage reads this view. Adding monitoring
-- visit creation + submission as named events keeps History the single source
-- of truth for "what happened on this enterprise."

DROP VIEW IF EXISTS public.enterprise_timeline CASCADE;

CREATE VIEW public.enterprise_timeline
WITH (security_invoker = on)
AS
SELECT
  ('ent:' || e.id::text || ':created')             AS id,
  e.id                                             AS enterprise_id,
  e.created_at                                     AS occurred_at,
  'enterprise'                                     AS category,
  'created'                                        AS event_type,
  NULL::uuid                                       AS actor_id,
  NULL::text                                       AS source_pdf_path,
  'Enterprise created'                             AS description
FROM public.enterprises e

UNION ALL
SELECT ('essf:' || s.id::text || ':created'),
  s.enterprise_id, s.created_at, 'essf', 'created', s.filled_by, s.imported_from_pdf_path,
  CASE WHEN s.imported_from_pdf_path IS NOT NULL
    THEN 'ESSF draft auto-imported from PDF' ELSE 'ESSF draft created' END
FROM public.essf_submissions s
UNION ALL
SELECT ('essf:' || s.id::text || ':submitted'),
  s.enterprise_id, s.submitted_at, 'essf', 'submitted', s.filled_by, NULL,
  'ESSF submitted for approval'
FROM public.essf_submissions s WHERE s.submitted_at IS NOT NULL
UNION ALL
SELECT ('essf:' || s.id::text || ':approved'),
  s.enterprise_id, s.approved_at, 'essf', 'approved', s.approved_by, NULL,
  'ESSF approved'
FROM public.essf_submissions s WHERE s.approved_at IS NOT NULL

UNION ALL
SELECT ('emmp:' || s.id::text || ':created'),
  s.enterprise_id, s.created_at, 'emmp', 'created', s.filled_by, s.imported_from_pdf_path,
  CASE WHEN s.imported_from_pdf_path IS NOT NULL
    THEN 'EMMP draft auto-imported from PDF' ELSE 'EMMP draft created' END
FROM public.emmp_submissions s
UNION ALL
SELECT ('emmp:' || s.id::text || ':submitted'),
  s.enterprise_id, s.submitted_at, 'emmp', 'submitted', s.filled_by, NULL,
  'EMMP submitted for approval'
FROM public.emmp_submissions s WHERE s.submitted_at IS NOT NULL
UNION ALL
SELECT ('emmp:' || s.id::text || ':approved'),
  s.enterprise_id, s.approved_at, 'emmp', 'approved', s.approved_by, NULL,
  'EMMP approved'
FROM public.emmp_submissions s WHERE s.approved_at IS NOT NULL

UNION ALL
SELECT ('insp:' || s.id::text || ':created'),
  s.enterprise_id, s.created_at, 'inspection', 'created', s.filled_by, s.imported_from_pdf_path,
  CASE WHEN s.imported_from_pdf_path IS NOT NULL
    THEN 'Inspection visit auto-imported from PDF (' || to_char(s.visit_date, 'DD/MM/YYYY') || ')'
    ELSE 'Inspection visit created (' || to_char(s.visit_date, 'DD/MM/YYYY') || ')' END
FROM public.inspection_visits s
UNION ALL
SELECT ('insp:' || s.id::text || ':submitted'),
  s.enterprise_id, s.submitted_at, 'inspection', 'submitted', s.filled_by, NULL,
  'Inspection visit submitted for approval'
FROM public.inspection_visits s WHERE s.submitted_at IS NOT NULL
UNION ALL
SELECT ('insp:' || s.id::text || ':approved'),
  s.enterprise_id, s.approved_at, 'inspection', 'approved', s.approved_by, NULL,
  'Inspection visit approved'
FROM public.inspection_visits s WHERE s.approved_at IS NOT NULL

UNION ALL
SELECT ('m1:' || s.id::text || ':created'),
  s.enterprise_id, s.created_at, 'm1', 'created', s.filled_by, s.imported_from_pdf_path,
  CASE WHEN s.imported_from_pdf_path IS NOT NULL
    THEN 'M1 draft auto-imported from PDF' ELSE 'M1 draft created' END
FROM public.m1_submissions s
UNION ALL
SELECT ('m1:' || s.id::text || ':submitted'),
  s.enterprise_id, s.submitted_at, 'm1', 'submitted', s.filled_by, NULL,
  'M1 report submitted for approval'
FROM public.m1_submissions s WHERE s.submitted_at IS NOT NULL
UNION ALL
SELECT ('m1:' || s.id::text || ':approved'),
  s.enterprise_id, s.approved_at, 'm1', 'approved', s.approved_by, NULL,
  'M1 report approved'
FROM public.m1_submissions s WHERE s.approved_at IS NOT NULL
UNION ALL
SELECT ('m1:' || s.id::text || ':pdf_uploaded'),
  s.enterprise_id, s.uploaded_pdf_uploaded_at, 'm1', 'pdf_uploaded', s.filled_by, s.uploaded_pdf_path,
  'M1 source PDF uploaded'
FROM public.m1_submissions s WHERE s.uploaded_pdf_uploaded_at IS NOT NULL

UNION ALL
SELECT ('doc:' || d.id::text || ':uploaded'),
  d.enterprise_id, d.uploaded_at, 'm1_doc', 'uploaded', d.uploaded_by, d.storage_path,
  'Supporting document uploaded (' || d.kind || COALESCE(' — ' || d.original_filename, '') || ')'
FROM public.m1_supporting_documents d

UNION ALL
-- Monitoring visits — NEW in migration 283
SELECT ('mv:' || v.id::text || ':created'),
  v.enterprise_id, v.created_at, 'monitoring', 'created', v.conducted_by_user_id, NULL,
  'Monitoring visit recorded (' || to_char(v.visit_date, 'DD/MM/YYYY') || ' — ' || v.visit_type || ')'
FROM public.monitoring_visits v
UNION ALL
SELECT ('mv:' || v.id::text || ':submitted'),
  v.enterprise_id, v.submitted_at, 'monitoring', 'submitted', v.conducted_by_user_id, NULL,
  'Monitoring visit finalised (' || to_char(v.visit_date, 'DD/MM/YYYY') || ')'
FROM public.monitoring_visits v WHERE v.submitted_at IS NOT NULL

UNION ALL
SELECT ('mvp:' || p.id::text || ':uploaded'),
  p.enterprise_id, p.uploaded_at, 'monitoring', 'pdf_uploaded', p.uploaded_by, p.storage_path,
  'Monitoring visit photo uploaded'
FROM public.monitoring_visit_photos p;

GRANT SELECT ON public.enterprise_timeline TO anon, authenticated;
