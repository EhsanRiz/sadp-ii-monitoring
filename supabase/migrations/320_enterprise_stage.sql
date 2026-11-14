-- 320_enterprise_stage.sql
-- Enterprise macro-stage: where each enterprise sits on the
-- M1 -> M2 -> Graduated journey. Agreed from the team lifecycle whiteboard and
-- the Round 3 contribution sheets. This is the single field that answers
-- "which farmers are in which stage" and powers the enterprise-list stage
-- filter + the per-enterprise journey view.
--
-- Relationship to the existing 11-milestone tracker (migration 210+): the
-- lifecycle_status jsonb details the *M1 preparation steps* and stays as-is.
-- This adds the coarse stage pointer that sits above it.
--
-- It is an explicit, editable column (not derived) so staff can always see and
-- correct it. A later migration adds the per-stage money records; a future rule
-- can auto-advance this field when an M1/M2 report is approved, while leaving
-- it manually overridable.
--
-- Backfill: every existing (Round 3) enterprise defaults to 'm1'. Enterprises
-- already at M2 in the field are set either by staff in the UI or by the
-- Round 3 import (a later step) — we deliberately do NOT guess the stage here.

ALTER TABLE public.enterprises
  ADD COLUMN IF NOT EXISTS lifecycle_stage text NOT NULL DEFAULT 'm1'
    CHECK (lifecycle_stage IN ('m1', 'm2', 'graduated'));

COMMENT ON COLUMN public.enterprises.lifecycle_stage IS
  'Macro lifecycle stage on the M1 -> M2 -> Graduated journey. '
  'Values: m1 | m2 | graduated. Defaults to m1 for the current (Round 3) cohort. '
  'Editable by staff; later steps add per-stage money records and optional '
  'auto-advance on report approval.';

-- Supports the enterprise-list "filter by stage" query (org-scoped).
CREATE INDEX IF NOT EXISTS idx_enterprises_stage
  ON public.enterprises (organization_id, lifecycle_stage);
