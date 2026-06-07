/**
 * React Query hooks + helpers for enterprises.
 * RLS scopes results to the caller's organization (Super Admin sees all).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { saveOrEnqueue, pickUpdatedAt, type OfflineSaveResult } from '@/lib/offline-saves';
import { applyEnterprisePatch } from '@/lib/offline-replay';
import type {
  AuditLogRow,
  DrillingStatus,
  EnterpriseLifecycleRow,
  EnterpriseRow,
  EsmpStatus,
  Json,
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
 * Single row from the enterprise_timeline view (migration 240). Each row is a
 * named event — created / submitted / approved / imported / pdf_uploaded —
 * across all enterprise-scoped tables.
 */
export interface EnterpriseTimelineRow {
  id: string;
  enterprise_id: string;
  occurred_at: string;
  category: 'enterprise' | 'essf' | 'emmp' | 'inspection' | 'm1' | 'm1_doc';
  event_type: 'created' | 'submitted' | 'approved' | 'pdf_uploaded' | 'uploaded';
  actor_id: string | null;
  source_pdf_path: string | null;
  description: string;
}

/**
 * Pull the named-event timeline for one enterprise. Backed by the
 * `enterprise_timeline` SQL view (security_invoker = on, so RLS on the
 * underlying tables decides what each user sees).
 */
export function useEnterpriseTimeline(id: string | undefined) {
  return useQuery({
    queryKey: ['enterprise-timeline', id],
    queryFn: async (): Promise<EnterpriseTimelineRow[]> => {
      if (!id) return [];
      const { data, error } = await (supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (
                col: string,
                opts: { ascending: boolean; nullsFirst?: boolean },
              ) => Promise<{ data: EnterpriseTimelineRow[] | null; error: { message: string } | null }>;
            };
          };
        };
      })
        .from('enterprise_timeline')
        .select('*')
        .eq('enterprise_id', id)
        .order('occurred_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });
}

/**
 * Resolve user UUIDs → `user_profiles.full_name` for display in History.
 * Returns a Map keyed by uuid. Silently drops ids RLS blocks.
 */
export function useUserDisplayNames(userIds: Array<string | null | undefined>) {
  const cleaned = Array.from(new Set(userIds.filter((u): u is string => !!u))).sort();
  return useQuery({
    queryKey: ['user-display-names', cleaned.join(',')],
    queryFn: async (): Promise<Map<string, string>> => {
      if (cleaned.length === 0) return new Map();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', cleaned);
      if (error) throw error;
      const out = new Map<string, string>();
      for (const row of (data ?? []) as Array<{ id: string; full_name: string }>) {
        out.set(row.id, row.full_name);
      }
      return out;
    },
    enabled: cleaned.length > 0,
    staleTime: 5 * 60_000,
  });
}

// ============================================================================
// Storage metadata for the legacy ESMP PDF upload (bucket: esmp-pdfs)
// ============================================================================
export interface UploadedPdfMeta {
  /** Storage object name, e.g. "<enterpriseId>.pdf" */
  name: string;
  /** Bytes */
  size: number;
  /** ISO date string — when the file was last replaced */
  uploaded_at: string;
}

export function useUploadedEsmpPdfMeta(enterpriseId: string | undefined, present: boolean) {
  return useQuery({
    queryKey: ['esmp-pdf-meta', enterpriseId],
    queryFn: async (): Promise<UploadedPdfMeta | null> => {
      if (!enterpriseId) return null;
      const name = `${enterpriseId}.pdf`;
      const { data, error } = await supabase.storage
        .from('esmp-pdfs')
        .list('', { search: name, limit: 1 });
      if (error) throw error;
      const row = data?.find((d) => d.name === name);
      if (!row) return null;
      const meta = (row.metadata ?? {}) as { size?: number };
      return {
        name,
        size: meta.size ?? 0,
        uploaded_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
      };
    },
    enabled: !!enterpriseId && present,
  });
}

/** Bytes → "5.1 MB" / "248 KB" / "812 B" */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
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

// =================================================================
// Lifecycle (11-milestone matrix). Joins essf/emmp/m1 in
// a server-side view; we just read it.
// =================================================================
export function useEnterpriseLifecycle() {
  return useQuery({
    queryKey: ['enterprise-lifecycle'],
    queryFn: async (): Promise<Map<string, EnterpriseLifecycleRow>> => {
      const { data, error } = await supabase
        .from('enterprise_lifecycle')
        .select('*');
      if (error) throw error;
      const map = new Map<string, EnterpriseLifecycleRow>();
      for (const r of (data ?? []) as EnterpriseLifecycleRow[]) {
        map.set(r.enterprise_id, r);
      }
      return map;
    },
    staleTime: 60_000,
  });
}

export function useSaveEnterpriseLifecycle(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: Record<string, 'yes' | 'no' | 'n_a'>): Promise<OfflineSaveResult> => {
      const sourceUpdatedAt = pickUpdatedAt(qc.getQueryData(['enterprise', enterpriseId]));
      return saveOrEnqueue({
        description: 'Save lifecycle milestones',
        source_updated_at: sourceUpdatedAt,
        payload: {
          saveType: 'enterprise_patch',
          enterprise_id: enterpriseId,
          patch: { lifecycle_status: next as unknown as Json },
        },
        doSave: () =>
          applyEnterprisePatch({
            saveType: 'enterprise_patch',
            enterprise_id: enterpriseId,
            patch: { lifecycle_status: next as unknown as Json },
          }),
        applyOptimistic: () => {
          qc.setQueryData(['enterprise', enterpriseId], (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            return { ...(old as Record<string, unknown>), lifecycle_status: next };
          });
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise-lifecycle'] });
      qc.invalidateQueries({ queryKey: ['enterprise', enterpriseId] });
    },
  });
}

/**
 * Generic enterprise UPDATE — used by the cover-page editor and the borehole
 * supervision form. Wraps `applyEnterprisePatch` with the offline queue so
 * field edits made offline replay automatically when online.
 */
export function useSaveEnterprisePatch(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      description: string;
      patch: Record<string, unknown>;
    }): Promise<OfflineSaveResult> => {
      const sourceUpdatedAt = pickUpdatedAt(qc.getQueryData(['enterprise', enterpriseId]));
      return saveOrEnqueue({
        description: input.description,
        source_updated_at: sourceUpdatedAt,
        payload: {
          saveType: 'enterprise_patch',
          enterprise_id: enterpriseId,
          patch: input.patch,
        },
        doSave: () =>
          applyEnterprisePatch({
            saveType: 'enterprise_patch',
            enterprise_id: enterpriseId,
            patch: input.patch,
          }),
        applyOptimistic: () => {
          qc.setQueryData(['enterprise', enterpriseId], (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            return { ...(old as Record<string, unknown>), ...input.patch };
          });
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprises'] });
      qc.invalidateQueries({ queryKey: ['enterprise-history', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-lifecycle'] });
    },
  });
}
