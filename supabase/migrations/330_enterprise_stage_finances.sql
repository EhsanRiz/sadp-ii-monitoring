-- 330_enterprise_stage_finances.sql
-- Step 2 of the enterprise lifecycle feature: the money tracked at each stage.
--
-- Per the team's Round 3 contribution + SADP budget sheets, each enterprise
-- tracks, FOR EACH stage (M1 and M2), three money blocks:
--   * Farmer (counterpart) contribution — contract amount, contributed to date
--     (variance = contract - contributed, computed in the app).
--   * SADP side / Budget Allocation (BA) — amount contributed, BA status
--     (pending | submitted | approved | partially_paid) + submission date.
--   * Funds — allocated, depleted to date, "yet to report" (disbursed but not
--     yet accounted), plus the stage report status (pending | submitted |
--     approved) and its date.
--
-- Stored as a jsonb column on the enterprise, keyed by stage — the SAME proven
-- pattern as lifecycle_status (migration 210) and borehole_supervision
-- (migration 250). This means edits ride the existing offline save path
-- (enterprise_patch -> saveOrEnqueue) with no new sync plumbing, so the money
-- is editable offline on a field tablet and syncs when back online.
--
-- Shape:
--   {
--     "m1": {
--       "farmer_contract_lsl": 100000, "farmer_contributed_lsl": 40000,
--       "sadp_contributed_lsl": 0,
--       "ba_status": "approved", "ba_submitted_date": "2026-10-28",
--       "funds_allocated_lsl": 160000, "funds_depleted_lsl": 100000,
--       "yet_to_report_lsl": 60000,
--       "report_status": "pending", "report_date": null
--     },
--     "m2": { ... }
--   }
-- Missing keys / stages mean "not tracked yet". All amounts are Maloti (LSL).
--
-- A later migration (step 4) adds an enterprise_stage_finance VIEW that flattens
-- this jsonb into columns for the dashboard rollups — mirroring the
-- enterprise_lifecycle view.

ALTER TABLE public.enterprises
  ADD COLUMN IF NOT EXISTS stage_finances jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.enterprises.stage_finances IS
  'Per-stage money tracking (M1/M2): farmer & SADP contributions, budget '
  'allocation, fund depletion, and stage report status. jsonb keyed by stage '
  '(m1/m2). Amounts in Maloti (LSL). Edited offline via the enterprise_patch '
  'save path; flattened by the enterprise_stage_finance view for reporting.';
