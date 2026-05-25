-- Adds columns to essf_submissions and emmp_submissions to track when a
-- submission was auto-populated from an uploaded scanned PDF via the
-- extract-esmp-pdf edge function. The UI uses these to render a "review
-- before submitting" banner — review is mandatory because Claude's
-- structured extraction is not 100% accurate on scanned/handwritten forms.

ALTER TABLE essf_submissions
  ADD COLUMN imported_from_pdf_path text,
  ADD COLUMN imported_at timestamptz,
  ADD COLUMN import_notes jsonb;

COMMENT ON COLUMN essf_submissions.imported_from_pdf_path IS
  'Storage path (bucket: esmp-pdfs) of the source PDF if this submission was auto-populated.';
COMMENT ON COLUMN essf_submissions.imported_at IS
  'When the auto-extraction ran. NULL means hand-entered.';
COMMENT ON COLUMN essf_submissions.import_notes IS
  'Array of {field, note, confidence} objects from Claude — surfaced as review checklist on the edit page.';

ALTER TABLE emmp_submissions
  ADD COLUMN imported_from_pdf_path text,
  ADD COLUMN imported_at timestamptz,
  ADD COLUMN import_notes jsonb;

COMMENT ON COLUMN emmp_submissions.imported_from_pdf_path IS
  'Storage path (bucket: esmp-pdfs) of the source PDF if this submission was auto-populated.';
COMMENT ON COLUMN emmp_submissions.imported_at IS
  'When the auto-extraction ran. NULL means hand-entered.';
COMMENT ON COLUMN emmp_submissions.import_notes IS
  'Array of {field, note, confidence} objects from Claude — surfaced as review checklist on the edit page.';
