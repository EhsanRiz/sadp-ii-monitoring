-- 470_mgp_action_milestone.sql
--
-- SADP queries now live inside each milestone tab (M1 / M2), so an action row
-- carries which milestone it belongs to. Nullable — general follow-ups
-- (kind='action') leave it null; only SADP queries are tagged.

ALTER TABLE public.mgp_actions
  ADD COLUMN IF NOT EXISTS milestone text CHECK (milestone IN ('m1','m2'));

-- Existing SADP queries predate per-milestone tagging; attach them to M1.
UPDATE public.mgp_actions SET milestone = 'm1' WHERE kind = 'sadp_query' AND milestone IS NULL;
