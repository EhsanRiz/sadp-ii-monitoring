-- 200_bump_pdf_bucket_size_limit.sql
-- Bump per-bucket file_size_limit from 50MB to 100MB for both PDF buckets.
-- An M1 report PDF with 30+ pages of scanned supplier receipts can exceed 10MB
-- easily; the 50MB cap was a Phase-1 default that's becoming the binding limit.
--
-- NOTE: this is the BUCKET-level limit. Supabase also enforces a PROJECT-level
-- "Upload file size limit" set via the dashboard (Settings → Storage). If the
-- project-level limit is lower than the bucket limit, the project-level wins.
-- If uploads above 5–6MB still fail after this migration, bump the project
-- setting at:
--   https://supabase.com/dashboard/project/urvecgqgxjwlznltjeap/settings/storage

UPDATE storage.buckets
SET file_size_limit = 104857600 -- 100 MB
WHERE id IN ('esmp-pdfs', 'm1-supporting-docs');
