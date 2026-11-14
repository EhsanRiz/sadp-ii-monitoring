-- 340_finance_rollup_view.sql
-- Step 4 (dashboard rollups): flatten the per-stage stage_finances jsonb into a
-- per-district aggregate for the dashboard — mirrors how enterprise_lifecycle
-- flattens lifecycle_status. security_invoker = on, so RLS on enterprises
-- decides what each user sees.
--
-- Amounts are summed across both stages (m1 + m2) per enterprise, so a district
-- total reflects the whole cohort's money regardless of stage.

DROP VIEW IF EXISTS public.district_finance_rollup;

CREATE VIEW public.district_finance_rollup AS
SELECT
  d.id   AS district_id,
  d.name AS district,
  count(e.id)                                            AS enterprises,
  count(e.id) FILTER (WHERE e.stage_finances <> '{}'::jsonb) AS tracked,
  count(e.id) FILTER (WHERE e.lifecycle_stage = 'm1')        AS in_m1,
  count(e.id) FILTER (WHERE e.lifecycle_stage = 'm2')        AS in_m2,
  count(e.id) FILTER (WHERE e.lifecycle_stage = 'graduated') AS graduated,
  -- Farmer (counterpart) contribution, summed across stages
  COALESCE(SUM(
    COALESCE((e.stage_finances->'m1'->>'farmer_contract_lsl')::numeric, 0) +
    COALESCE((e.stage_finances->'m2'->>'farmer_contract_lsl')::numeric, 0)
  ), 0) AS farmer_contract,
  COALESCE(SUM(
    COALESCE((e.stage_finances->'m1'->>'farmer_contributed_lsl')::numeric, 0) +
    COALESCE((e.stage_finances->'m2'->>'farmer_contributed_lsl')::numeric, 0)
  ), 0) AS farmer_contributed,
  -- SADP funds disbursed but not yet reported (fund-depletion in progress)
  COALESCE(SUM(
    COALESCE((e.stage_finances->'m1'->>'yet_to_report_lsl')::numeric, 0) +
    COALESCE((e.stage_finances->'m2'->>'yet_to_report_lsl')::numeric, 0)
  ), 0) AS yet_to_report
FROM public.enterprises e
JOIN public.districts d ON d.id = e.district_id
GROUP BY d.id, d.name;

ALTER VIEW public.district_finance_rollup SET (security_invoker = on);
GRANT SELECT ON public.district_finance_rollup TO anon, authenticated;
