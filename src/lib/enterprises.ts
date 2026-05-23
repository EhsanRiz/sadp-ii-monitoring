/**
 * React Query hooks + helpers for enterprises.
 * RLS scopes results to the caller's organization (Super Admin sees all).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  AuditLogRow,
  DrillingStatus,
  EnterpriseRow,
  EsmpStatus,
  Milestone1ReportStatus,
} from '@/types/database';

export interface EnterpriseListFilters {
  /** Super-admin convenience: filter to a specific org (e.g. '4D' or 'RSDA'). */
  organizationCode?: string | null;
  districtId?: string | null;
  resourceCenterId?: string | null;
  enterpriseTypeId?: number | null;
  esmpStatus?: EsmpStatus | null;
  milestone1Status?: Milestone1ReportStatus | null;
  drillingStatus?: DrillingStatus | null;
  completeness?: 'minimal' | 'cover_page_ready' | null;
  search?: string;
}

export function useEnterprises(filters: EnterpriseListFilters = {}) {
  return useQuery({
    queryKey: ['enterprises', filters],
    queryFn: async (): Promise<EnterpriseRow[]> => {
      let q = supabase.from('enterprises').select('*').order('created_at', { ascending: false });
      if (filters.organizationCode) {
        // Resolve org code → id, then filter. One round-trip more than ideal
        // but keeps the URL pretty.
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('code', filters.organizationCode)
          .single();
        if (org?.id) q = q.eq('organization_id', org.id);
      }
      if (filters.districtId) q = q.eq('district_id', filters.districtId);
      if (filters.resourceCenterId) q = q.eq('resource_center_id', filters.resourceCenterId);
      if (filters.enterpriseTypeId) q = q.eq('enterprise_type_id', filters.enterpriseTypeId);
      if (filters.esmpStatus) q = q.eq('esmp_status', filters.esmpStatus);
      if (filters.milestone1Status) q = q.eq('milestone1_report_status', filters.milestone1Status);
      if (filters.drillingStatus) q = q.eq('drilling_status', filters.drillingStatus);
      if (filters.completeness) q = q.eq('registration_completeness', filters.completeness);
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        q = q.or(
          `beneficiary_short_name.ilike.%${s}%,applicant_organisation_name.ilike.%${s}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEnterprise(id: string | undefined) {
  return useQuery({
    queryKey: ['enterprise', id],
    queryFn: async (): Promise<EnterpriseRow> => {
      if (!id) throw new Error('No id');
      const { data, error } = await supabase
        .from('enterprises')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useEnterpriseHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['enterprise-history', id],
    queryFn: async (): Promise<AuditLogRow[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('table_name', 'enterprises')
        .eq('record_id', id)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });
}

/**
 * Check whether an enterprise has every cover-page-required field set —
 * mirrors the CHECK constraint in migration 060. Used to enable the
 * "Mark cover-page ready" action and the PDF download.
 */
export function isCoverPageReady(e: EnterpriseRow): boolean {
  return Boolean(
    e.project_title &&
      e.registration_number &&
      e.period_start &&
      e.period_end &&
      e.total_project_cost_lsl !== null &&
      e.total_grant_lsl !== null &&
      e.principal_applicant_name &&
      e.community_council_id &&
      e.resource_center_id,
  );
}
