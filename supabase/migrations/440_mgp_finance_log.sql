-- 440 — Contribution / finance change log.
--
-- Every change to a money field in mgp_tracking.stage_finances is recorded
-- automatically by an AFTER UPDATE trigger, so admins can see what was changed,
-- by whom and when. Rows are written only by the SECURITY DEFINER trigger;
-- members can read them. Added to the realtime publication so the log is live.
CREATE TABLE IF NOT EXISTS public.mgp_finance_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id uuid NOT NULL REFERENCES public.mgp_tracking(id) ON DELETE CASCADE,
  stage       text,                 -- 'm1' | 'm2'
  field       text NOT NULL,        -- e.g. 'farmer_contributed_lsl'
  old_value   text,
  new_value   text,
  changed_by  uuid REFERENCES public.mgp_users(id),
  changed_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mgp_finance_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS mgp_finance_log_tracking_idx ON public.mgp_finance_log(tracking_id);
CREATE INDEX IF NOT EXISTS mgp_finance_log_changed_at_idx ON public.mgp_finance_log(changed_at DESC);

DROP POLICY IF EXISTS mgp_finance_log_select ON public.mgp_finance_log;
CREATE POLICY mgp_finance_log_select ON public.mgp_finance_log FOR SELECT TO authenticated
  USING ((SELECT public.mgp_is_member()));

CREATE OR REPLACE FUNCTION public.mgp_log_finance_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s    text;
  fld  text;
  oldt text;
  newt text;
  uid  uuid := public.mgp_current_user_id();
BEGIN
  FOREACH s IN ARRAY ARRAY['m1','m2'] LOOP
    FOREACH fld IN ARRAY ARRAY[
      'farmer_contract_lsl','farmer_contributed_lsl',
      'sadp_contract_lsl','sadp_contributed_lsl',
      'funds_allocated_lsl','funds_depleted_lsl'
    ] LOOP
      oldt := OLD.stage_finances -> s ->> fld;
      newt := NEW.stage_finances -> s ->> fld;
      IF oldt IS DISTINCT FROM newt THEN
        INSERT INTO public.mgp_finance_log(tracking_id, stage, field, old_value, new_value, changed_by)
        VALUES (NEW.id, s, fld, oldt, newt, uid);
      END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS mgp_finance_log_trg ON public.mgp_tracking;
CREATE TRIGGER mgp_finance_log_trg
  AFTER UPDATE OF stage_finances ON public.mgp_tracking
  FOR EACH ROW WHEN (OLD.stage_finances IS DISTINCT FROM NEW.stage_finances)
  EXECUTE FUNCTION public.mgp_log_finance_changes();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mgp_finance_log;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
