-- Mirrors migration 170 for the ESSF/EMMP tables: add audit columns so a
-- backfill-from-M1-binder action can stamp inspection_visits with the source
-- PDF + when + what the model said.
ALTER TABLE public.inspection_visits
  ADD COLUMN IF NOT EXISTS imported_from_pdf_path text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_notes jsonb;

COMMENT ON COLUMN public.inspection_visits.imported_from_pdf_path
  IS 'Storage path of the source PDF this inspection was auto-extracted from. NULL means manual entry.';
COMMENT ON COLUMN public.inspection_visits.imported_at
  IS 'When the auto-extraction wrote this draft. NULL means manual entry.';
COMMENT ON COLUMN public.inspection_visits.import_notes
  IS 'Array of {field, note, confidence} surfaced by Claude during extraction. NULL means manual entry.';
