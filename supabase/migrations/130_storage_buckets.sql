-- 130_storage_buckets.sql
-- Two private buckets for the enterprise UI:
--   * esmp-pdfs   — scanned ESMP reports (50 MB max, application/pdf)
--   * signatures  — principal applicant / service provider / CGP officer
--                   signatures (5 MB max, PNG/JPG)
--
-- RLS scopes object access to org members of the enterprise the file belongs to.
-- File path conventions:
--   esmp-pdfs/{enterprise_id}.pdf
--   signatures/{enterprise_id}/{kind}.png
-- The leading path segment is used to look up the enterprise's org.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('esmp-pdfs',  'esmp-pdfs',  false, 52428800, ARRAY['application/pdf']::text[]),
  ('signatures', 'signatures', false, 5242880, ARRAY['image/png','image/jpeg','image/jpg']::text[])
ON CONFLICT (id) DO NOTHING;

-- esmp-pdfs ----------------------------------------------------------------
CREATE POLICY "esmp_pdfs_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'esmp-pdfs'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.enterprises e
        WHERE e.id::text = split_part(name, '.', 1)
          AND e.organization_id = public.current_user_org_id()
      )
    )
  );

CREATE POLICY "esmp_pdfs_write"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'esmp-pdfs'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.enterprises e
        WHERE e.id::text = split_part(name, '.', 1)
          AND e.organization_id = public.current_user_org_id()
          AND public.current_user_role() IN ('field_supervisor', 'me_officer')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'esmp-pdfs'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.enterprises e
        WHERE e.id::text = split_part(name, '.', 1)
          AND e.organization_id = public.current_user_org_id()
          AND public.current_user_role() IN ('field_supervisor', 'me_officer')
      )
    )
  );

-- signatures ---------------------------------------------------------------
CREATE POLICY "signatures_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.enterprises e
        WHERE e.id::text = split_part(name, '/', 1)
          AND e.organization_id = public.current_user_org_id()
      )
    )
  );

CREATE POLICY "signatures_write"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.enterprises e
        WHERE e.id::text = split_part(name, '/', 1)
          AND e.organization_id = public.current_user_org_id()
          AND public.current_user_role() IN ('field_supervisor', 'me_officer')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'signatures'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM public.enterprises e
        WHERE e.id::text = split_part(name, '/', 1)
          AND e.organization_id = public.current_user_org_id()
          AND public.current_user_role() IN ('field_supervisor', 'me_officer')
      )
    )
  );
