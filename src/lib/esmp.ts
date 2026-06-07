/**
 * React Query hooks for Phase 2 ESMP forms:
 *   - useEssfSubmission        — 0 or 1 per enterprise
 *   - useEmmpTemplateForType   — pick the right EMMP template for an enterprise type
 *   - useEmmpSubmission        — 0 or 1 per enterprise
 *   - useInspectionVisits      — list of inspection visits for an enterprise
 *   - useInspectionVisit       — single inspection
 *   - useEnterpriseEsmpStatus  — read from the computed view for one enterprise
 *
 * Plus mutations for save/submit/approve, with role checks.
 *
 * Approval rules (enforced in app code on top of RLS):
 *   - draft → submitted   : super_admin OR field_supervisor OR me_officer OR team_leader
 *   - submitted → approved: super_admin OR me_officer OR team_leader
 *   - approver MUST be a different user than the one who submitted (no self-approval)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AppRole } from '@/lib/auth';
import { saveOrEnqueue, pickUpdatedAt, type OfflineSaveResult } from '@/lib/offline-saves';
import {
  applyEssfDraft,
  applyEmmpDraft,
  applyInspectionDraft,
  applyEssfTransition,
  applyEmmpTransition,
  applyInspectionTransition,
} from '@/lib/offline-replay';
import type {
  Database,
  EmmpTemplateRow,
  EmmpSubmissionRow,
  EssfSubmissionRow,
  InspectionVisitRow,
  EnterpriseEsmpStatusRow,
  SubmissionStatus,
} from '@/types/database';

// ============================================================================
// ESSF
// ============================================================================
export function useEssfSubmission(enterpriseId: string | undefined) {
  return useQuery({
    queryKey: ['essf', enterpriseId],
    queryFn: async (): Promise<EssfSubmissionRow | null> => {
      if (!enterpriseId) return null;
      const { data, error } = await supabase
        .from('essf_submissions')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .maybeSingle();
      if (error) throw error;
      return (data as EssfSubmissionRow | null) ?? null;
    },
    enabled: !!enterpriseId,
  });
}

export function useSaveEssfDraft(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: { responses: Record<string, unknown>; filled_by?: string | null },
    ): Promise<OfflineSaveResult> => {
      const sourceUpdatedAt = pickUpdatedAt(qc.getQueryData(['essf', enterpriseId]));
      return saveOrEnqueue({
        description: 'Save ESSF draft',
        source_updated_at: sourceUpdatedAt,
        payload: {
          saveType: 'essf_draft',
          enterprise_id: enterpriseId,
          responses: payload.responses,
          filled_by: payload.filled_by ?? null,
        },
        doSave: () =>
          applyEssfDraft({
            saveType: 'essf_draft',
            enterprise_id: enterpriseId,
            responses: payload.responses,
            filled_by: payload.filled_by ?? null,
          }),
        applyOptimistic: () => {
          // While offline, patch the cached ESSF so the form reflects the
          // user's most recent save. The eventual replay will refresh it
          // with the canonical server state.
          qc.setQueryData(['essf', enterpriseId], (old: unknown) => {
            const base = (old ?? {
              enterprise_id: enterpriseId,
              status: 'draft',
              responses: {},
            }) as Record<string, unknown>;
            return { ...base, responses: payload.responses };
          });
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['essf', enterpriseId] }),
  });
}

export function useTransitionEssf(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { to: SubmissionStatus; userId: string }): Promise<OfflineSaveResult> => {
      const sourceUpdatedAt = pickUpdatedAt(qc.getQueryData(['essf', enterpriseId]));
      return saveOrEnqueue({
        description: `ESSF transition → ${input.to}`,
        source_updated_at: sourceUpdatedAt,
        payload: {
          saveType: 'essf_transition',
          enterprise_id: enterpriseId,
          to: input.to,
          user_id: input.userId,
        },
        doSave: () =>
          applyEssfTransition({
            saveType: 'essf_transition',
            enterprise_id: enterpriseId,
            to: input.to,
            user_id: input.userId,
          }),
        applyOptimistic: () => {
          qc.setQueryData(['essf', enterpriseId], (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            const patch: Record<string, unknown> = { status: input.to };
            if (input.to === 'submitted') patch.submitted_at = new Date().toISOString();
            if (input.to === 'approved') {
              patch.approved_at = new Date().toISOString();
              patch.approved_by = input.userId;
            }
            return { ...(old as Record<string, unknown>), ...patch };
          });
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['essf', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-esmp-status', enterpriseId] });
    },
  });
}

// ============================================================================
// EMMP
// ============================================================================
export function useEmmpTemplateForType(enterpriseTypeId: number | undefined) {
  return useQuery({
    queryKey: ['emmp-template-for-type', enterpriseTypeId],
    queryFn: async (): Promise<EmmpTemplateRow | null> => {
      if (!enterpriseTypeId) return null;
      const { data, error } = await supabase
        .from('emmp_templates')
        .select('*')
        .contains('enterprise_type_ids', [enterpriseTypeId])
        .maybeSingle();
      if (error) throw error;
      return (data as EmmpTemplateRow | null) ?? null;
    },
    enabled: !!enterpriseTypeId,
    staleTime: 30 * 60_000,
  });
}

export function useEmmpSubmission(enterpriseId: string | undefined) {
  return useQuery({
    queryKey: ['emmp', enterpriseId],
    queryFn: async (): Promise<EmmpSubmissionRow | null> => {
      if (!enterpriseId) return null;
      const { data, error } = await supabase
        .from('emmp_submissions')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .maybeSingle();
      if (error) throw error;
      return (data as EmmpSubmissionRow | null) ?? null;
    },
    enabled: !!enterpriseId,
  });
}

export function useSaveEmmpDraft(enterpriseId: string, templateId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: { responses: Record<string, unknown>; filled_by?: string | null },
    ): Promise<OfflineSaveResult> => {
      if (!templateId) throw new Error('No EMMP template selected.');
      const sourceUpdatedAt = pickUpdatedAt(qc.getQueryData(['emmp', enterpriseId]));
      return saveOrEnqueue({
        description: 'Save EMMP draft',
        source_updated_at: sourceUpdatedAt,
        payload: {
          saveType: 'emmp_draft',
          enterprise_id: enterpriseId,
          template_id: templateId,
          responses: payload.responses,
          filled_by: payload.filled_by ?? null,
        },
        doSave: () =>
          applyEmmpDraft({
            saveType: 'emmp_draft',
            enterprise_id: enterpriseId,
            template_id: templateId,
            responses: payload.responses,
            filled_by: payload.filled_by ?? null,
          }),
        applyOptimistic: () => {
          qc.setQueryData(['emmp', enterpriseId], (old: unknown) => {
            const base = (old ?? {
              enterprise_id: enterpriseId,
              template_id: templateId,
              status: 'draft',
              responses: {},
            }) as Record<string, unknown>;
            return { ...base, responses: payload.responses };
          });
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emmp', enterpriseId] }),
  });
}

export function useTransitionEmmp(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { to: SubmissionStatus; userId: string }): Promise<OfflineSaveResult> => {
      const sourceUpdatedAt = pickUpdatedAt(qc.getQueryData(['emmp', enterpriseId]));
      return saveOrEnqueue({
        description: `EMMP transition → ${input.to}`,
        source_updated_at: sourceUpdatedAt,
        payload: {
          saveType: 'emmp_transition',
          enterprise_id: enterpriseId,
          to: input.to,
          user_id: input.userId,
        },
        doSave: () =>
          applyEmmpTransition({
            saveType: 'emmp_transition',
            enterprise_id: enterpriseId,
            to: input.to,
            user_id: input.userId,
          }),
        applyOptimistic: () => {
          qc.setQueryData(['emmp', enterpriseId], (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            const patch: Record<string, unknown> = { status: input.to };
            if (input.to === 'submitted') patch.submitted_at = new Date().toISOString();
            if (input.to === 'approved') {
              patch.approved_at = new Date().toISOString();
              patch.approved_by = input.userId;
            }
            return { ...(old as Record<string, unknown>), ...patch };
          });
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emmp', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-esmp-status', enterpriseId] });
    },
  });
}

// ============================================================================
// Inspection visits
// ============================================================================
export function useInspectionVisits(enterpriseId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-visits', enterpriseId],
    queryFn: async (): Promise<InspectionVisitRow[]> => {
      if (!enterpriseId) return [];
      const { data, error } = await supabase
        .from('inspection_visits')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return (data as InspectionVisitRow[]) ?? [];
    },
    enabled: !!enterpriseId,
  });
}

export function useInspectionVisit(visitId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-visit', visitId],
    queryFn: async (): Promise<InspectionVisitRow | null> => {
      if (!visitId) return null;
      const { data, error } = await supabase
        .from('inspection_visits')
        .select('*')
        .eq('id', visitId)
        .maybeSingle();
      if (error) throw error;
      return (data as InspectionVisitRow | null) ?? null;
    },
    enabled: !!visitId,
  });
}

export function useCreateInspection(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      inspected_by_name: string;
      visit_date: string;
      filled_by?: string | null;
    }): Promise<string> => {
      const insertPayload: Database['public']['Tables']['inspection_visits']['Insert'] = {
        enterprise_id: enterpriseId,
        inspected_by_name: payload.inspected_by_name,
        visit_date: payload.visit_date,
        filled_by: payload.filled_by ?? null,
        status: 'draft',
        responses: {},
      };
      const { data, error } = await supabase
        .from('inspection_visits')
        .insert(insertPayload)
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspection-visits', enterpriseId] }),
  });
}

export function useSaveInspectionDraft(visitId: string, enterpriseId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      responses: Record<string, unknown>;
      inspected_by_name?: string;
      visit_date?: string;
    }): Promise<OfflineSaveResult> => {
      const sourceUpdatedAt = pickUpdatedAt(qc.getQueryData(['inspection-visit', visitId]));
      return saveOrEnqueue({
        description: 'Save inspection draft',
        source_updated_at: sourceUpdatedAt,
        payload: {
          saveType: 'inspection_draft',
          visit_id: visitId,
          enterprise_id: enterpriseId ?? null,
          responses: payload.responses,
          inspected_by_name: payload.inspected_by_name,
          visit_date: payload.visit_date,
        },
        doSave: () =>
          applyInspectionDraft({
            saveType: 'inspection_draft',
            visit_id: visitId,
            enterprise_id: enterpriseId ?? null,
            responses: payload.responses,
            inspected_by_name: payload.inspected_by_name,
            visit_date: payload.visit_date,
          }),
        applyOptimistic: () => {
          qc.setQueryData(['inspection-visit', visitId], (old: unknown) => {
            const base = (old ?? { id: visitId, status: 'draft' }) as Record<string, unknown>;
            return {
              ...base,
              responses: payload.responses,
              ...(payload.inspected_by_name !== undefined && { inspected_by_name: payload.inspected_by_name }),
              ...(payload.visit_date !== undefined && { visit_date: payload.visit_date }),
            };
          });
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection-visit', visitId] });
    },
  });
}

export function useTransitionInspection(visitId: string, enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { to: SubmissionStatus; userId: string }): Promise<OfflineSaveResult> => {
      const sourceUpdatedAt = pickUpdatedAt(qc.getQueryData(['inspection-visit', visitId]));
      return saveOrEnqueue({
        description: `Inspection transition → ${input.to}`,
        source_updated_at: sourceUpdatedAt,
        payload: {
          saveType: 'inspection_transition',
          visit_id: visitId,
          enterprise_id: enterpriseId,
          to: input.to,
          user_id: input.userId,
        },
        doSave: () =>
          applyInspectionTransition({
            saveType: 'inspection_transition',
            visit_id: visitId,
            enterprise_id: enterpriseId,
            to: input.to,
            user_id: input.userId,
          }),
        applyOptimistic: () => {
          qc.setQueryData(['inspection-visit', visitId], (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            const patch: Record<string, unknown> = { status: input.to };
            if (input.to === 'submitted') patch.submitted_at = new Date().toISOString();
            if (input.to === 'approved') {
              patch.approved_at = new Date().toISOString();
              patch.approved_by = input.userId;
            }
            return { ...(old as Record<string, unknown>), ...patch };
          });
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection-visit', visitId] });
      qc.invalidateQueries({ queryKey: ['inspection-visits', enterpriseId] });
    },
  });
}

// ============================================================================
// Computed-status view
// ============================================================================
export function useEnterpriseEsmpStatus(enterpriseId: string | undefined) {
  return useQuery({
    queryKey: ['enterprise-esmp-status', enterpriseId],
    queryFn: async (): Promise<EnterpriseEsmpStatusRow | null> => {
      if (!enterpriseId) return null;
      const { data, error } = await supabase
        .from('enterprise_esmp_status')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .maybeSingle();
      if (error) throw error;
      return (data as EnterpriseEsmpStatusRow | null) ?? null;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// Role-based action helpers
// ============================================================================
export function canSubmit(role: AppRole | null): boolean {
  if (!role) return false;
  return ['super_admin', 'field_supervisor', 'me_officer', 'team_leader'].includes(role);
}

export function canApprove(role: AppRole | null): boolean {
  if (!role) return false;
  return ['super_admin', 'me_officer', 'team_leader'].includes(role);
}

/** Approver MUST be a different user than the one who submitted (no self-approval). */
export function canApproveSubmission(
  role: AppRole | null,
  currentUserId: string | null,
  submission: { filled_by: string | null; status: SubmissionStatus } | null | undefined,
): boolean {
  if (!submission) return false;
  if (submission.status !== 'submitted') return false;
  if (!canApprove(role)) return false;
  if (role === 'super_admin') return true; // Super Admin can self-approve in a pinch
  if (currentUserId && submission.filled_by === currentUserId) return false;
  return true;
}

// ============================================================================
// PDF auto-import (extract-esmp-pdf edge function)
// ============================================================================
export interface ImportNote {
  field?: string;
  note: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface ExtractPdfResult {
  ok: boolean;
  enterprise_id: string;
  essf: { status: 'imported'; has_data: boolean };
  emmp: { status: 'imported' | 'no_template' | 'approved_skip'; has_data: boolean };
  notes: ImportNote[];
}

/**
 * Calls the extract-esmp-pdf edge function. The function reads the
 * enterprise's uploaded ESMP PDF, sends it to Claude, parses the structured
 * response, and writes draft essf_submissions + emmp_submissions rows
 * stamped imported_from_pdf_path / imported_at / import_notes.
 *
 * Field supervisor MUST review the result before submitting — extraction is
 * not 100% accurate on scanned/handwritten forms. The UI surfaces a
 * "review and confirm" banner when essf.imported_from_pdf_path is set.
 */
/**
 * Custom error class so callers can branch on the HTTP status. The most
 * important case is 409 — the backend refuses to overwrite an already-
 * approved submission, and the UI shows a "Reopen first" affordance.
 */
export class ExtractPdfError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ExtractPdfError';
    this.status = status;
  }
}

export function useExtractEsmpPdf(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ExtractPdfResult> => {
      // NOTE: deployed under "-v4" slug. -v3 worked but used a positional
      // ${rowId}.${prefix}${i} key scheme that drifted out of sync with the
      // schema's 1-indexed item ids — extracted ticks didn't show up in
      // the form (which keys by item.id). v4 tells Claude to use item.id
      // verbatim and validates returned keys against the template.
      // Earlier slugs cannot be re-deployed cleanly.
      const { data, error } = await supabase.functions.invoke('extract-esmp-pdf-v4', {
        body: { enterpriseId },
      });
      // supabase-js wraps non-2xx responses as a FunctionsHttpError whose
      // `context` field holds the raw Response object — we read the body
      // out of it so the toast can show the actual server message instead
      // of the unhelpful "Edge Function returned a non-2xx status code".
      if (error) {
        const ctx = (error as { context?: Response }).context;
        let serverMsg = error.message ?? 'Extraction failed';
        let status = ctx?.status ?? 0;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            if (body && typeof body === 'object' && typeof body.error === 'string') {
              serverMsg = body.error;
            }
          } catch {
            /* body was empty or non-JSON; keep the default message */
          }
        }
        throw new ExtractPdfError(serverMsg, status);
      }
      if (!data?.ok) {
        throw new ExtractPdfError((data as { error?: string })?.error ?? 'Extraction failed', 0);
      }
      return data as ExtractPdfResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['essf', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['emmp', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-esmp-status', enterpriseId] });
    },
  });
}

/**
 * Reopen an already-approved submission back to draft for editing.
 * Same role set as approvers — Field Supervisors shouldn't be able to undo an
 * approval they didn't have authority to grant in the first place.
 * approved_at / approved_by / submitted_at stay set as historical record;
 * the UI surfaces this as "Previously approved on …".
 */
export function canReopen(role: AppRole | null): boolean {
  return canApprove(role);
}
