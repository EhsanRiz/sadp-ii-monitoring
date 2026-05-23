-- 070_audit_log.sql
-- Generic per-row audit trail for tracked tables. Fed by triggers only —
-- application code cannot write here. Even Super Admin cannot delete rows.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name        text          NOT NULL,
  record_id         uuid          NOT NULL,
  action            text          NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by        uuid          REFERENCES public.user_profiles(id),
  changed_at        timestamptz   NOT NULL DEFAULT now(),
  old_values        jsonb,
  new_values        jsonb,
  diff              jsonb,
  organization_id   uuid
);

CREATE INDEX IF NOT EXISTS idx_audit_record  ON public.audit_log (table_name, record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org     ON public.audit_log (organization_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON public.audit_log (changed_by, changed_at DESC);

-- Generic audit trigger function. SECURITY DEFINER so it can always write
-- regardless of the calling role's RLS.
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_j  jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  new_j  jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  diff_j jsonb := NULL;
  k      text;
  org_id uuid;
  rec_id uuid;
BEGIN
  -- Compute diff for UPDATEs: only the columns that changed
  IF TG_OP = 'UPDATE' THEN
    diff_j := '{}'::jsonb;
    FOR k IN SELECT jsonb_object_keys(new_j) LOOP
      IF old_j->k IS DISTINCT FROM new_j->k THEN
        diff_j := diff_j || jsonb_build_object(
          k, jsonb_build_object('from', old_j->k, 'to', new_j->k)
        );
      END IF;
    END LOOP;
    -- Skip writing an audit row if literally nothing changed (e.g., set to same value)
    IF diff_j = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  org_id := COALESCE((new_j->>'organization_id'), (old_j->>'organization_id'))::uuid;
  rec_id := COALESCE((new_j->>'id'),              (old_j->>'id'))::uuid;

  INSERT INTO public.audit_log
    (table_name, record_id, action, changed_by, old_values, new_values, diff, organization_id)
  VALUES
    (TG_TABLE_NAME, rec_id, TG_OP, auth.uid(), old_j, new_j, diff_j, org_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to Phase 1 tracked tables
CREATE TRIGGER audit_enterprises
  AFTER INSERT OR UPDATE OR DELETE ON public.enterprises
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
