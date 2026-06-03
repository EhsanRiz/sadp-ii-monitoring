/**
 * Period Reports — Monthly / Quarterly / Custom-range snapshots.
 *
 * The heavy lifting happens in the Postgres function `generate_period_report`
 * (see migration 261).  This module wraps it as a React Query hook + offers
 * period-boundary helpers (currentMonth, lastMonth, currentQuarter, lastQuarter)
 * for the period picker UI in pages/reports/.
 *
 * Calendar basis is standard (Jan-Dec).  All dates are emitted as ISO yyyy-mm-dd
 * to match Postgres `date` columns.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

// ============================================================================
// Types — keep tight with what generate_period_report returns
// ============================================================================
export type ReportKind = 'monthly' | 'quarterly' | 'custom';

export interface ReportPeriod {
  start: string; // yyyy-mm-dd
  end: string;   // yyyy-mm-dd
}

export interface ReportScopeAll  { kind: 'all' }
export interface ReportScopeOrg  { kind: 'org'; org_id: string; org_code: string; org_name: string }
export type ReportScope = ReportScopeAll | ReportScopeOrg;

export interface ReportSummary {
  enterprises_total: number;
  enterprises_new_in_period: number;
  m1_submitted_in_period: number;
  essf_submitted_in_period: number;
  emmp_submitted_in_period: number;
  inspections_in_period: number;
  budget_planned_lsl: number;
  budget_grant_lsl: number;
}

export interface ReportMatrixRow {
  district_id: string;
  district: string;
  org_id: string;
  total: number;
  esmp_done: number;
  m1_done: number;
  contracts_done: number;
  bene_contrib_done: number;
  sadp_contrib_done: number;
  bp_done: number;
  borehole_done: number;
  budget_xfer_done: number;
  supervision_done: number;
  procurement_done: number;
}

export interface ReportNewEnterprise {
  id: string;
  name: string | null;
  project_title: string | null;
  district: string | null;
  resource_center: string | null;
  enterprise_type: string | null;
  org_code: string | null;
  created_at: string;
  budget_lsl: number;
}

export interface ReportM1Financials {
  m1_count: number;
  total_planned_lsl: number;
  total_incurred_lsl: number;
  cashbook_total_lsl: number;
}

export interface ReportEsmpCompliance {
  essf_filed: number;
  essf_approved: number;
  emmp_filed: number;
  emmp_approved: number;
  inspections: number;
}

export interface ReportBoreholeProgress {
  drilling_permit: number;
  borehole_drilling: number;
  borehole_casing: number;
  borehole_yield_test: number;
  borehole_drilling_report: number;
  water_use_permit: number;
}

export interface ReportAppendixRow {
  id: string;
  name: string | null;
  project_title: string | null;
  district: string | null;
  resource_center: string | null;
  enterprise_type: string | null;
  org_code: string | null;
  budget_lsl: number;
  esmp: string | null;
  m1: string | null;
  bp: string | null;
}

export interface PeriodReportSnapshot {
  period: ReportPeriod;
  scope: ReportScope;
  generated_at: string;
  summary: ReportSummary;
  milestone_matrix: ReportMatrixRow[];
  new_enterprises: ReportNewEnterprise[];
  m1_financials: ReportM1Financials;
  esmp_compliance: ReportEsmpCompliance;
  borehole_progress: ReportBoreholeProgress;
  appendix: ReportAppendixRow[];
}

export interface PeriodReportArchiveRow {
  id: string;
  kind: ReportKind;
  period_start: string;
  period_end: string;
  period_label: string;
  scope_org_id: string | null;
  payload: PeriodReportSnapshot;
  title: string | null;
  notes: string | null;
  generated_by: string | null;
  generated_at: string;
}

// ============================================================================
// Period-boundary helpers (standard Jan-Dec calendar)
// ============================================================================
const iso = (d: Date) => d.toISOString().slice(0, 10);
const startOfMonth = (year: number, monthZeroBased: number) =>
  iso(new Date(Date.UTC(year, monthZeroBased, 1)));
const endOfMonth = (year: number, monthZeroBased: number) =>
  iso(new Date(Date.UTC(year, monthZeroBased + 1, 0)));

export function monthlyPeriod(year: number, monthZeroBased: number): ReportPeriod {
  return { start: startOfMonth(year, monthZeroBased), end: endOfMonth(year, monthZeroBased) };
}

export function quarterlyPeriod(year: number, quarter: 1 | 2 | 3 | 4): ReportPeriod {
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;
  return { start: startOfMonth(year, startMonth), end: endOfMonth(year, endMonth) };
}

/** "May 2026", "Q2 2026", "1 Apr – 15 May 2026" */
export function periodLabel(kind: ReportKind, period: ReportPeriod): string {
  const s = new Date(period.start + 'T00:00:00Z');
  const e = new Date(period.end + 'T00:00:00Z');
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (kind === 'monthly') {
    return `${monthNames[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  }
  if (kind === 'quarterly') {
    const q = Math.floor(s.getUTCMonth() / 3) + 1;
    return `Q${q} ${s.getUTCFullYear()}`;
  }
  // custom
  const fmt = (d: Date) =>
    `${d.getUTCDate()} ${monthNames[d.getUTCMonth()].slice(0,3)} ${d.getUTCFullYear()}`;
  return `${fmt(s)} – ${fmt(e)}`;
}

/** The "just-closed" period — what users will most commonly want to report on. */
export function defaultPeriodForKind(kind: ReportKind, today = new Date()): ReportPeriod {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  if (kind === 'monthly') {
    // last month
    return m === 0
      ? monthlyPeriod(y - 1, 11)
      : monthlyPeriod(y, m - 1);
  }
  if (kind === 'quarterly') {
    const currentQ = Math.floor(m / 3) + 1; // 1..4
    return currentQ === 1
      ? quarterlyPeriod(y - 1, 4)
      : quarterlyPeriod(y, (currentQ - 1) as 1 | 2 | 3);
  }
  // custom — default to the current month
  return monthlyPeriod(y, m);
}

// ============================================================================
// Hooks
// ============================================================================
interface GenerateArgs {
  period: ReportPeriod;
  orgId: string | null; // null = all-org (super admin only)
}

export function useGeneratePeriodReport(args: GenerateArgs | null) {
  return useQuery({
    queryKey: ['period_report', args?.period.start, args?.period.end, args?.orgId ?? 'all'],
    enabled: !!args,
    queryFn: async (): Promise<PeriodReportSnapshot> => {
      if (!args) throw new Error('No args');
      const { data, error } = await supabase.rpc('generate_period_report', {
        p_start: args.period.start,
        p_end:   args.period.end,
        p_org_id: args.orgId,
      });
      if (error) throw error;
      return data as unknown as PeriodReportSnapshot;
    },
    staleTime: 30_000,
  });
}

export function useReportArchive() {
  return useQuery({
    queryKey: ['period_reports', 'archive'],
    queryFn: async (): Promise<PeriodReportArchiveRow[]> => {
      const { data, error } = await supabase
        .from('period_reports')
        .select('*')
        .order('period_end', { ascending: false })
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PeriodReportArchiveRow[];
    },
  });
}

interface SaveArgs {
  kind: ReportKind;
  period: ReportPeriod;
  period_label: string;
  scope_org_id: string | null;
  payload: PeriodReportSnapshot;
  title?: string | null;
  notes?: string | null;
}

export function useSavePeriodReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: SaveArgs): Promise<string> => {
      const { data, error } = await supabase
        .from('period_reports')
        .insert({
          kind: a.kind,
          period_start: a.period.start,
          period_end: a.period.end,
          period_label: a.period_label,
          scope_org_id: a.scope_org_id,
          payload: a.payload as unknown as Json,
          title: a.title ?? null,
          notes: a.notes ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['period_reports'] });
    },
  });
}

export function useDeleteSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('period_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['period_reports'] });
    },
  });
}
