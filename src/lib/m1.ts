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

// ============================================================================
// Source M1 PDF — upload + auto-extraction (Phase 3a)
// ============================================================================

const M1_SOURCE_BUCKET = 'm1-supporting-docs';

/** Storage path for a given enterprise's source M1 PDF. Always `<id>/_source.pdf`. */
export function m1SourcePdfPath(enterpriseId: string): string {
  return `${enterpriseId}/_source.pdf`;
}

export interface UploadedM1PdfMeta {
  path: string;
  size: number;
  uploaded_at: string;
}

/**
 * Read storage metadata for the source M1 PDF (size + last-modified) so the UI
 * can render a file card without separately tracking it. Returns null if no
 * source PDF is on file.
 */
export function useUploadedM1PdfMeta(enterpriseId: string | undefined, present: boolean) {
  return useQuery({
    queryKey: ['m1-source-pdf-meta', enterpriseId],
    queryFn: async (): Promise<UploadedM1PdfMeta | null> => {
      if (!enterpriseId) return null;
      // storage.list with search lets us look up a known filename inside a
      // prefix without paginating the whole bucket.
      const { data, error } = await supabase.storage
        .from(M1_SOURCE_BUCKET)
        .list(enterpriseId, { search: '_source.pdf', limit: 1 });
      if (error) throw error;
      const row = data?.find((d) => d.name === '_source.pdf');
      if (!row) return null;
      const meta = (row.metadata ?? {}) as { size?: number };
      return {
        path: `${enterpriseId}/_source.pdf`,
        size: meta.size ?? 0,
        uploaded_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
      };
    },
    enabled: !!enterpriseId && present,
  });
}

/**
 * Upload (or replace) the source M1 PDF for an enterprise, then stamp
 * uploaded_pdf_path / uploaded_pdf_uploaded_at on the m1_submissions row
 * (creating a draft row if none exists).
 */
export function useUploadM1SourcePdf(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!file) throw new Error('No file provided');
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Source M1 PDF must be a .pdf file');
      }
      const path = m1SourcePdfPath(enterpriseId);
      const up = await supabase.storage
        .from(M1_SOURCE_BUCKET)
        .upload(path, file, { upsert: true, contentType: 'application/pdf' });
      if (up.error) {
        // Surface a more helpful message when the upload silently hits a size
        // limit. Supabase storage returns generic-ish errors here; we annotate
        // with the file size + a pointer to the project-level setting that
        // commonly overrides the bucket limit.
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(
          `${up.error.message}. File size: ${sizeMb} MB. If the file is large, also check the project-level "Upload file size limit" at Supabase Dashboard → Settings → Storage.`,
        );
      }

      // Stamp the path on the m1_submissions row (create draft if missing).
      const existing = await supabase
        .from('m1_submissions')
        .select('id, status')
        .eq('enterprise_id', enterpriseId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      const stamp = {
        uploaded_pdf_path: path,
        uploaded_pdf_uploaded_at: new Date().toISOString(),
      };
      if (existing.data) {
        const { error } = await supabase
          .from('m1_submissions')
          .update(stamp)
          .eq('id', existing.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('m1_submissions').insert({
          enterprise_id: enterpriseId,
          status: 'draft',
          ...stamp,
        });
        if (error) throw error;
      }
      return { path };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['m1', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['m1-source-pdf-meta', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-m1-status', enterpriseId] });
    },
  });
}

/**
 * Delete the uploaded source M1 PDF from storage AND clear the
 * uploaded_pdf_path / uploaded_pdf_uploaded_at columns on the m1_submissions
 * row. Used when the wrong file was uploaded — gives the user an explicit
 * "undo upload" affordance rather than just overwriting on re-upload.
 *
 * Leaves narrative + cashbook + status alone — an already-imported draft
 * keeps its contents even if the source file is removed, so the field
 * supervisor can finish editing manually. Clearing the draft is a separate
 * action (form-level "Discard" if needed).
 */
export function useRemoveM1SourcePdf(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const path = m1SourcePdfPath(enterpriseId);
      // Storage delete — ignore "not found" so the action is idempotent.
      const rm = await supabase.storage.from(M1_SOURCE_BUCKET).remove([path]);
      if (rm.error && !/not.found/i.test(rm.error.message)) throw rm.error;
      // Clear the columns. RLS allows non-admins to update their org's draft
      // submissions, so this works for field supervisors too.
      const { error } = await supabase
        .from('m1_submissions')
        .update({ uploaded_pdf_path: null, uploaded_pdf_uploaded_at: null })
        .eq('enterprise_id', enterpriseId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['m1', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['m1-source-pdf-meta', enterpriseId] });
    },
  });
}

/**
 * Wipe the M1 submission's form data back to empty so the user can start
 * over after a bad auto-extraction. Refuses to touch approved submissions.
 *
 * What's CLEARED:
 *   - narrative, cashbook, financial_report, bank_reconciliation
 *   - imported_from_pdf_path, imported_at, import_notes (no more "auto-
 *     imported" banner)
 *   - status reset to 'draft' (covers the rare case where a submitted form
 *     needs reset before approval bounces it back)
 *
 * What's KEPT:
 *   - uploaded_pdf_path + uploaded_pdf_uploaded_at (the source file is still
 *     on file; user can re-extract immediately if they want)
 *   - m1_period_start / m1_period_end / report_date (project metadata is
 *     usually correct even when the form data isn't)
 *   - submitted_at / approved_at / approved_by (historical record stays —
 *     if a previously-approved M1 was reopened then reset, that audit
 *     trail survives)
 */
export function useDiscardM1Draft(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const existing = await supabase
        .from('m1_submissions')
        .select('id, status')
        .eq('enterprise_id', enterpriseId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (!existing.data) throw new Error('No M1 submission to discard.');
      if (existing.data.status === 'approved') {
        throw new Error('Cannot discard an approved M1. Reopen it for editing first.');
      }
      const { error } = await supabase
        .from('m1_submissions')
        .update({
          narrative: {} as Json,
          cashbook: {} as Json,
          financial_report: {} as Json,
          bank_reconciliation: {} as Json,
          imported_from_pdf_path: null,
          imported_at: null,
          import_notes: null,
          status: 'draft',
        })
        .eq('id', existing.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['m1', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-m1-status', enterpriseId] });
    },
  });
}

/** Notes object surfaced from Claude via the extract-m1-pdf edge function. */
export interface M1ImportNote {
  field?: string;
  note: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface ExtractM1Result {
  ok: boolean;
  enterprise_id: string;
  narrative_sections_filled: number;
  cashbook_entry_count: number;
  notes: M1ImportNote[];
}

export class ExtractM1Error extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ExtractM1Error';
    this.status = status;
  }
}

/**
 * Call the extract-m1-pdf edge function. The edge function reads the previously
 * uploaded source PDF, sends it to Claude, parses the response, and writes a
 * draft m1_submissions row stamped with imported_from_pdf_path / imported_at /
 * import_notes. Field supervisor reviews + corrects in the M1 page before
 * submitting.
 */
export function useExtractM1Pdf(enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ExtractM1Result> => {
      // NOTE: deployed under "-v3" slug.
      //   -v1 pulled from supporting docs (bank statements / receipts) too,
      //        over-counting cashbook rows.
      //   -v2 scoped extraction to the cashbook page only.
      //   -v3 adds explicit column-to-field mapping (PDF ITEM = code → item;
      //        PDF BUDGET = type → budget_code; full supplier names not
      //        truncated). Fixes the supplier-in-item-field bug.
      // Future re-deploys bump the suffix per PROGRESS.md §6.
      const { data, error } = await supabase.functions.invoke('extract-m1-pdf-v3', {
        body: { enterpriseId },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        let serverMsg = error.message ?? 'Extraction failed';
        const status = ctx?.status ?? 0;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            if (body && typeof body === 'object' && typeof body.error === 'string') {
              serverMsg = body.error;
            }
          } catch {
            /* ignore non-JSON body */
          }
        }
        throw new ExtractM1Error(serverMsg, status);
      }
      if (!data?.ok) {
        throw new ExtractM1Error((data as { error?: string })?.error ?? 'Extraction failed', 0);
      }
      return data as ExtractM1Result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['m1', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-m1-status', enterpriseId] });
    },
  });
}

/** Bytes → "5.1 MB" / "248 KB" — kept here so M1 callers don't import from lib/enterprises. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
