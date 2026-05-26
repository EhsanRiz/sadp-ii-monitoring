-- 190_m1_source_pdf_columns.sql
-- Track the SOURCE M1 PDF that the auto-extraction edge function reads from.
-- This is distinct from m1_supporting_documents — those are attachments to
-- the M1 submission (bank statements, invoices). The source PDF is the
-- original report we're extracting INTO the digital m1_submissions row.
--
-- Storage path convention: m1-supporting-docs/<enterprise_id>/_source.pdf
-- The leading "_source" prefix keeps it out of the supporting-doc UUID
-- namespace. Existing bucket RLS already covers this path (path's first
-- segment is the enterprise_id, same as supporting docs).

ALTER TABLE public.m1_submissions
  ADD COLUMN uploaded_pdf_path text,
  ADD COLUMN uploaded_pdf_uploaded_at timestamptz;

COMMENT ON COLUMN public.m1_submissions.uploaded_pdf_path IS
  'Storage path (bucket: m1-supporting-docs) of the source M1 report PDF, if any. Set on upload, read by extract-m1-pdf edge function. Distinct from imported_from_pdf_path which is set AFTER a successful extraction.';

COMMENT ON COLUMN public.m1_submissions.uploaded_pdf_uploaded_at IS
  'When uploaded_pdf_path was last set. Updated on re-upload.';
