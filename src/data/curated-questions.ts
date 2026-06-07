/**
 * Curated questions library — Layer 1 of the "Ask the data" feature.
 *
 * Hand-written SQL for the questions managers actually ask.  Every query goes
 * through `run_safe_query()` so it's bounded to LIMIT 500, SELECT-only, and
 * RLS-scoped to the caller (4D users only see 4D data, partner staff only see
 * their org's, etc.).
 *
 * To add a question: append a new entry below.  The SQL must be a single
 * SELECT/WITH statement.  See migration 280 for the safety guards.
 */
export type QuestionCategory = 'progress' | 'financials' | 'compliance' | 'data-quality';

export interface CuratedColumn {
  key: string;
  label: string;
  /** Optional formatter hint for the result renderer. */
  format?: 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'text';
  /** Optional alignment hint. Defaults: number/currency/percent → right, else left. */
  align?: 'left' | 'right';
}

export interface CuratedQuestion {
  id: string;
  title: string;
  description: string;
  category: QuestionCategory;
  /** Plain SELECT/WITH SQL passed to run_safe_query(). */
  sql: string;
  /** Optional explicit column order + formatting; if omitted, columns auto-render. */
  columns?: CuratedColumn[];
  /** When true, hide this question from non-super-admin users (it joins data they can't read). */
  requiresSuperAdmin?: boolean;
  /** When true, the SQL contains an ORG_FILTER placeholder (the literal string
   *  slash-star-ORG_FILTER-star-slash) which the Ask page substitutes to TRUE for
   *  All-orgs or to `o.code = '4D'` etc for a selected partner. Questions without
   *  the placeholder are listed but ignore the scope picker. */
  scopable?: boolean;
}

export const CURATED_QUESTIONS: CuratedQuestion[] = [
  // ============================================================================
  // PROGRESS / BOTTLENECKS
  // ============================================================================
  {
    id: 'p-district-m1-completion',
    scopable: true,
    title: 'Districts ranked by M1 submission rate',
    description: 'Lowest-completion districts at the top — where to push for submissions.',
    category: 'progress',
    sql: `
      SELECT
        d.name AS district,
        o.code AS partner,
        count(e.id) AS total_enterprises,
        count(*) FILTER (WHERE e.lifecycle_status->>'m1_submitted' = 'done') AS m1_done,
        round(
          100.0 * count(*) FILTER (WHERE e.lifecycle_status->>'m1_submitted' = 'done')
               / nullif(count(e.id), 0)
        , 1) AS pct_done
      FROM districts d
      JOIN organizations o ON o.id = d.organization_id
      LEFT JOIN enterprises e ON e.district_id = d.id
      WHERE /*ORG_FILTER*/
      GROUP BY d.name, o.code
      ORDER BY pct_done NULLS FIRST, total_enterprises DESC
    `,
    columns: [
      { key: 'district', label: 'District' },
      { key: 'partner', label: 'Partner' },
      { key: 'total_enterprises', label: 'Total', format: 'number' },
      { key: 'm1_done', label: 'M1 done', format: 'number' },
      { key: 'pct_done', label: '% done', format: 'percent' },
    ],
  },
  {
    id: 'p-bottleneck-milestone',
    scopable: true,
    title: 'Which milestone is stuck the most?',
    description: 'Counts how many enterprises are NOT done on each of the 11 milestones.',
    category: 'progress',
    sql: `
      WITH ent AS (
        SELECT e.lifecycle_status
        FROM enterprises e
        JOIN organizations o ON o.id = e.organization_id
        WHERE /*ORG_FILTER*/
      )
      SELECT m.label, count(*) FILTER (WHERE (ent.lifecycle_status->>m.key) IS DISTINCT FROM 'done') AS stuck
      FROM ent
      CROSS JOIN (VALUES
        ('esmp','ESMP'),
        ('m1_submitted','Milestone 1 report'),
        ('contracts_signed','Contracts signed'),
        ('contract_available','Contract available'),
        ('beneficiary_contributed','Beneficiary contributed'),
        ('sadp_contributed','SADP contributed'),
        ('business_plan','Business plan'),
        ('verified_borehole_site','Verified borehole site'),
        ('budget_transfer','Budget transfer'),
        ('supervision','Supervision'),
        ('procurement','Procurement')
      ) AS m(key,label)
      GROUP BY m.label, m.key
      ORDER BY stuck DESC
    `,
    columns: [
      { key: 'label', label: 'Milestone' },
      { key: 'stuck', label: 'Not done', format: 'number' },
    ],
  },
  {
    id: 'p-stale-enterprises',
    scopable: true,
    title: 'Enterprises with no activity in 30+ days',
    description: 'Oldest at the top. Updates include any field edit — lifecycle, ESMP, borehole, etc.',
    category: 'progress',
    sql: `
      SELECT
        e.beneficiary_short_name AS name,
        o.code AS partner,
        d.name AS district,
        et.name AS type,
        e.updated_at::date AS last_change,
        (now()::date - e.updated_at::date) AS days_idle
      FROM enterprises e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN districts d ON d.id = e.district_id
      LEFT JOIN enterprise_types et ON et.id = e.enterprise_type_id
      WHERE e.updated_at < now() - interval '30 days'
        AND /*ORG_FILTER*/
      ORDER BY e.updated_at ASC
    `,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'partner', label: 'Partner' },
      { key: 'district', label: 'District' },
      { key: 'type', label: 'Type' },
      { key: 'last_change', label: 'Last change', format: 'date' },
      { key: 'days_idle', label: 'Days idle', format: 'number' },
    ],
  },
  {
    id: 'p-district-avg-progress',
    scopable: true,
    title: 'Average milestones completed per district',
    description: 'Out of 11. Higher = further along the lifecycle.',
    category: 'progress',
    sql: `
      WITH per_ent AS (
        SELECT
          e.district_id,
          e.organization_id,
          (
            (CASE WHEN lifecycle_status->>'esmp'                    = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'m1_submitted'            = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'contracts_signed'        = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'contract_available'      = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'beneficiary_contributed' = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'sadp_contributed'        = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'business_plan'           = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'verified_borehole_site'  = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'budget_transfer'         = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'supervision'             = 'done' THEN 1 ELSE 0 END) +
            (CASE WHEN lifecycle_status->>'procurement'             = 'done' THEN 1 ELSE 0 END)
          ) AS milestones_done
        FROM enterprises e
      ),
      scoped AS (
        SELECT p.* FROM per_ent p
        JOIN organizations o ON o.id = p.organization_id
        WHERE /*ORG_FILTER*/
      )
      SELECT
        d.name AS district,
        count(p.district_id) AS enterprises,
        round(avg(p.milestones_done)::numeric, 1) AS avg_done
      FROM districts d
      LEFT JOIN scoped p ON p.district_id = d.id
      GROUP BY d.name
      ORDER BY avg_done DESC NULLS LAST
    `,
    columns: [
      { key: 'district', label: 'District' },
      { key: 'enterprises', label: 'Enterprises', format: 'number' },
      { key: 'avg_done', label: 'Avg milestones done (of 11)', format: 'number' },
    ],
  },
  {
    id: 'p-no-esmp-no-m1',
    scopable: true,
    title: 'Enterprises with neither ESMP nor M1 done',
    description: 'Earliest stage. Useful for "who needs the most help" lists.',
    category: 'progress',
    sql: `
      SELECT
        e.beneficiary_short_name AS name,
        o.code AS partner,
        d.name AS district,
        rc.name AS resource_center,
        et.name AS type,
        e.created_at::date AS created
      FROM enterprises e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN districts d ON d.id = e.district_id
      LEFT JOIN resource_centers rc ON rc.id = e.resource_center_id
      LEFT JOIN enterprise_types et ON et.id = e.enterprise_type_id
      WHERE coalesce(e.lifecycle_status->>'esmp', '') <> 'done'
        AND coalesce(e.lifecycle_status->>'m1_submitted', '') <> 'done'
        AND /*ORG_FILTER*/
      ORDER BY e.created_at DESC
    `,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'partner', label: 'Partner' },
      { key: 'district', label: 'District' },
      { key: 'resource_center', label: 'Resource centre' },
      { key: 'type', label: 'Type' },
      { key: 'created', label: 'Created', format: 'date' },
    ],
  },

  // ============================================================================
  // FINANCIALS
  // ============================================================================
  {
    id: 'f-top-budget-enterprises',
    scopable: true,
    title: 'Top 25 enterprises by total project cost',
    description: 'Biggest planned investments. Useful for stakeholder reviews.',
    category: 'financials',
    sql: `
      SELECT
        e.beneficiary_short_name AS name,
        o.code AS partner,
        d.name AS district,
        et.name AS type,
        coalesce(e.budget_lsl, e.total_project_cost_lsl, 0) AS budget_lsl,
        coalesce(e.total_grant_lsl, 0) AS grant_lsl
      FROM enterprises e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN districts d ON d.id = e.district_id
      LEFT JOIN enterprise_types et ON et.id = e.enterprise_type_id
      WHERE coalesce(e.budget_lsl, e.total_project_cost_lsl, 0) > 0
        AND /*ORG_FILTER*/
      ORDER BY coalesce(e.budget_lsl, e.total_project_cost_lsl, 0) DESC
    `,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'partner', label: 'Partner' },
      { key: 'district', label: 'District' },
      { key: 'type', label: 'Type' },
      { key: 'budget_lsl', label: 'Budget (LSL)', format: 'currency' },
      { key: 'grant_lsl', label: 'Grant (LSL)', format: 'currency' },
    ],
  },
  {
    id: 'f-budget-by-partner',
    scopable: true,
    title: 'Budget + grant totals by partner',
    description: 'Sum of total_project_cost_lsl and total_grant_lsl per partner.',
    category: 'financials',
    sql: `
      SELECT
        o.code AS partner,
        count(e.id) AS enterprises,
        coalesce(sum(coalesce(e.budget_lsl, e.total_project_cost_lsl, 0)), 0) AS budget_lsl,
        coalesce(sum(e.total_grant_lsl), 0) AS grant_lsl
      FROM organizations o
      LEFT JOIN enterprises e ON e.organization_id = o.id
      WHERE /*ORG_FILTER*/
      GROUP BY o.code
      ORDER BY budget_lsl DESC
    `,
    columns: [
      { key: 'partner', label: 'Partner' },
      { key: 'enterprises', label: 'Enterprises', format: 'number' },
      { key: 'budget_lsl', label: 'Total budget (LSL)', format: 'currency' },
      { key: 'grant_lsl', label: 'Total grant (LSL)', format: 'currency' },
    ],
  },
  {
    id: 'f-m1-incurred-vs-planned',
    scopable: true,
    title: 'M1 financial report — incurred vs planned',
    description: 'Across every submitted M1 report. Items rolled up by category.',
    category: 'financials',
    sql: `
      WITH fr AS (
        SELECT m.id,
               jsonb_array_elements(coalesce(m.financial_report->'items','[]'::jsonb)) AS item
        FROM m1_submissions m
        JOIN organizations o ON o.id = m.organization_id
        WHERE m.status IN ('submitted','approved')
          AND /*ORG_FILTER*/
      )
      SELECT
        coalesce(item->>'category', '(none)') AS category,
        count(*) AS line_items,
        coalesce(sum((item->>'total_planned')::numeric), 0) AS planned_lsl,
        coalesce(sum((item->>'incurred')::numeric), 0) AS incurred_lsl,
        round(
          100.0 * coalesce(sum((item->>'incurred')::numeric), 0)
                / nullif(coalesce(sum((item->>'total_planned')::numeric), 0), 0)
        , 1) AS utilization_pct
      FROM fr
      GROUP BY category
      ORDER BY incurred_lsl DESC
    `,
    columns: [
      { key: 'category', label: 'Category' },
      { key: 'line_items', label: 'Line items', format: 'number' },
      { key: 'planned_lsl', label: 'Planned (LSL)', format: 'currency' },
      { key: 'incurred_lsl', label: 'Incurred (LSL)', format: 'currency' },
      { key: 'utilization_pct', label: 'Utilization', format: 'percent' },
    ],
  },
  {
    id: 'f-budget-by-district',
    scopable: true,
    title: 'Total budget per district',
    description: 'Sum of total_project_cost_lsl per district, with enterprise count.',
    category: 'financials',
    sql: `
      SELECT
        d.name AS district,
        o.code AS partner,
        count(e.id) AS enterprises,
        coalesce(sum(coalesce(e.budget_lsl, e.total_project_cost_lsl, 0)), 0) AS budget_lsl,
        round(avg(coalesce(e.budget_lsl, e.total_project_cost_lsl, 0))::numeric, 0) AS avg_budget_lsl
      FROM districts d
      JOIN organizations o ON o.id = d.organization_id
      LEFT JOIN enterprises e ON e.district_id = d.id
      WHERE /*ORG_FILTER*/
      GROUP BY d.name, o.code
      ORDER BY budget_lsl DESC
    `,
    columns: [
      { key: 'district', label: 'District' },
      { key: 'partner', label: 'Partner' },
      { key: 'enterprises', label: 'Enterprises', format: 'number' },
      { key: 'budget_lsl', label: 'Total (LSL)', format: 'currency' },
      { key: 'avg_budget_lsl', label: 'Avg per enterprise (LSL)', format: 'currency' },
    ],
  },
  {
    id: 'f-grant-payments-received',
    scopable: true,
    title: 'Enterprises that have received current grant payment',
    description: 'current_grant_payment_lsl > 0. Use for cashflow reporting.',
    category: 'financials',
    sql: `
      SELECT
        e.beneficiary_short_name AS name,
        o.code AS partner,
        d.name AS district,
        e.current_grant_payment_lsl AS payment_lsl,
        e.total_grant_lsl AS total_grant_lsl,
        e.cgp_received_date AS received_on
      FROM enterprises e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN districts d ON d.id = e.district_id
      WHERE coalesce(e.current_grant_payment_lsl, 0) > 0
        AND /*ORG_FILTER*/
      ORDER BY e.cgp_received_date DESC NULLS LAST, e.current_grant_payment_lsl DESC
    `,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'partner', label: 'Partner' },
      { key: 'district', label: 'District' },
      { key: 'payment_lsl', label: 'Payment (LSL)', format: 'currency' },
      { key: 'total_grant_lsl', label: 'Total grant (LSL)', format: 'currency' },
      { key: 'received_on', label: 'Received on', format: 'date' },
    ],
  },

  // ============================================================================
  // COMPLIANCE / ESMP
  // ============================================================================
  {
    id: 'c-essf-submission-rate-by-district',
    scopable: true,
    title: 'ESSF submission rate by district',
    description: 'Districts where the safeguards form lags. Approved + submitted both count.',
    category: 'compliance',
    sql: `
      SELECT
        d.name AS district,
        count(DISTINCT e.id) AS enterprises,
        count(DISTINCT s.id) FILTER (WHERE s.status IN ('submitted','approved')) AS essf_filed,
        round(
          100.0 * count(DISTINCT s.id) FILTER (WHERE s.status IN ('submitted','approved'))
               / nullif(count(DISTINCT e.id), 0)
        , 1) AS pct
      FROM districts d
      JOIN organizations o ON o.id = d.organization_id
      LEFT JOIN enterprises e ON e.district_id = d.id
      LEFT JOIN essf_submissions s ON s.enterprise_id = e.id
      WHERE /*ORG_FILTER*/
      GROUP BY d.name
      ORDER BY pct NULLS FIRST
    `,
    columns: [
      { key: 'district', label: 'District' },
      { key: 'enterprises', label: 'Enterprises', format: 'number' },
      { key: 'essf_filed', label: 'ESSF filed', format: 'number' },
      { key: 'pct', label: '%', format: 'percent' },
    ],
  },
  {
    id: 'c-overdue-inspections',
    scopable: true,
    title: 'Enterprises with no inspection in 90+ days',
    description: 'Includes enterprises that have NEVER been inspected. Sorted by longest gap.',
    category: 'compliance',
    sql: `
      WITH last_visit AS (
        SELECT enterprise_id, max(visit_date) AS last_date
        FROM inspection_visits
        GROUP BY enterprise_id
      )
      SELECT
        e.beneficiary_short_name AS name,
        o.code AS partner,
        d.name AS district,
        et.name AS type,
        lv.last_date AS last_inspection,
        coalesce((now()::date - lv.last_date)::int, 9999) AS days_since
      FROM enterprises e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN districts d ON d.id = e.district_id
      LEFT JOIN enterprise_types et ON et.id = e.enterprise_type_id
      LEFT JOIN last_visit lv ON lv.enterprise_id = e.id
      WHERE (lv.last_date IS NULL OR lv.last_date < now() - interval '90 days')
        AND /*ORG_FILTER*/
      ORDER BY days_since DESC
    `,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'partner', label: 'Partner' },
      { key: 'district', label: 'District' },
      { key: 'type', label: 'Type' },
      { key: 'last_inspection', label: 'Last inspection', format: 'date' },
      { key: 'days_since', label: 'Days since', format: 'number' },
    ],
  },
  {
    id: 'c-pending-approvals',
    scopable: true,
    title: 'Forms waiting for approval',
    description: 'ESSF / EMMP / Inspection submissions currently in submitted state.',
    category: 'compliance',
    sql: `
      SELECT 'ESSF' AS kind, e.beneficiary_short_name AS enterprise, s.submitted_at::date AS submitted_on
      FROM essf_submissions s
      JOIN enterprises e ON e.id = s.enterprise_id
      JOIN organizations o ON o.id = e.organization_id
      WHERE s.status = 'submitted'
        AND /*ORG_FILTER*/
      UNION ALL
      SELECT 'EMMP', e.beneficiary_short_name, s.submitted_at::date
      FROM emmp_submissions s
      JOIN enterprises e ON e.id = s.enterprise_id
      JOIN organizations o ON o.id = e.organization_id
      WHERE s.status = 'submitted'
        AND /*ORG_FILTER*/
      UNION ALL
      SELECT 'Inspection', e.beneficiary_short_name, v.submitted_at::date
      FROM inspection_visits v
      JOIN enterprises e ON e.id = v.enterprise_id
      JOIN organizations o ON o.id = e.organization_id
      WHERE v.status = 'submitted'
        AND /*ORG_FILTER*/
      ORDER BY submitted_on
    `,
    columns: [
      { key: 'kind', label: 'Form' },
      { key: 'enterprise', label: 'Enterprise' },
      { key: 'submitted_on', label: 'Submitted on', format: 'date' },
    ],
  },
  {
    id: 'c-inspections-by-month',
    scopable: true,
    title: 'Inspection visits per month — last 12 months',
    description: 'Count of inspection_visits grouped by visit_date.',
    category: 'compliance',
    sql: `
      SELECT
        to_char(date_trunc('month', visit_date), 'YYYY-MM') AS month,
        count(*) AS visits
      FROM inspection_visits iv
      JOIN organizations o ON o.id = iv.organization_id
      WHERE visit_date >= (now() - interval '12 months')::date
        AND /*ORG_FILTER*/
      GROUP BY date_trunc('month', visit_date)
      ORDER BY date_trunc('month', visit_date) DESC
    `,
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'visits', label: 'Visits', format: 'number' },
    ],
  },
  {
    id: 'c-borehole-progress',
    scopable: true,
    title: 'Borehole supervision progress per district',
    description: 'For each district, how many enterprises completed each of the 6 borehole milestones.',
    category: 'compliance',
    sql: `
      WITH ent AS (
        SELECT e.district_id, e.borehole_supervision AS bs
        FROM enterprises e
        JOIN organizations o ON o.id = e.organization_id
        WHERE /*ORG_FILTER*/
      )
      SELECT
        d.name AS district,
        count(*) FILTER (WHERE (bs->'drilling_permit'->>'done')='true')          AS drilling_permit,
        count(*) FILTER (WHERE (bs->'borehole_drilling'->>'done')='true')        AS drilled,
        count(*) FILTER (WHERE (bs->'borehole_casing'->>'done')='true')          AS cased,
        count(*) FILTER (WHERE (bs->'borehole_yield_test'->>'done')='true')      AS yield_tested,
        count(*) FILTER (WHERE (bs->'borehole_drilling_report'->>'done')='true') AS reported,
        count(*) FILTER (WHERE (bs->'water_use_permit'->>'done')='true')         AS water_permit
      FROM districts d
      LEFT JOIN ent ON ent.district_id = d.id
      GROUP BY d.name
      ORDER BY d.name
    `,
    columns: [
      { key: 'district', label: 'District' },
      { key: 'drilling_permit', label: 'Drilling permit', format: 'number' },
      { key: 'drilled', label: 'Drilled', format: 'number' },
      { key: 'cased', label: 'Cased', format: 'number' },
      { key: 'yield_tested', label: 'Yield tested', format: 'number' },
      { key: 'reported', label: 'Report filed', format: 'number' },
      { key: 'water_permit', label: 'Water permit', format: 'number' },
    ],
  },

  // ============================================================================
  // DATA QUALITY
  // ============================================================================
  {
    id: 'q-missing-signatures',
    scopable: true,
    title: 'Enterprises missing principal-applicant signature',
    description: 'principal_applicant_signature_url is null — cover page can\'t be issued.',
    category: 'data-quality',
    sql: `
      SELECT
        e.beneficiary_short_name AS name,
        o.code AS partner,
        d.name AS district,
        e.principal_applicant_name AS applicant_name,
        e.created_at::date AS created
      FROM enterprises e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN districts d ON d.id = e.district_id
      WHERE e.principal_applicant_signature_url IS NULL
        AND /*ORG_FILTER*/
      ORDER BY e.created_at DESC
    `,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'partner', label: 'Partner' },
      { key: 'district', label: 'District' },
      { key: 'applicant_name', label: 'Principal applicant' },
      { key: 'created', label: 'Created', format: 'date' },
    ],
  },
  {
    id: 'q-missing-classifications',
    scopable: true,
    title: 'Enterprises missing district, RC, or type',
    description: 'Any enterprise where one of the classification FKs is null. Often import artifacts.',
    category: 'data-quality',
    sql: `
      SELECT
        e.beneficiary_short_name AS name,
        o.code AS partner,
        CASE WHEN e.district_id IS NULL THEN 'YES' ELSE '' END AS missing_district,
        CASE WHEN e.resource_center_id IS NULL THEN 'YES' ELSE '' END AS missing_rc,
        CASE WHEN e.enterprise_type_id IS NULL THEN 'YES' ELSE '' END AS missing_type
      FROM enterprises e
      LEFT JOIN organizations o ON o.id = e.organization_id
      WHERE (e.district_id IS NULL OR e.resource_center_id IS NULL OR e.enterprise_type_id IS NULL)
        AND /*ORG_FILTER*/
      ORDER BY o.code, e.beneficiary_short_name
    `,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'partner', label: 'Partner' },
      { key: 'missing_district', label: 'No district' },
      { key: 'missing_rc', label: 'No RC' },
      { key: 'missing_type', label: 'No type' },
    ],
  },
  {
    id: 'q-budget-no-progress',
    scopable: true,
    title: 'Enterprises with budget set but zero lifecycle milestones',
    description: 'Suggests they\'re on the books but no work has been recorded yet.',
    category: 'data-quality',
    sql: `
      SELECT
        e.beneficiary_short_name AS name,
        o.code AS partner,
        d.name AS district,
        coalesce(e.budget_lsl, e.total_project_cost_lsl, 0) AS budget_lsl,
        e.created_at::date AS created
      FROM enterprises e
      LEFT JOIN organizations o ON o.id = e.organization_id
      LEFT JOIN districts d ON d.id = e.district_id
      WHERE coalesce(e.budget_lsl, e.total_project_cost_lsl, 0) > 0
        AND coalesce(e.lifecycle_status, '{}'::jsonb) = '{}'::jsonb
        AND /*ORG_FILTER*/
      ORDER BY budget_lsl DESC
    `,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'partner', label: 'Partner' },
      { key: 'district', label: 'District' },
      { key: 'budget_lsl', label: 'Budget (LSL)', format: 'currency' },
      { key: 'created', label: 'Created', format: 'date' },
    ],
  },
  {
    id: 'q-duplicate-names',
    scopable: true,
    title: 'Possible duplicate enterprise names',
    description: 'Same beneficiary_short_name appearing more than once — investigate.',
    category: 'data-quality',
    sql: `
      SELECT
        lower(btrim(beneficiary_short_name)) AS normalized_name,
        count(*) AS count,
        string_agg(DISTINCT (
          SELECT code FROM organizations o WHERE o.id = e.organization_id
        ), ', ') AS partners
      FROM enterprises e
      JOIN organizations o ON o.id = e.organization_id
      WHERE beneficiary_short_name IS NOT NULL
        AND /*ORG_FILTER*/
      GROUP BY lower(btrim(beneficiary_short_name))
      HAVING count(*) > 1
      ORDER BY count DESC, normalized_name
    `,
    columns: [
      { key: 'normalized_name', label: 'Name (lowercased)' },
      { key: 'count', label: 'Copies', format: 'number' },
      { key: 'partners', label: 'Partners involved' },
    ],
  },
  {
    id: 'q-inactive-users',
    requiresSuperAdmin: true,
    title: 'Users who have never logged in',
    description: 'Invited accounts that never accepted or never came back. Super-admin only.',
    category: 'data-quality',
    sql: `
      SELECT
        full_name,
        email,
        role,
        organization_name,
        created_at::date AS invited_on
      FROM user_admin_list()
      WHERE last_sign_in_at IS NULL
      ORDER BY created_at ASC
    `,
    columns: [
      { key: 'full_name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'organization_name', label: 'Organisation' },
      { key: 'invited_on', label: 'Invited on', format: 'date' },
    ],
  },
];

export const CATEGORY_META: Record<QuestionCategory, { label: string; emoji: string; description: string }> = {
  progress:        { label: 'Progress & bottlenecks', emoji: '⚙️', description: 'Which milestone is stuck, who is behind, who needs a push.' },
  financials:      { label: 'Financials',             emoji: '💰', description: 'Budget, grants, M1 incurred vs planned.' },
  compliance:      { label: 'Compliance & ESMP',      emoji: '✅', description: 'ESSF / EMMP / Inspections / Borehole milestones.' },
  'data-quality':  { label: 'Data quality',           emoji: '🔍', description: 'Missing fields, duplicates, never-touched records.' },
};
