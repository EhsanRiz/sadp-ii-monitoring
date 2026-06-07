/**
 * Offline-aware save helpers.
 *
 *   - When online → run the save normally.
 *   - When offline → push the same payload onto the queue and apply an
 *     optimistic update to the React Query cache so the UI looks the same as
 *     if the save had landed. Replay (see ./offline-replay.ts) drains the
 *     queue when the device reconnects.
 *
 * Each save TYPE has a known shape — that lets the replay engine dispatch
 * the right write without re-encoding table/column names per call site.
 */
import { getOnlineState } from '@/lib/online-status';
import { enqueue } from '@/lib/offline-db';

/** All save-type discriminators we know how to replay. */
export type FormSaveType =
  | 'essf_draft'
  | 'emmp_draft'
  | 'inspection_draft'
  | 'm1_draft'
  | 'essf_transition'
  | 'emmp_transition'
  | 'inspection_transition'
  | 'm1_transition'
  | 'enterprise_patch';

/** Transitions follow the submission workflow: draft → submitted → approved → draft (reopen). */
export type SubmissionTransition = 'draft' | 'submitted' | 'approved';

export interface EssfTransitionPayload {
  saveType: 'essf_transition';
  enterprise_id: string;
  to: SubmissionTransition;
  user_id: string;
}

export interface EmmpTransitionPayload {
  saveType: 'emmp_transition';
  enterprise_id: string;
  to: SubmissionTransition;
  user_id: string;
}

export interface InspectionTransitionPayload {
  saveType: 'inspection_transition';
  visit_id: string;
  enterprise_id: string;
  to: SubmissionTransition;
  user_id: string;
}

export interface M1TransitionPayload {
  saveType: 'm1_transition';
  enterprise_id: string;
  to: SubmissionTransition;
  user_id: string;
}

/**
 * Generic enterprise UPDATE — covers cover-page edits, lifecycle milestone
 * updates, borehole supervision, and any other field-level write that
 * targets the enterprises row.
 *
 * The patch is applied as-is; columns the app shouldn't touch (id,
 * organization_id, audit columns) just shouldn't be in the patch. This
 * keeps the offline queue agnostic to which fields the user edited.
 */
export interface EnterprisePatchPayload {
  saveType: 'enterprise_patch';
  enterprise_id: string;
  patch: Record<string, unknown>;
}

export interface EssfDraftPayload {
  saveType: 'essf_draft';
  enterprise_id: string;
  responses: Record<string, unknown>;
  filled_by: string | null;
}

export interface EmmpDraftPayload {
  saveType: 'emmp_draft';
  enterprise_id: string;
  template_id: string;
  responses: Record<string, unknown>;
  filled_by: string | null;
}

export interface InspectionDraftPayload {
  saveType: 'inspection_draft';
  visit_id: string;
  /** enterprise_id passed for queue grouping + cache invalidation on replay. */
  enterprise_id: string | null;
  responses: Record<string, unknown>;
  inspected_by_name?: string;
  visit_date?: string;
}

export interface M1DraftPayload {
  saveType: 'm1_draft';
  enterprise_id: string;
  /** Partial — only the fields the user touched on this save. */
  patch: {
    narrative?: Record<string, unknown>;
    cashbook?: Record<string, unknown>;
    financial_report?: Record<string, unknown>;
    bank_reconciliation?: Record<string, unknown>;
    m1_period_start?: string | null;
    m1_period_end?: string | null;
    report_date?: string | null;
    filled_by?: string | null;
  };
}

export type FormSavePayload =
  | EssfDraftPayload
  | EmmpDraftPayload
  | InspectionDraftPayload
  | M1DraftPayload
  | EssfTransitionPayload
  | EmmpTransitionPayload
  | InspectionTransitionPayload
  | M1TransitionPayload
  | EnterprisePatchPayload;

export interface OfflineSaveResult {
  /** True when the save was applied online; false when it was queued. */
  online: boolean;
  /** Queue entry id, if queued. */
  queued_id?: string;
}

interface SaveOrEnqueueArgs<T> {
  description: string;
  payload: FormSavePayload;
  doSave: () => Promise<T>;
  /** Optimistic update applied when the save is queued, so the UI reflects
   *  the user's intent even though nothing reached the server yet. */
  applyOptimistic?: () => void;
  /** Optional source row updated_at — captured at save time for Phase 6
   *  conflict detection. */
  source_updated_at?: string | null;
}

/**
 * Run `doSave` when online, otherwise queue the payload + apply the optimistic
 * update. Returns metadata about which path was taken so callers can show the
 * right toast.
 */
export async function saveOrEnqueue<T>({
  description,
  payload,
  doSave,
  applyOptimistic,
  source_updated_at,
}: SaveOrEnqueueArgs<T>): Promise<OfflineSaveResult> {
  if (getOnlineState() === 'online') {
    await doSave();
    return { online: true };
  }
  const entry = await enqueue({
    kind: 'mutation',
    description,
    enterprise_id: 'enterprise_id' in payload ? payload.enterprise_id ?? null : null,
    payload: payload as unknown as Record<string, unknown>,
    source_updated_at: source_updated_at ?? null,
  });
  applyOptimistic?.();
  return { online: false, queued_id: entry.id };
}
