-- 261_period_report_fn.sql
-- generate_period_report(p_start, p_end, p_org_id) returns a single jsonb
-- snapshot of project state for the given period.  p_org_id=NULL means
-- all-org (super admin only).  See src/lib/reports.ts and
-- src/components/reports/PeriodReportPreview.tsx for the consumers.
CREATE OR REPLACE FUNCTION generate_period_report(
  p_start   date,
  p_end     date,
  p_org_id  uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_summary             jsonb;
  v_milestone_matrix    jsonb;
  v_new_enterprises     jsonb;
  v_m1_financials       jsonb;
  v_esmp_compliance     jsonb;
  v_borehole_progress   jsonb;
  v_appendix            jsonb;
  v_scope               jsonb;
BEGIN
  IF p_org_id IS NULL THEN
    v_scope := jsonb_build_object('kind', 'all');
  ELSE
    SELECT jsonb_build_object('kind','org','org_id',o.id,'org_code',o.code,'org_name',o.name)
      INTO v_scope FROM organizations o WHERE o.id = p_org_id;
  END IF;

  WITH ent AS (
    SELECT e.* FROM enterprises e
    WHERE p_org_id IS NULL OR e.organization_id = p_org_id
  ),
  ent_in_period AS (
    SELECT * FROM ent WHERE created_at::date BETWEEN p_start AND p_end
  )
  SELECT jsonb_build_object(
    'enterprises_total',         (SELECT count(*) FROM ent),
    'enterprises_new_in_period', (SELECT count(*) FROM ent_in_period),
    'm1_submitted_in_period',   (SELECT count(*) FROM m1_submissions   WHERE submitted_at::date BETWEEN p_start AND p_end AND (p_org_id IS NULL OR organization_id = p_org_id)),
    'essf_submitted_in_period', (SELECT count(*) FROM essf_submissions WHERE submitted_at::date BETWEEN p_start AND p_end AND (p_org_id IS NULL OR organization_id = p_org_id)),
    'emmp_submitted_in_period', (SELECT count(*) FROM emmp_submissions WHERE submitted_at::date BETWEEN p_start AND p_end AND (p_org_id IS NULL OR organization_id = p_org_id)),
    'inspections_in_period',    (SELECT count(*) FROM inspection_visits WHERE visit_date BETWEEN p_start AND p_end AND (p_org_id IS NULL OR organization_id = p_org_id)),
    'budget_planned_lsl', (SELECT coalesce(sum(coalesce(budget_lsl, total_project_cost_lsl, 0)),0) FROM ent),
    'budget_grant_lsl',   (SELECT coalesce(sum(coalesce(total_grant_lsl, 0)),0) FROM ent)
  ) INTO v_summary;

  WITH ent AS (
    SELECT e.id, e.district_id,
      e.lifecycle_status->>'esmp'                     AS esmp,
      e.lifecycle_status->>'m1_submitted'             AS m1,
      e.lifecycle_status->>'contracts_signed'         AS contracts,
      e.lifecycle_status->>'beneficiary_contributed'  AS bene_contrib,
      e.lifecycle_status->>'sadp_contributed'         AS sadp_contrib,
      e.lifecycle_status->>'business_plan'            AS bp,
      e.lifecycle_status->>'verified_borehole_site'   AS borehole_site,
      e.lifecycle_status->>'budget_transfer'          AS budget_xfer,
      e.lifecycle_status->>'supervision'              AS supervision,
      e.lifecycle_status->>'procurement'              AS procurement
    FROM enterprises e
    WHERE (p_org_id IS NULL OR e.organization_id = p_org_id)
  )
  SELECT coalesce(jsonb_agg(row), '[]'::jsonb) INTO v_milestone_matrix
  FROM (
    SELECT jsonb_build_object(
      'district_id', d.id, 'district', d.name, 'org_id', d.organization_id,
      'total', count(e.id),
      'esmp_done',         count(*) FILTER (WHERE e.esmp = 'done'),
      'm1_done',           count(*) FILTER (WHERE e.m1 = 'done'),
      'contracts_done',    count(*) FILTER (WHERE e.contracts = 'done'),
      'bene_contrib_done', count(*) FILTER (WHERE e.bene_contrib = 'done'),
      'sadp_contrib_done', count(*) FILTER (WHERE e.sadp_contrib = 'done'),
      'bp_done',           count(*) FILTER (WHERE e.bp = 'done'),
      'borehole_done',     count(*) FILTER (WHERE e.borehole_site = 'done'),
      'budget_xfer_done',  count(*) FILTER (WHERE e.budget_xfer = 'done'),
      'supervision_done',  count(*) FILTER (WHERE e.supervision = 'done'),
      'procurement_done',  count(*) FILTER (WHERE e.procurement = 'done')
    ) AS row
    FROM districts d
    LEFT JOIN ent e ON e.district_id = d.id
    WHERE (p_org_id IS NULL OR d.organization_id = p_org_id)
    GROUP BY d.id, d.name, d.organization_id
    ORDER BY d.name
  ) sub;

  SELECT coalesce(jsonb_agg(row ORDER BY (row->>'created_at') DESC), '[]'::jsonb)
    INTO v_new_enterprises
  FROM (
    SELECT jsonb_build_object(
      'id', e.id, 'name', e.beneficiary_short_name, 'project_title', e.project_title,
      'district', d.name, 'resource_center', rc.name, 'enterprise_type', et.name,
      'org_code', o.code, 'created_at', e.created_at,
      'budget_lsl', coalesce(e.budget_lsl, e.total_project_cost_lsl, 0)
    ) AS row
    FROM enterprises e
    LEFT JOIN districts d ON d.id=e.district_id
    LEFT JOIN resource_centers rc ON rc.id=e.resource_center_id
    LEFT JOIN enterprise_types et ON et.id=e.enterprise_type_id
    LEFT JOIN organizations o ON o.id=e.organization_id
    WHERE e.created_at::date BETWEEN p_start AND p_end
      AND (p_org_id IS NULL OR e.organization_id = p_org_id)
  ) sub;

  WITH m1 AS (
    SELECT * FROM m1_submissions
    WHERE submitted_at::date BETWEEN p_start AND p_end
      AND (p_org_id IS NULL OR organization_id = p_org_id)
  ),
  fr_items AS (
    SELECT coalesce((item->>'total_planned')::numeric,0) AS planned,
           coalesce((item->>'incurred')::numeric,0)      AS incurred
    FROM m1, jsonb_array_elements(coalesce(m1.financial_report->'items','[]'::jsonb)) AS item
  ),
  cb_rows AS (
    SELECT coalesce((row->>'amount')::numeric,0) AS amount
    FROM m1, jsonb_array_elements(coalesce(m1.cashbook->'entries','[]'::jsonb)) AS row
  )
  SELECT jsonb_build_object(
    'm1_count',           (SELECT count(*) FROM m1),
    'total_planned_lsl',  (SELECT coalesce(sum(planned),0)  FROM fr_items),
    'total_incurred_lsl', (SELECT coalesce(sum(incurred),0) FROM fr_items),
    'cashbook_total_lsl', (SELECT coalesce(sum(amount),0)   FROM cb_rows)
  ) INTO v_m1_financials;

  SELECT jsonb_build_object(
    'essf_filed',    (SELECT count(*) FROM essf_submissions  WHERE submitted_at::date BETWEEN p_start AND p_end AND (p_org_id IS NULL OR organization_id=p_org_id)),
    'essf_approved', (SELECT count(*) FROM essf_submissions  WHERE approved_at::date  BETWEEN p_start AND p_end AND (p_org_id IS NULL OR organization_id=p_org_id)),
    'emmp_filed',    (SELECT count(*) FROM emmp_submissions  WHERE submitted_at::date BETWEEN p_start AND p_end AND (p_org_id IS NULL OR organization_id=p_org_id)),
    'emmp_approved', (SELECT count(*) FROM emmp_submissions  WHERE approved_at::date  BETWEEN p_start AND p_end AND (p_org_id IS NULL OR organization_id=p_org_id)),
    'inspections',   (SELECT count(*) FROM inspection_visits WHERE visit_date BETWEEN p_start AND p_end AND (p_org_id IS NULL OR organization_id=p_org_id))
  ) INTO v_esmp_compliance;

  WITH ent AS (
    SELECT borehole_supervision AS bs FROM enterprises
    WHERE (p_org_id IS NULL OR organization_id = p_org_id)
  )
  SELECT jsonb_build_object(
    'drilling_permit',          (SELECT count(*) FROM ent WHERE (bs->'drilling_permit'->>'done')='true'          AND (bs->'drilling_permit'->>'date')::date          BETWEEN p_start AND p_end),
    'borehole_drilling',        (SELECT count(*) FROM ent WHERE (bs->'borehole_drilling'->>'done')='true'        AND (bs->'borehole_drilling'->>'date')::date        BETWEEN p_start AND p_end),
    'borehole_casing',          (SELECT count(*) FROM ent WHERE (bs->'borehole_casing'->>'done')='true'          AND (bs->'borehole_casing'->>'date')::date          BETWEEN p_start AND p_end),
    'borehole_yield_test',      (SELECT count(*) FROM ent WHERE (bs->'borehole_yield_test'->>'done')='true'      AND (bs->'borehole_yield_test'->>'date')::date      BETWEEN p_start AND p_end),
    'borehole_drilling_report', (SELECT count(*) FROM ent WHERE (bs->'borehole_drilling_report'->>'done')='true' AND (bs->'borehole_drilling_report'->>'date')::date BETWEEN p_start AND p_end),
    'water_use_permit',         (SELECT count(*) FROM ent WHERE (bs->'water_use_permit'->>'done')='true'         AND (bs->'water_use_permit'->>'date')::date         BETWEEN p_start AND p_end)
  ) INTO v_borehole_progress;

  SELECT coalesce(jsonb_agg(row ORDER BY row->>'district', row->>'name'), '[]'::jsonb) INTO v_appendix
  FROM (
    SELECT jsonb_build_object(
      'id', e.id, 'name', e.beneficiary_short_name, 'project_title', e.project_title,
      'district', d.name, 'resource_center', rc.name, 'enterprise_type', et.name,
      'org_code', o.code,
      'budget_lsl', coalesce(e.budget_lsl, e.total_project_cost_lsl, 0),
      'esmp', e.lifecycle_status->>'esmp',
      'm1',   e.lifecycle_status->>'m1_submitted',
      'bp',   e.lifecycle_status->>'business_plan'
    ) AS row
    FROM enterprises e
    LEFT JOIN districts d ON d.id=e.district_id
    LEFT JOIN resource_centers rc ON rc.id=e.resource_center_id
    LEFT JOIN enterprise_types et ON et.id=e.enterprise_type_id
    LEFT JOIN organizations o ON o.id=e.organization_id
    WHERE (p_org_id IS NULL OR e.organization_id = p_org_id)
  ) sub;

  RETURN jsonb_build_object(
    'period',            jsonb_build_object('start', p_start, 'end', p_end),
    'scope',             v_scope,
    'generated_at',      now(),
    'summary',           v_summary,
    'milestone_matrix',  v_milestone_matrix,
    'new_enterprises',   v_new_enterprises,
    'm1_financials',     v_m1_financials,
    'esmp_compliance',   v_esmp_compliance,
    'borehole_progress', v_borehole_progress,
    'appendix',          v_appendix
  );
END;
$$;

REVOKE ALL ON FUNCTION generate_period_report(date, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_period_report(date, date, uuid) TO authenticated;
