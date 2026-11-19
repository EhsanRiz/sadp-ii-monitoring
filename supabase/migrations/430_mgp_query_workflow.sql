-- 430 — Query-handling workflow for SADP queries.
--
-- A SADP query (mgp_actions where kind = 'sadp_query') moves through:
--   raised (by SADP) -> addressing (by 4D) -> responded (back to SADP, with reasoning).
-- Columns are nullable; a null status means "raised" (an existing / newly raised query).
-- They inherit mgp_actions' row-level security.
ALTER TABLE public.mgp_actions
  ADD COLUMN IF NOT EXISTS query_status text
    CHECK (query_status IS NULL OR query_status IN ('raised', 'addressing', 'responded')),
  ADD COLUMN IF NOT EXISTS query_reasoning text;
