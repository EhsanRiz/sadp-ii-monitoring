/**
 * React Query hooks for the Milestone 1 (M1) reporting module.
 *
 * Schema-wise, m1_submissions is a sibling to essf_submissions / emmp_submissions
 * — one per enterprise, draft → submitted → approved workflow, no self-approval
 * (enforced in app code via canApproveSubmission imported from lib/esmp).
 *
 * Phase 1 only writes to the `narrative` jsonb column. Cashbook, financial_report,
 * and bank_reconciliation jsonb columns exist but are populated by Phase 2 forms.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AppRole } from '@/lib/auth';
import type {
  Database,
  Json,
  M1SubmissionRow,
  SubmissionStatus,
} from '@/types/database';

// ============================================================================
// Reads
// ============================================================================
export function useM1Submission(enterpriseId: string | undefined) {
  return useQuery({
    queryKey: ['m1', enterpriseId],
    queryFn: async (): Promise<M1SubmissionRow | null> => {
      if (!enterpriseId) return null;
      const { data, error } = await supabase
        .from('m1_submissions')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .maybeSingle();
      if (error) throw error;
      return (data as M1SubmissionRow | null) ?? null;
    },
    enabled: !!enterpriseId,
  });
}

// ============================================================================
// Writes
// ============================================================================

/** Patch fields that are safe to save during a draft edit. */
export interface M1DraftPatch {
  narrative?: Record<string, unknown>;
  cashbook?: Record<string, unknown>;
  financial_report?: Record<string, unknown>;
  bank_reconciliation?: Record<string, unknown>;
  m1_period_start?: string | null;
  m1_period_end?: string | null;
  report_date?: string | null;
  filled_by?: string | null;
}

export function useSaveM1Draft(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: M1DraftPatch) => {
      const existing = await supabase
        .from('m1_submissions')
        .select('id, status')
        .eq('enterprise_id', enterpriseId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      // Cast Record<string, unknown> through Json — supabase-js generated
      // types treat jsonb as the strict Json union which doesn't permit
      // arbitrary records without an explicit cast.
      const jsonbPatch: Database['public']['Tables']['m1_submissions']['Update'] = {
        ...(payload.narrative          !== undefined && { narrative:          payload.narrative          as unknown as Json }),
        ...(payload.cashbook           !== undefined && { cashbook:           payload.cashbook           as unknown as Json }),
        ...(payload.financial_report   !== undefined && { financial_report:   payload.financial_report   as unknown as Json }),
        ...(payload.bank_reconciliation!== undefined && { bank_reconciliation:payload.bank_reconciliation as unknown as Json }),
        ...(payload.m1_period_start    !== undefined && { m1_period_start:    payload.m1_period_start }),
        ...(payload.m1_period_end      !== undefined && { m1_period_end:      payload.m1_period_end }),
        ...(payload.report_date        !== undefined && { report_date:        payload.report_date }),
        ...(payload.filled_by          !== undefined && { filled_by:          payload.filled_by }),
      };
      if (existing.data) {
        if (existing.data.status === 'approved') {
          throw new Error('Cannot edit an approved M1 submission. Ask an admin to reopen it.');
        }
        const { error } = await supabase
          .from('m1_submissions')
          .update(jsonbPatch)
          .eq('id', existing.data.id);
        if (error) throw error;
      } else {
        const insert: Database['public']['Tables']['m1_submissions']['Insert'] = {
          enterprise_id: enterpriseId,
          status: 'draft',
          ...jsonbPatch,
        };
        const { error } = await supabase.from('m1_submissions').insert(insert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['m1', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-m1-status', enterpriseId] });
    },
  });
}

/**
 * Transition the M1 submission between workflow statuses.
 *   draft → submitted   : field_supervisor / me_officer / team_leader / super_admin
 *   submitted → approved: me_officer / team_leader / super_admin (no self-approval)
 *   approved → draft    : same approver set (reopen for editing)
 */
export function useTransitionM1(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { to: SubmissionStatus; userId: string }) => {
      const patch: Database['public']['Tables']['m1_submissions']['Update'] = { status: input.to };
      if (input.to === 'submitted') patch.submitted_at = new Date().toISOString();
      if (input.to === 'approved') {
        patch.approved_at = new Date().toISOString();
        patch.approved_by = input.userId;
      }
      const { error } = await supabase
        .from('m1_submissions')
        .update(patch)
        .eq('enterprise_id', enterpriseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['m1', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-m1-status', enterpriseId] });
    },
  });
}

// ============================================================================
// Role-based action helpers — share semantics with ESSF/EMMP
// ============================================================================
export function canSubmitM1(role: AppRole | null): boolean {
  if (!role) return false;
  return ['super_admin', 'field_supervisor', 'me_officer', 'team_leader'].includes(role);
}

export function canApproveM1(role: AppRole | null): boolean {
  if (!role) return false;
  return ['super_admin', 'me_officer', 'team_leader'].includes(role);
}

export function canApproveM1Submission(
  role: AppRole | null,
  currentUserId: string | null,
  submission: { filled_by: string | null; status: SubmissionStatus } | null | undefined,
): boolean {
  if (!submission) return false;
  if (submission.status !== 'submitted') return false;
  if (!canApproveM1(role)) return false;
  if (role === 'super_admin') return true;
  if (currentUserId && submission.filled_by === currentUserId) return false;
  return true;
}

export function canReopenM1(role: AppRole | null): boolean {
  return canApproveM1(role);
}
