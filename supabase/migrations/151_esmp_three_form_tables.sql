-- 151_esmp_three_form_tables.sql
-- Replace 150's unified esmp_templates/esmp_submissions with three dedicated
-- tables, one per ESMP-package document type:
--   1. essf_submissions     — universal ESSF, 1:1 per enterprise (schema in app code)
--   2. emmp_templates       — 12 category-specific EMMP variants
--      emmp_submissions     — 1:1 per enterprise, references one emmp_template
--   3. inspection_visits    — universal compliance checklist, MANY per enterprise (schema in app code)
--
-- Why three tables instead of one with a `kind` discriminator: the EMMP is the
-- only doc that has multiple variants (12 templates per enterprise category).
-- ESSF and Inspection have ONE schema each, hard-coded in src/forms/. Forcing
-- them through a templates table was over-abstraction.

DROP TABLE IF EXISTS public.esmp_submissions CASCADE;
DROP TABLE IF EXISTS public.esmp_templates   CASCADE;

-- ----------------------------------------------------------------------------
-- 1. ESSF (Environmental and Social Screening Form)
-- ----------------------------------------------------------------------------
CREATE TABLE public.essf_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id   uuid UNIQUE NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  schema_version  int  NOT NULL DEFAULT 1,
  responses       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','approved')),
  filled_by       uuid REFERENCES public.user_profiles(id),
  submitted_at    timestamptz,
  approved_by     uuid REFERENCES public.user_profiles(id),
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_essf_org_status ON public.essf_submissions (organization_id, status);

-- ----------------------------------------------------------------------------
-- 2. EMMP templates + submissions
-- ----------------------------------------------------------------------------
CREATE TABLE public.emmp_templates (
  id          text PRIMARY KEY,
  enterprise_type_ids smallint[] NOT NULL,
  title       text NOT NULL,
  version     text NOT NULL,
  schema      jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emmp_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id   uuid UNIQUE NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  template_id     text NOT NULL REFERENCES public.emmp_templates(id),
  responses       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','approved')),
  filled_by       uuid REFERENCES public.user_profiles(id),
  submitted_at    timestamptz,
  approved_by     uuid REFERENCES public.user_profiles(id),
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_emmp_org_status ON public.emmp_submissions (organization_id, status);
CREATE INDEX idx_emmp_template   ON public.emmp_submissions (template_id);

-- ----------------------------------------------------------------------------
-- 3. Inspection visits (compliance monitoring — many per enterprise)
-- ----------------------------------------------------------------------------
CREATE TABLE public.inspection_visits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id     uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE, -- NOT unique
  organization_id   uuid NOT NULL REFERENCES public.organizations(id),
  schema_version    int  NOT NULL DEFAULT 1,
  inspected_by_name text NOT NULL,
  visit_date        date NOT NULL DEFAULT current_date,
  responses         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved')),
  filled_by         uuid REFERENCES public.user_profiles(id),
  submitted_at      timestamptz,
  approved_by       uuid REFERENCES public.user_profiles(id),
  approved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inspection_enterprise_date ON public.inspection_visits (enterprise_id, visit_date DESC);
CREATE INDEX idx_inspection_org_status      ON public.inspection_visits (organization_id, status);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_org_from_enterprise()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  SELECT organization_id INTO NEW.organization_id
    FROM public.enterprises WHERE id = NEW.enterprise_id;
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'enterprise % not found', NEW.enterprise_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_org_from_enterprise() FROM anon, authenticated, PUBLIC;

CREATE TRIGGER essf_set_org       BEFORE INSERT OR UPDATE OF enterprise_id ON public.essf_submissions  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_enterprise();
CREATE TRIGGER emmp_set_org       BEFORE INSERT OR UPDATE OF enterprise_id ON public.emmp_submissions  FOR EACH ROW EXECUTE FUNCTION public.set_org_from_enterprise();
CREATE TRIGGER inspection_set_org BEFORE INSERT OR UPDATE OF enterprise_id ON public.inspection_visits FOR EACH ROW EXECUTE FUNCTION public.set_org_from_enterprise();

CREATE TRIGGER essf_set_updated_at       BEFORE UPDATE ON public.essf_submissions  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER emmp_set_updated_at       BEFORE UPDATE ON public.emmp_submissions  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER inspection_set_updated_at BEFORE UPDATE ON public.inspection_visits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER audit_essf       AFTER INSERT OR UPDATE OR DELETE ON public.essf_submissions  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_emmp       AFTER INSERT OR UPDATE OR DELETE ON public.emmp_submissions  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_inspection AFTER INSERT OR UPDATE OR DELETE ON public.inspection_visits FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ----------------------------------------------------------------------------
-- RLS — helper fns + policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.essf_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emmp_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emmp_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_visits ENABLE ROW LEVEL SECURITY;

-- Templates: read for everyone authenticated, write super_admin only
CREATE POLICY emmp_templates_select ON public.emmp_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY emmp_templates_insert ON public.emmp_templates FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY emmp_templates_update ON public.emmp_templates FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY emmp_templates_delete ON public.emmp_templates FOR DELETE TO authenticated USING (public.is_super_admin());

-- Submission select/write helpers (kept as SECURITY INVOKER per advisor).
-- The "no self-approval" rule is enforced in application code, not RLS.
CREATE OR REPLACE FUNCTION public._submission_select(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT public.is_super_admin() OR p_org = public.current_user_org_id();
$$;
CREATE OR REPLACE FUNCTION public._submission_write(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT public.is_super_admin()
    OR (p_org = public.current_user_org_id()
        AND public.current_user_role() IN ('field_supervisor','me_officer','team_leader'));
$$;
REVOKE EXECUTE ON FUNCTION public._submission_select(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._submission_write(uuid)  FROM anon, PUBLIC;

-- ESSF
CREATE POLICY essf_select ON public.essf_submissions FOR SELECT TO authenticated USING (public._submission_select(organization_id));
CREATE POLICY essf_insert ON public.essf_submissions FOR INSERT TO authenticated WITH CHECK (public._submission_write(organization_id));
CREATE POLICY essf_update ON public.essf_submissions FOR UPDATE TO authenticated USING (public._submission_write(organization_id)) WITH CHECK (public._submission_write(organization_id));
CREATE POLICY essf_delete ON public.essf_submissions FOR DELETE TO authenticated USING (public.is_super_admin());

-- EMMP
CREATE POLICY emmp_select ON public.emmp_submissions FOR SELECT TO authenticated USING (public._submission_select(organization_id));
CREATE POLICY emmp_insert ON public.emmp_submissions FOR INSERT TO authenticated WITH CHECK (public._submission_write(organization_id));
CREATE POLICY emmp_update ON public.emmp_submissions FOR UPDATE TO authenticated USING (public._submission_write(organization_id)) WITH CHECK (public._submission_write(organization_id));
CREATE POLICY emmp_delete ON public.emmp_submissions FOR DELETE TO authenticated USING (public.is_super_admin());

-- Inspection
CREATE POLICY inspection_select ON public.inspection_visits FOR SELECT TO authenticated USING (public._submission_select(organization_id));
CREATE POLICY inspection_insert ON public.inspection_visits FOR INSERT TO authenticated WITH CHECK (public._submission_write(organization_id));
CREATE POLICY inspection_update ON public.inspection_visits FOR UPDATE TO authenticated USING (public._submission_write(organization_id)) WITH CHECK (public._submission_write(organization_id));
CREATE POLICY inspection_delete ON public.inspection_visits FOR DELETE TO authenticated USING (public.is_super_admin());
