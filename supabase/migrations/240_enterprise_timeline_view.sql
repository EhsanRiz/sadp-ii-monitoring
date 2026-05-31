-- Aggregates events across all enterprise-scoped tables into a single
-- timeline view, ordered by occurred_at desc. This is the data source for the
-- History tab.
--
-- security_invoker = on so RLS on the underlying tables decides what each
-- user sees. Service-role / super_admin can still read across orgs.
--
-- "Option (b)" approach per the architecture decision — aggregate from
-- existing timestamp columns, no new DB triggers. Trades richness (no per-
-- field diffs) for shipping speed. audit_log already captures field-level
-- changes on enterprises; this view is the named-event layer on top.

DROP VIEW IF EXISTS public.enterprise_timeline CASCADE;

CREATE VIEW public.enterprise_timeline
WITH (security_invoker = on)
AS
-- Enterprise itself: created
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
-- ESSF events
SELECT
  ('essf:' || s.id::text || ':created') AS id,
  s.enterprise_id, s.created_at,
  'essf', 'created', s.filled_by, s.imported_from_pdf_path,
  CASE
    WHEN s.imported_from_pdf_path IS NOT NULL
      THEN 'ESSF draft auto-imported from PDF'
    ELSE 'ESSF draft created'
  END
FROM public.essf_submissions s
UNION ALL
SELECT
  ('essf:' || s.id::text || ':submitted'),
  s.enterprise_id, s.submitted_at,
  'essf', 'submitted', s.filled_by, NULL,
  'ESSF submitted for approval'
FROM public.essf_submissions s WHERE s.submitted_at IS NOT NULL
UNION ALL
SELECT
  ('essf:' || s.id::text || ':approved'),
  s.enterprise_id, s.approved_at,
  'essf', 'approved', s.approved_by, NULL,
  'ESSF approved'
FROM public.essf_submissions s WHERE s.approved_at IS NOT NULL

UNION ALL
-- EMMP events
SELECT
  ('emmp:' || s.id::text || ':created'),
  s.enterprise_id, s.created_at,
  'emmp', 'created', s.filled_by, s.imported_from_pdf_path,
  CASE
    WHEN s.imported_from_pdf_path IS NOT NULL
      THEN 'EMMP draft auto-imported from PDF'
    ELSE 'EMMP draft created'
  END
FROM public.emmp_submissions s
UNION ALL
SELECT
  ('emmp:' || s.id::text || ':submitted'),
  s.enterprise_id, s.submitted_at,
  'emmp', 'submitted', s.filled_by, NULL,
  'EMMP submitted for approval'
FROM public.emmp_submissions s WHERE s.submitted_at IS NOT NULL
UNION ALL
SELECT
  ('emmp:' || s.id::text || ':approved'),
  s.enterprise_id, s.approved_at,
  'emmp', 'approved', s.approved_by, NULL,
  'EMMP approved'
FROM public.emmp_submissions s WHERE s.approved_at IS NOT NULL

UNION ALL
-- Inspection visits
SELECT
  ('insp:' || s.id::text || ':created'),
  s.enterprise_id, s.created_at,
  'inspection', 'created', s.filled_by, s.imported_from_pdf_path,
  CASE
    WHEN s.imported_from_pdf_path IS NOT NULL
      THEN 'Inspection visit auto-imported from PDF (' || to_char(s.visit_date, 'DD/MM/YYYY') || ')'
    ELSE 'Inspection visit created (' || to_char(s.visit_date, 'DD/MM/YYYY') || ')'
  END
FROM public.inspection_visits s
UNION ALL
SELECT
  ('insp:' || s.id::text || ':submitted'),
  s.enterprise_id, s.submitted_at,
  'inspection', 'submitted', s.filled_by, NULL,
  'Inspection visit submitted for approval'
FROM public.inspection_visits s WHERE s.submitted_at IS NOT NULL
UNION ALL
SELECT
  ('insp:' || s.id::text || ':approved'),
  s.enterprise_id, s.approved_at,
  'inspection', 'approved', s.approved_by, NULL,
  'Inspection visit approved'
FROM public.inspection_visits s WHERE s.approved_at IS NOT NULL

UNION ALL
-- M1 events
SELECT
  ('m1:' || s.id::text || ':created'),
  s.enterprise_id, s.created_at,
  'm1', 'created', s.filled_by, s.imported_from_pdf_path,
  CASE
    WHEN s.imported_from_pdf_path IS NOT NULL
      THEN 'M1 draft auto-imported from PDF'
    ELSE 'M1 draft created'
  END
FROM public.m1_submissions s
UNION ALL
SELECT
  ('m1:' || s.id::text || ':submitted'),
  s.enterprise_id, s.submitted_at,
  'm1', 'submitted', s.filled_by, NULL,
  'M1 report submitted for approval'
FROM public.m1_submissions s WHERE s.submitted_at IS NOT NULL
UNION ALL
SELECT
  ('m1:' || s.id::text || ':approved'),
  s.enterprise_id, s.approved_at,
  'm1', 'approved', s.approved_by, NULL,
  'M1 report approved'
FROM public.m1_submissions s WHERE s.approved_at IS NOT NULL
UNION ALL
SELECT
  ('m1:' || s.id::text || ':pdf_uploaded'),
  s.enterprise_id, s.uploaded_pdf_uploaded_at,
  'm1', 'pdf_uploaded', s.filled_by, s.uploaded_pdf_path,
  'M1 source PDF uploaded'
FROM public.m1_submissions s WHERE s.uploaded_pdf_uploaded_at IS NOT NULL

UNION ALL
-- M1 supporting documents
SELECT
  ('doc:' || d.id::text || ':uploaded'),
  d.enterprise_id, d.uploaded_at,
  'm1_doc', 'uploaded', d.uploaded_by, d.storage_path,
  'Supporting document uploaded (' || d.kind || COALESCE(' — ' || d.original_filename, '') || ')'
FROM public.m1_supporting_documents d;

GRANT SELECT ON public.enterprise_timeline TO anon, authenticated;
