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
  | 'enterprise_patch'
  | 'monitoring_visit_draft';

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

/**
 * Monitoring visit save — combines both create + update + submit.
 *
 * Client generates the `visit_id` UUID upfront so the same id can be used
 * across draft saves and the final submit click. Replay decides insert vs
 * update by trying SELECT first.
 *
 * `patch` carries only the fields the user touched on THIS save so the
 * replay engine doesn't unintentionally clobber concurrent updates from
 * another device. The `to_status` field lives outside the patch so the
 * "Submit visit" button can pass status=submitted + a fresh submitted_at
 * without the caller having to assemble the timestamp.
 */
export interface MonitoringVisitDraftPayload {
  saveType: 'monitoring_visit_draft';
  visit_id: string;
  enterprise_id: string;
  /** Field-level patch — see monitoring_visits table for column list. */
  patch: Record<string, unknown>;
  /** When set, flips status (+ submitted_at if 'submitted'). */
  to_status?: 'draft' | 'submitted';
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
  | EnterprisePatchPayload
  | MonitoringVisitDraftPayload;

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
/**
 * Read `updated_at` from an arbitrary cached row. Used by every hook in
 * Phase 6 to capture the source row's `updated_at` at enqueue time, so the
 * replay engine can detect conflicts (server moved on while we were offline).
 *
 * Returns null if the row isn't cached or doesn't expose `updated_at`. In
 * that case the queue entry will replay without a conflict check.
 */
export function pickUpdatedAt(cached: unknown): string | null {
  if (!cached || typeof cached !== 'object') return null;
  const v = (cached as { updated_at?: unknown }).updated_at;
  return typeof v === 'string' ? v : null;
}

/**
 * How long to wait for the direct online save before giving up and queueing.
 *
 * The classic stuck-saving scenario: user clicks Save while `getOnlineState()`
 * still reads `'online'`, the underlying fetch starts, then the device drops
 * connection (airplane mode, walked out of LTE range, captive portal). The
 * fetch hangs indefinitely until the browser's OS-level socket timeout
 * (often 30s+), leaving the button stuck in "Saving…". The user-visible
 * symptom: works only after going back online. This timeout caps the wait
 * at a few seconds and falls through to the enqueue path, which is the
 * same code as the always-offline branch — instant feedback + replay on
 * reconnect.
 *
 * Set generously enough that a slow-but-working network on a tablet still
 * completes within the budget (3s is plenty for a single Supabase
 * INSERT/UPDATE round-trip).
 */
const ONLINE_SAVE_TIMEOUT_MS = 3000;

export async function saveOrEnqueue<T>({
  description,
  payload,
  doSave,
  applyOptimistic,
  source_updated_at,
}: SaveOrEnqueueArgs<T>): Promise<OfflineSaveResult> {
  if (getOnlineState() === 'online') {
    // Race the direct save against a timeout. If the fetch is taking too
    // long (typically because the device dropped connection mid-save), we
    // bail and re-route the write through the offline queue. The original
    // fetch continues running in the background until it errors or
    // succeeds; if it eventually succeeds, the queued duplicate will hit
    // the Phase 6 conflict gate on replay and the user is prompted to
    // pick a winner — better than an indefinitely-spinning Save button.
    const TIMED_OUT = Symbol('save-timed-out');
    try {
      const outcome = await Promise.race<typeof TIMED_OUT | 'ok'>([
        doSave().then(() => 'ok' as const),
        new Promise<typeof TIMED_OUT>((resolve) =>
          setTimeout(() => resolve(TIMED_OUT), ONLINE_SAVE_TIMEOUT_MS),
        ),
      ]);
      if (outcome === 'ok') {
        return { online: true };
      }
      // Timeout — fall through to the enqueue path below.
    } catch (e) {
      // doSave rejected with a real error (RLS denial, validation, schema
      // mismatch, etc.). Surface it directly; the caller's onError handler
      // shows the message. We do NOT enqueue here because the same error
      // would re-occur on replay.
      throw e;
    }
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
