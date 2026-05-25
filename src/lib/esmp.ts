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
    mutationFn: async (payload: { responses: Record<string, unknown>; filled_by?: string | null }) => {
      // Upsert: try insert (if no row), else update
      const existing = await supabase
        .from('essf_submissions')
        .select('id, status')
        .eq('enterprise_id', enterpriseId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        if (existing.data.status === 'approved') {
          throw new Error('Cannot edit an approved ESSF. Ask an admin to reopen it.');
        }
        const { error } = await supabase
          .from('essf_submissions')
          .update({ responses: payload.responses as Database['public']['Tables']['essf_submissions']['Update']['responses'] })
          .eq('id', existing.data.id);
        if (error) throw error;
      } else {
        const insertPayload: Database['public']['Tables']['essf_submissions']['Insert'] = {
          enterprise_id: enterpriseId,
          responses: payload.responses as Database['public']['Tables']['essf_submissions']['Insert']['responses'],
          filled_by: payload.filled_by ?? null,
          status: 'draft',
        };
        const { error } = await supabase.from('essf_submissions').insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['essf', enterpriseId] }),
  });
}

export function useTransitionEssf(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { to: SubmissionStatus; userId: string }) => {
      const patch: Database['public']['Tables']['essf_submissions']['Update'] = { status: input.to };
      if (input.to === 'submitted') patch.submitted_at = new Date().toISOString();
      if (input.to === 'approved') {
        patch.approved_at = new Date().toISOString();
        patch.approved_by = input.userId;
      }
      const { error } = await supabase
        .from('essf_submissions')
        .update(patch)
        .eq('enterprise_id', enterpriseId);
      if (error) throw error;
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
    mutationFn: async (payload: { responses: Record<string, unknown>; filled_by?: string | null }) => {
      if (!templateId) throw new Error('No EMMP template selected.');
      const existing = await supabase
        .from('emmp_submissions')
        .select('id, status')
        .eq('enterprise_id', enterpriseId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data) {
        if (existing.data.status === 'approved') {
          throw new Error('Cannot edit an approved EMMP. Ask an admin to reopen it.');
        }
        const { error } = await supabase
          .from('emmp_submissions')
          .update({ responses: payload.responses as Database['public']['Tables']['emmp_submissions']['Update']['responses'] })
          .eq('id', existing.data.id);
        if (error) throw error;
      } else {
        const insertPayload: Database['public']['Tables']['emmp_submissions']['Insert'] = {
          enterprise_id: enterpriseId,
          template_id: templateId,
          responses: payload.responses as Database['public']['Tables']['emmp_submissions']['Insert']['responses'],
          filled_by: payload.filled_by ?? null,
          status: 'draft',
        };
        const { error } = await supabase.from('emmp_submissions').insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emmp', enterpriseId] }),
  });
}

export function useTransitionEmmp(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { to: SubmissionStatus; userId: string }) => {
      const patch: Database['public']['Tables']['emmp_submissions']['Update'] = { status: input.to };
      if (input.to === 'submitted') patch.submitted_at = new Date().toISOString();
      if (input.to === 'approved') {
        patch.approved_at = new Date().toISOString();
        patch.approved_by = input.userId;
      }
      const { error } = await supabase
        .from('emmp_submissions')
        .update(patch)
        .eq('enterprise_id', enterpriseId);
      if (error) throw error;
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

export function useSaveInspectionDraft(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      responses: Record<string, unknown>;
      inspected_by_name?: string;
      visit_date?: string;
    }) => {
      const patch: Database['public']['Tables']['inspection_visits']['Update'] = {
        responses: payload.responses as Database['public']['Tables']['inspection_visits']['Update']['responses'],
      };
      if (payload.inspected_by_name !== undefined) patch.inspected_by_name = payload.inspected_by_name;
      if (payload.visit_date !== undefined) patch.visit_date = payload.visit_date;
      const { error } = await supabase.from('inspection_visits').update(patch).eq('id', visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspection-visit', visitId] });
    },
  });
}

export function useTransitionInspection(visitId: string, enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { to: SubmissionStatus; userId: string }) => {
      const patch: Database['public']['Tables']['inspection_visits']['Update'] = { status: input.to };
      if (input.to === 'submitted') patch.submitted_at = new Date().toISOString();
      if (input.to === 'approved') {
        patch.approved_at = new Date().toISOString();
        patch.approved_by = input.userId;
      }
      const { error } = await supabase.from('inspection_visits').update(patch).eq('id', visitId);
      if (error) throw error;
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
