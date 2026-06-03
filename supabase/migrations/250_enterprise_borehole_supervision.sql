-- 250_enterprise_borehole_supervision.sql
-- Add a jsonb column to track Borehole Supervision milestone progress per enterprise.
--
-- Shape:
--   {
--     "drilling_permit":          { "done": true,  "date": "2026-04-12" },
--     "borehole_drilling":        { "done": false },
--     "borehole_casing":          { "done": false },
--     "borehole_yield_test":      { "done": false },
--     "borehole_drilling_report": { "done": false },
--     "water_use_permit":         { "done": false },
--     "notes": "optional free text"
--   }
--
-- Stored on enterprises so the matrix dashboards can join in one read without
-- a separate table — same pattern as enterprises.lifecycle_status.
ALTER TABLE enterprises
  ADD COLUMN IF NOT EXISTS borehole_supervision jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN enterprises.borehole_supervision IS
  'Per-enterprise borehole supervision milestone tracker. See src/forms/boreholeSupervisionSchema.ts for the canonical shape.';
