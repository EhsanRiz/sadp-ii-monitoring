-- 450_mgp_contract_toplevel.sql
--
-- Reshape of mgp_tracking.stage_finances (jsonb — no DDL):
--
--  1. Contract value becomes a SINGLE enterprise-level figure, not split across
--     milestones. It moves from `m1/m2.{sadp_contract_lsl, farmer_contract_lsl}`
--     to a top-level `contract: { sadp_lsl, farmer_lsl }`. Standard programme
--     contract is M500,000 (SADP M400,000 + farmer M100,000).
--
--  2. Each milestone gains an optional `sadp_returns` array capturing the rounds
--     where SADP returned the report with queries:
--       [{ returned_date, queries, resubmitted_date }, ...]
--     This is additive — no backfill needed; the app writes it on save.
--
-- This script is ADDITIVE: it adds the top-level `contract` computed by summing
-- the existing per-milestone contract fields, and leaves the old per-milestone
-- keys in place so the previously-deployed app keeps rendering until the new
-- build ships. The app's serializer drops the stale per-milestone contract keys
-- the next time each enterprise's finances are saved.
--
-- session_replication_role = replica suppresses the mgp_finance_log trigger so
-- this one-time baseline reshape does not flood the admin "Contribution changes"
-- log with hundreds of entries.

set session_replication_role = replica;

update public.mgp_tracking t
set stage_finances =
  (coalesce(t.stage_finances, '{}'::jsonb) - 'contract')
  || jsonb_build_object('contract', jsonb_build_object(
       'sadp_lsl', nullif(coalesce((t.stage_finances->'m1'->>'sadp_contract_lsl')::numeric, 0)
                         + coalesce((t.stage_finances->'m2'->>'sadp_contract_lsl')::numeric, 0), 0),
       'farmer_lsl', nullif(coalesce((t.stage_finances->'m1'->>'farmer_contract_lsl')::numeric, 0)
                           + coalesce((t.stage_finances->'m2'->>'farmer_contract_lsl')::numeric, 0), 0)
     ))
where t.stage_finances is not null;

set session_replication_role = default;
