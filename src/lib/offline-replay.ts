/**
 * Drain the offline queue when the device comes back online.
 *
 * For each pending entry:
 *   1. Mark as 'replaying' (bumps attempts).
 *   2. Dispatch the payload to the matching handler.
 *   3. On success → purge the entry + invalidate the relevant React Query
 *      caches so the UI re-fetches the fresh server state.
 *   4. On error → put the entry back to 'pending' with the error message.
 *      After 5 attempts it goes to 'failed' and won't auto-retry.
 *
 * Phase 6 will layer conflict detection on top — comparing source_updated_at
 * to the server's current updated_at before replaying.
 */
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  getActiveQueueEntries,
  markStatus,
  purge,
  type QueueEntry,
} from '@/lib/offline-db';
import { getOnlineState, onConnectionChange } from '@/lib/online-status';
import type {
  EmmpDraftPayload,
  EmmpTransitionPayload,
  EnterprisePatchPayload,
  EssfDraftPayload,
  EssfTransitionPayload,
  FormSavePayload,
  InspectionDraftPayload,
  InspectionTransitionPayload,
  M1DraftPayload,
  M1TransitionPayload,
} from '@/lib/offline-saves';
import type { Database, Json } from '@/types/database';

const MAX_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// Phase 6 — conflict detection
// ---------------------------------------------------------------------------

/**
 * Fetch the current server-side `updated_at` of the row this queued entry is
 * about to write to, so the replay loop can detect "server moved on while we
 * were offline" and surface the conflict instead of clobbering server data.
 *
 * Returns null if we can't determine an updated_at (no matching row, network
 * blip, etc.) — in that case we proceed with the replay (no conflict).
 */
async function readServerUpdatedAt(p: FormSavePayload): Promise<string | null> {
  try {
    switch (p.saveType) {
      case 'essf_draft':
      case 'essf_transition': {
        const r = await supabase
          .from('essf_submissions')
          .select('updated_at')
          .eq('enterprise_id', p.enterprise_id)
          .maybeSingle();
        return (r.data as { updated_at?: string } | null)?.updated_at ?? null;
      }
      case 'emmp_draft':
      case 'emmp_transition': {
        const r = await supabase
          .from('emmp_submissions')
          .select('updated_at')
          .eq('enterprise_id', p.enterprise_id)
          .maybeSingle();
        return (r.data as { updated_at?: string } | null)?.updated_at ?? null;
      }
      case 'inspection_draft':
      case 'inspection_transition': {
        const r = await supabase
          .from('inspection_visits')
          .select('updated_at')
          .eq('id', p.visit_id)
          .maybeSingle();
        return (r.data as { updated_at?: string } | null)?.updated_at ?? null;
      }
      case 'm1_draft':
      case 'm1_transition': {
        const r = await supabase
          .from('m1_submissions')
          .select('updated_at')
          .eq('enterprise_id', p.enterprise_id)
          .maybeSingle();
        return (r.data as { updated_at?: string } | null)?.updated_at ?? null;
      }
      case 'enterprise_patch': {
        const r = await supabase
          .from('enterprises')
          .select('updated_at')
          .eq('id', p.enterprise_id)
          .maybeSingle();
        return (r.data as { updated_at?: string } | null)?.updated_at ?? null;
      }
    }
  } catch {
    return null;
  }
}

/**
 * Decide whether the entry conflicts with current server state.
 *   - If we never captured a source_updated_at, no conflict (best effort).
 *   - If the server's updated_at is later than the source we saw, conflict.
 *   - Otherwise OK to replay.
 */
async function entryConflicts(entry: QueueEntry): Promise<boolean> {
  const source = entry.source_updated_at;
  if (!source) return false;
  const serverUpdatedAt = await readServerUpdatedAt(entry.payload as unknown as FormSavePayload);
  if (!serverUpdatedAt) return false;
  return new Date(serverUpdatedAt).getTime() > new Date(source).getTime();
}

// ---------------------------------------------------------------------------
// Per-saveType handlers — each is the EXACT logic the hook used to run.
// Keeping them here (not inside the hook closure) lets the replay loop run
// without React being mounted, and means the hook can call the same helper
// when ONLINE so we don't double-implement the same write.
// ---------------------------------------------------------------------------

export async function applyEssfDraft(p: EssfDraftPayload): Promise<void> {
  const existing = await supabase
    .from('essf_submissions')
    .select('id, status')
    .eq('enterprise_id', p.enterprise_id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    if (existing.data.status === 'approved') {
      throw new Error('Cannot edit an approved ESSF. Ask an admin to reopen it.');
    }
    const { error } = await supabase
      .from('essf_submissions')
      .update({
        responses: p.responses as Database['public']['Tables']['essf_submissions']['Update']['responses'],
      })
      .eq('id', existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('essf_submissions').insert({
      enterprise_id: p.enterprise_id,
      responses: p.responses as Database['public']['Tables']['essf_submissions']['Insert']['responses'],
      filled_by: p.filled_by ?? null,
      status: 'draft',
    });
    if (error) throw error;
  }
}

export async function applyEmmpDraft(p: EmmpDraftPayload): Promise<void> {
  const existing = await supabase
    .from('emmp_submissions')
    .select('id, status')
    .eq('enterprise_id', p.enterprise_id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    if (existing.data.status === 'approved') {
      throw new Error('Cannot edit an approved EMMP. Ask an admin to reopen it.');
    }
    const { error } = await supabase
      .from('emmp_submissions')
      .update({
        responses: p.responses as Database['public']['Tables']['emmp_submissions']['Update']['responses'],
      })
      .eq('id', existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('emmp_submissions').insert({
      enterprise_id: p.enterprise_id,
      template_id: p.template_id,
      responses: p.responses as Database['public']['Tables']['emmp_submissions']['Insert']['responses'],
      filled_by: p.filled_by ?? null,
      status: 'draft',
    });
    if (error) throw error;
  }
}

export async function applyInspectionDraft(p: InspectionDraftPayload): Promise<void> {
  const patch: Database['public']['Tables']['inspection_visits']['Update'] = {
    responses: p.responses as Database['public']['Tables']['inspection_visits']['Update']['responses'],
  };
  if (p.inspected_by_name !== undefined) patch.inspected_by_name = p.inspected_by_name;
  if (p.visit_date !== undefined) patch.visit_date = p.visit_date;
  const { error } = await supabase
    .from('inspection_visits')
    .update(patch)
    .eq('id', p.visit_id);
  if (error) throw error;
}

export async function applyM1Draft(p: M1DraftPayload): Promise<void> {
  const existing = await supabase
    .from('m1_submissions')
    .select('id, status')
    .eq('enterprise_id', p.enterprise_id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  const patch: Database['public']['Tables']['m1_submissions']['Update'] = {
    ...(p.patch.narrative          !== undefined && { narrative:          p.patch.narrative          as unknown as Json }),
    ...(p.patch.cashbook           !== undefined && { cashbook:           p.patch.cashbook           as unknown as Json }),
    ...(p.patch.financial_report   !== undefined && { financial_report:   p.patch.financial_report   as unknown as Json }),
    ...(p.patch.bank_reconciliation!== undefined && { bank_reconciliation:p.patch.bank_reconciliation as unknown as Json }),
    ...(p.patch.m1_period_start    !== undefined && { m1_period_start:    p.patch.m1_period_start }),
    ...(p.patch.m1_period_end      !== undefined && { m1_period_end:      p.patch.m1_period_end }),
    ...(p.patch.report_date        !== undefined && { report_date:        p.patch.report_date }),
    ...(p.patch.filled_by          !== undefined && { filled_by:          p.patch.filled_by }),
  };
  if (existing.data) {
    if (existing.data.status === 'approved') {
      throw new Error('Cannot edit an approved M1 submission. Ask an admin to reopen it.');
    }
    const { error } = await supabase
      .from('m1_submissions')
      .update(patch)
      .eq('id', existing.data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('m1_submissions').insert({
      enterprise_id: p.enterprise_id,
      status: 'draft',
      ...patch,
    });
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Phase 4 — status transitions and enterprise patches
// ---------------------------------------------------------------------------

/**
 * Build the patch sent for a transition. Mirrors the inline logic that lived
 * inside each useTransition* hook so the queue stores the SAME shape and the
 * replay applies the SAME write.
 */
function buildTransitionPatch(to: 'draft' | 'submitted' | 'approved', userId: string): {
  status: 'draft' | 'submitted' | 'approved';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
} {
  const patch: ReturnType<typeof buildTransitionPatch> = { status: to };
  if (to === 'submitted') patch.submitted_at = new Date().toISOString();
  if (to === 'approved') {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = userId;
  }
  return patch;
}

export async function applyEssfTransition(p: EssfTransitionPayload): Promise<void> {
  const patch = buildTransitionPatch(p.to, p.user_id);
  const { error } = await supabase
    .from('essf_submissions')
    .update(patch)
    .eq('enterprise_id', p.enterprise_id);
  if (error) throw error;
}

export async function applyEmmpTransition(p: EmmpTransitionPayload): Promise<void> {
  const patch = buildTransitionPatch(p.to, p.user_id);
  const { error } = await supabase
    .from('emmp_submissions')
    .update(patch)
    .eq('enterprise_id', p.enterprise_id);
  if (error) throw error;
}

export async function applyInspectionTransition(p: InspectionTransitionPayload): Promise<void> {
  const patch = buildTransitionPatch(p.to, p.user_id);
  const { error } = await supabase
    .from('inspection_visits')
    .update(patch)
    .eq('id', p.visit_id);
  if (error) throw error;
}

export async function applyM1Transition(p: M1TransitionPayload): Promise<void> {
  const patch = buildTransitionPatch(p.to, p.user_id);
  const { error } = await supabase
    .from('m1_submissions')
    .update(patch)
    .eq('enterprise_id', p.enterprise_id);
  if (error) throw error;
}

/**
 * Generic UPDATE on the enterprises row. Used for cover-page field edits,
 * lifecycle milestone updates, and borehole supervision saves. The hook
 * picks the field name; the queue + replay are field-agnostic.
 */
export async function applyEnterprisePatch(p: EnterprisePatchPayload): Promise<void> {
  // The Database type union doesn't allow arbitrary partial updates without
  // a cast; we trust the caller to pass column names that exist on the row.
  const { error } = await supabase
    .from('enterprises')
    .update(p.patch as unknown as Database['public']['Tables']['enterprises']['Update'])
    .eq('id', p.enterprise_id);
  if (error) throw error;
}

async function dispatch(payload: FormSavePayload): Promise<void> {
  switch (payload.saveType) {
    case 'essf_draft':            return applyEssfDraft(payload);
    case 'emmp_draft':            return applyEmmpDraft(payload);
    case 'inspection_draft':      return applyInspectionDraft(payload);
    case 'm1_draft':              return applyM1Draft(payload);
    case 'essf_transition':       return applyEssfTransition(payload);
    case 'emmp_transition':       return applyEmmpTransition(payload);
    case 'inspection_transition': return applyInspectionTransition(payload);
    case 'm1_transition':         return applyM1Transition(payload);
    case 'enterprise_patch':      return applyEnterprisePatch(payload);
  }
}

// ---------------------------------------------------------------------------
// Replay loop
// ---------------------------------------------------------------------------

let isReplaying = false;
let queryClientRef: QueryClient | null = null;

/** Register the QueryClient so the replay loop can invalidate caches. */
export function setReplayQueryClient(client: QueryClient): void {
  queryClientRef = client;
}

/**
 * Invalidate the React Query keys that match a replayed entry so the UI
 * re-fetches fresh server data after a successful sync.
 */
function invalidateAfterSync(entry: QueueEntry): void {
  if (!queryClientRef) return;
  const p = entry.payload as unknown as FormSavePayload;
  const qc = queryClientRef;
  switch (p.saveType) {
    case 'essf_draft':
      qc.invalidateQueries({ queryKey: ['essf', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-esmp-status', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', p.enterprise_id] });
      break;
    case 'emmp_draft':
      qc.invalidateQueries({ queryKey: ['emmp', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-esmp-status', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', p.enterprise_id] });
      break;
    case 'inspection_draft':
      if (p.enterprise_id) {
        qc.invalidateQueries({ queryKey: ['inspection-visits', p.enterprise_id] });
        qc.invalidateQueries({ queryKey: ['enterprise-timeline', p.enterprise_id] });
      }
      qc.invalidateQueries({ queryKey: ['inspection-visit', p.visit_id] });
      break;
    case 'm1_draft':
      qc.invalidateQueries({ queryKey: ['m1', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-m1-status', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', p.enterprise_id] });
      break;
    case 'essf_transition':
      qc.invalidateQueries({ queryKey: ['essf', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-esmp-status', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-lifecycle'] });
      break;
    case 'emmp_transition':
      qc.invalidateQueries({ queryKey: ['emmp', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-esmp-status', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-lifecycle'] });
      break;
    case 'inspection_transition':
      qc.invalidateQueries({ queryKey: ['inspection-visit', p.visit_id] });
      qc.invalidateQueries({ queryKey: ['inspection-visits', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', p.enterprise_id] });
      break;
    case 'm1_transition':
      qc.invalidateQueries({ queryKey: ['m1', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-m1-status', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-lifecycle'] });
      break;
    case 'enterprise_patch':
      qc.invalidateQueries({ queryKey: ['enterprise', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprises'] });
      qc.invalidateQueries({ queryKey: ['enterprise-history', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', p.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-lifecycle'] });
      qc.invalidateQueries({ queryKey: ['esmp-pdf-meta', p.enterprise_id] });
      break;
  }
}

/**
 * Drain the queue once. Safe to call repeatedly — `isReplaying` guards
 * against concurrent drains.
 *
 * Returns the count of synced + failed entries so a caller can show a
 * "Synced N changes" toast.
 */
export async function replayQueue(): Promise<{ synced: number; failed: number }> {
  if (isReplaying) return { synced: 0, failed: 0 };
  if (getOnlineState() !== 'online') return { synced: 0, failed: 0 };
  isReplaying = true;
  let synced = 0;
  let failed = 0;
  try {
    const entries = await getActiveQueueEntries();
    for (const entry of entries) {
      // Skip entries that aren't auto-retryable.
      if (entry.status === 'conflict' || entry.status === 'failed') continue;
      if (entry.attempts >= MAX_ATTEMPTS) {
        await markStatus(entry.id, 'failed', `Gave up after ${MAX_ATTEMPTS} attempts`);
        failed += 1;
        continue;
      }
      await markStatus(entry.id, 'replaying');
      try {
        // Conflict gate: refuse to replay if the server has been written to
        // since the user snapshotted updated_at. The entry is parked as
        // 'conflict' and the user resolves manually via SyncConflictsPage.
        const conflict = await entryConflicts(entry);
        if (conflict) {
          await markStatus(
            entry.id,
            'conflict',
            'Server has newer data than what you saw when this change was made.',
          );
          continue;
        }
        await dispatch(entry.payload as unknown as FormSavePayload);
        invalidateAfterSync(entry);
        await purge(entry.id);
        synced += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Restore to pending so a subsequent replay retries.
        await markStatus(entry.id, 'pending', msg);
      }
    }
  } finally {
    isReplaying = false;
  }
  return { synced, failed };
}

/**
 * Phase 6 — manual conflict resolution.
 *
 *   resolveConflictUseMine: re-runs the queued write, ignoring the
 *     conflict gate (the user explicitly chose to overwrite the server).
 *   resolveConflictDiscardMine: deletes the queued entry without applying it
 *     (the user chose to keep the server's version).
 */
export async function resolveConflictUseMine(entryId: string): Promise<void> {
  const all = await getActiveQueueEntries();
  const entry = all.find((e) => e.id === entryId);
  if (!entry) return;
  await markStatus(entry.id, 'replaying');
  try {
    await dispatch(entry.payload as unknown as FormSavePayload);
    invalidateAfterSync(entry);
    await purge(entry.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markStatus(entry.id, 'conflict', msg);
    throw e;
  }
}

export async function resolveConflictDiscardMine(entryId: string): Promise<void> {
  await purge(entryId);
}

/**
 * Wire the replay engine: whenever the connection flips to online OR the
 * browser fires 'online', drain the queue. Idempotent — safe to call from
 * main.tsx at boot.
 */
export function initReplay(client: QueryClient): void {
  setReplayQueryClient(client);
  onConnectionChange((state) => {
    if (state === 'online') void replayQueue();
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void replayQueue());
  }
  // Also try once on boot in case we have a stale queue.
  if (getOnlineState() === 'online') {
    void replayQueue();
  }
}
