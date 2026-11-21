-- 460_mgp_depletion_queries.sql
--
-- Part A (DDL): SADP-query audit dates on mgp_actions + stamping/locking.
-- Part B (data): reshape mgp_tracking.stage_finances for the fixed-contract /
--   frozen-allocated / depletion-history model.
--
-- Queries live on mgp_actions (kind='sadp_query'): the row is both the query and
-- its redressal action (the checkbox stamps done_by/done_at). We add the two
-- audited dates — when SADP returned it, and when the response was sent back —
-- each locked once set, with who/when stamped on the sent-back.

-- ---------- Part A: query audit dates ----------------------------------------
ALTER TABLE public.mgp_actions
  ADD COLUMN IF NOT EXISTS sadp_received_date  date,
  ADD COLUMN IF NOT EXISTS sadp_sent_back_date date,
  ADD COLUMN IF NOT EXISTS sadp_sent_back_by   uuid REFERENCES public.mgp_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sadp_sent_back_at   timestamptz;

CREATE OR REPLACE FUNCTION public.mgp_actions_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(public.mgp_current_user_id(), NEW.created_by);
  END IF;
  IF NEW.assigned_to IS NULL AND NEW.owner IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.owner IS DISTINCT FROM OLD.owner) THEN
    NEW.assigned_to := (SELECT u.id FROM public.mgp_users u
                         WHERE u.is_active AND lower(trim(u.full_name)) = lower(trim(NEW.owner)) LIMIT 1);
  END IF;
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
    NEW.assigned_at := now();
    NEW.assigned_by := coalesce(public.mgp_current_user_id(), NEW.created_by);
    NEW.owner := (SELECT u.full_name FROM public.mgp_users u WHERE u.id = NEW.assigned_to);
  ELSIF NEW.assigned_to IS NULL AND TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT NULL THEN
    NEW.assigned_at := NULL;
    NEW.assigned_by := NULL;
    IF NEW.owner IS NOT DISTINCT FROM OLD.owner THEN NEW.owner := NULL; END IF;
  END IF;
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status <> 'done') THEN
    NEW.done_at := now();
    NEW.done_by := public.mgp_current_user_id();
  ELSIF NEW.status = 'open' THEN
    NEW.done_at := NULL;
    NEW.done_by := NULL;
  END IF;
  -- SADP query dates: once set, locked (immutable); stamp who/when on sent-back.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.sadp_received_date IS NOT NULL THEN
      NEW.sadp_received_date := OLD.sadp_received_date;
    END IF;
    IF OLD.sadp_sent_back_date IS NOT NULL THEN
      NEW.sadp_sent_back_date := OLD.sadp_sent_back_date;
      NEW.sadp_sent_back_by   := OLD.sadp_sent_back_by;
      NEW.sadp_sent_back_at   := OLD.sadp_sent_back_at;
    END IF;
  END IF;
  IF NEW.sadp_sent_back_date IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.sadp_sent_back_date IS NULL) THEN
    NEW.sadp_sent_back_at := now();
    NEW.sadp_sent_back_by := public.mgp_current_user_id();
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mgp_actions_before() FROM PUBLIC, anon, authenticated;

-- ---------- Part B: stage_finances reshape -----------------------------------
-- Run with triggers off so the one-time reshape doesn't flood mgp_finance_log.
-- (Applied operationally against the project; kept here for the record.)
--
-- set session_replication_role = replica;
--
-- -- contract: standard enterprises (SADP 400k + farmer 100k) → fixed split;
-- -- non-standard (e.g. Bohlale) left as their flat {sadp_lsl, farmer_lsl}.
-- update public.mgp_tracking
-- set stage_finances = jsonb_set(coalesce(stage_finances,'{}'::jsonb), '{contract}',
--   jsonb_build_object('m1', jsonb_build_object('sadp',160000,'farmer',40000),
--                      'm2', jsonb_build_object('sadp',240000,'farmer',60000)))
-- where (stage_finances->'contract'->>'sadp_lsl')='400000'
--   and (stage_finances->'contract'->>'farmer_lsl')='100000';
--
-- -- milestones: freeze allocated (SADP grant), convert funds_depleted → first
-- -- locked depletion row, drop the retired keys.
-- create function pg_temp.reshape_ms(obj jsonb, alloc numeric) returns jsonb language sql as $f$
--   select (coalesce(obj,'{}'::jsonb)
--            - 'funds_allocated_lsl' - 'funds_depleted_lsl' - 'yet_to_report_lsl'
--            - 'farmer_contract_lsl' - 'sadp_contract_lsl' - 'sadp_returns')
--          || jsonb_build_object('allocated_lsl', alloc)
--          || jsonb_build_object('depletion', case
--               when jsonb_typeof(obj->'depletion') = 'array' then obj->'depletion'
--               when (obj->>'funds_depleted_lsl') is not null and (obj->>'funds_depleted_lsl')::numeric > 0
--                 then jsonb_build_array(jsonb_build_object('amount', (obj->>'funds_depleted_lsl')::numeric, 'at', now()::text, 'by', null))
--               else '[]'::jsonb end)
-- $f$;
-- update public.mgp_tracking set stage_finances =
--   coalesce(stage_finances,'{}'::jsonb)
--   || jsonb_build_object('m1', pg_temp.reshape_ms(stage_finances->'m1', 160000))
--   || jsonb_build_object('m2', pg_temp.reshape_ms(stage_finances->'m2', 240000));
--
-- set session_replication_role = default;
