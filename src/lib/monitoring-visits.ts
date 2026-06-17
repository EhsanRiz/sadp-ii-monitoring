/**
 * Monitoring visit hooks.
 *
 * Monitoring visits are the casual field-record entity introduced in
 * migration 281. Multiple per enterprise. Routes through saveOrEnqueue so
 * field-staff can fill them offline.
 *
 * Photo uploads (`useUploadMonitoringVisitPhoto`) are online-only: multi-MB
 * blobs aren't queue-friendly and the field staffer typically has signal at
 * least for the upload step.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { saveOrEnqueue, pickUpdatedAt, type OfflineSaveResult } from '@/lib/offline-saves';
import { applyMonitoringVisitDraft, uploadVisitPhotoBlob } from '@/lib/offline-replay';
import { compressImage } from '@/lib/image';
import { getOnlineState } from '@/lib/online-status';
import {
  enqueue,
  putBlob,
  getBlob,
  deleteBlob,
  purge,
  getActiveQueueEntries,
  onQueueChange,
} from '@/lib/offline-db';
import type { MonitoringVisitRow, MonitoringVisitPhotoRow, EnterpriseRow } from '@/types/database';

// ============================================================================
// List + single read
// ============================================================================

export function useMonitoringVisits(enterpriseId: string | undefined) {
  return useQuery({
    queryKey: ['monitoring-visits', enterpriseId],
    queryFn: async (): Promise<MonitoringVisitRow[]> => {
      if (!enterpriseId) return [];
      const { data, error } = await supabase
        .from('monitoring_visits')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .order('visit_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!enterpriseId,
  });
}

export function useMonitoringVisit(visitId: string | undefined) {
  return useQuery({
    queryKey: ['monitoring-visit', visitId],
    queryFn: async (): Promise<MonitoringVisitRow | null> => {
      if (!visitId) return null;
      const { data, error } = await supabase
        .from('monitoring_visits')
        .select('*')
        .eq('id', visitId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: !!visitId,
  });
}

// ============================================================================
// Save (create or update). Client generates a UUID up front so the same id is
// used across draft saves and the final submit click.
// ============================================================================

export interface SaveMonitoringVisitInput {
  visit_id: string;
  enterprise_id: string;
  patch: Record<string, unknown>;
  /** When set, also flip the row's status (+ stamp submitted_at if 'submitted'). */
  to_status?: 'draft' | 'submitted';
  description?: string;
}

export function useSaveMonitoringVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveMonitoringVisitInput): Promise<OfflineSaveResult> => {
      const cached = qc.getQueryData(['monitoring-visit', input.visit_id]);
      const sourceUpdatedAt = pickUpdatedAt(cached);
      return saveOrEnqueue({
        description: input.description ?? 'Save monitoring visit',
        source_updated_at: sourceUpdatedAt,
        payload: {
          saveType: 'monitoring_visit_draft',
          visit_id: input.visit_id,
          enterprise_id: input.enterprise_id,
          patch: input.patch,
          to_status: input.to_status,
        },
        doSave: () =>
          applyMonitoringVisitDraft({
            saveType: 'monitoring_visit_draft',
            visit_id: input.visit_id,
            enterprise_id: input.enterprise_id,
            patch: input.patch,
            to_status: input.to_status,
          }),
        applyOptimistic: () => {
          // Optimistically merge the patch into the cached single-row read so
          // the edit page reflects the user's intent even while offline.
          qc.setQueryData(['monitoring-visit', input.visit_id], (old: unknown) => {
            const base = (old && typeof old === 'object' ? old : { id: input.visit_id }) as Record<string, unknown>;
            const next = { ...base, ...input.patch };
            if (input.to_status) {
              next.status = input.to_status;
              if (input.to_status === 'submitted') next.submitted_at = new Date().toISOString();
            }
            return next;
          });
        },
      });
    },
    onSuccess: (_res, input) => {
      qc.invalidateQueries({ queryKey: ['monitoring-visits', input.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['monitoring-visit', input.visit_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', input.enterprise_id] });
    },
  });
}

export function useDeleteMonitoringVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ visit_id, enterprise_id }: { visit_id: string; enterprise_id: string }) => {
      const { error } = await supabase.from('monitoring_visits').delete().eq('id', visit_id);
      if (error) throw error;
      return { visit_id, enterprise_id };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['monitoring-visits', r.enterprise_id] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', r.enterprise_id] });
    },
  });
}

// ============================================================================
// Photos
// ============================================================================

export function useMonitoringVisitPhotos(visitId: string | undefined) {
  return useQuery({
    queryKey: ['monitoring-visit-photos', visitId],
    queryFn: async (): Promise<MonitoringVisitPhotoRow[]> => {
      if (!visitId) return [];
      const { data, error } = await supabase
        .from('monitoring_visit_photos')
        .select('*')
        .eq('visit_id', visitId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!visitId,
  });
}

/**
 * organization_id is NOT NULL on monitoring_visit_photos and has no
 * BEFORE-INSERT trigger to backfill it (unlike monitoring_visits). Resolve it
 * from the cached enterprise first (works offline), falling back to a network
 * read only when online and not yet cached.
 */
async function resolveOrganizationId(
  qc: ReturnType<typeof useQueryClient>,
  enterpriseId: string,
): Promise<string> {
  const cached = qc.getQueryData<EnterpriseRow>(['enterprise', enterpriseId]);
  if (cached?.organization_id) return cached.organization_id;
  if (getOnlineState() === 'online') {
    const res = await supabase
      .from('enterprises')
      .select('organization_id')
      .eq('id', enterpriseId)
      .single();
    if (res.error) throw res.error;
    return res.data.organization_id;
  }
  throw new Error(
    "Can't attach a photo offline until this enterprise has been opened or cached once while online.",
  );
}

/**
 * Attach a monitoring-visit photo, online OR offline.
 *
 *   - Online  → upload to Storage + insert the row immediately.
 *   - Offline (or the upload fails, e.g. flaky signal) → park the image bytes
 *     in IDB and queue a `monitoring_photo_upload` entry. The replay engine
 *     uploads it when the device reconnects, after the visit row itself has
 *     synced (queue replays oldest-first).
 *
 * Returns `{ online }` so the caller can show the right toast. Each call
 * handles ONE file; the page calls it per selected/captured photo so users can
 * add multiple shots (camera or library).
 */
export function useUploadMonitoringVisitPhoto(visitId: string, enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation<{ online: boolean }, Error, { file: File }>({
    mutationFn: async ({ file }) => {
      const organizationId = await resolveOrganizationId(qc, enterpriseId);
      // Downscale before upload/queue — smaller IDB footprint + faster uploads
      // on slow links. Falls back to the original file if it can't be decoded.
      const image = await compressImage(file);
      const content_type = image.type || 'image/jpeg';
      const filename = image.name || `photo-${Date.now()}.jpg`;

      if (getOnlineState() === 'online') {
        try {
          await uploadVisitPhotoBlob({
            blob: image,
            content_type,
            filename,
            visit_id: visitId,
            enterprise_id: enterpriseId,
            organization_id: organizationId,
          });
          return { online: true };
        } catch {
          // Likely a dropped/flaky connection mid-upload — fall through and
          // queue so the photo isn't lost; replay retries on reconnect.
        }
      }

      const blob_key = await putBlob(image, { content_type, filename });
      await enqueue({
        kind: 'upload',
        description: `Upload visit photo (${filename})`,
        enterprise_id: enterpriseId,
        payload: {
          saveType: 'monitoring_photo_upload',
          visit_id: visitId,
          enterprise_id: enterpriseId,
          organization_id: organizationId,
          blob_key,
          content_type,
          filename,
        },
      });
      return { online: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring-visit-photos', visitId] });
      qc.invalidateQueries({ queryKey: ['monitoring-visit', visitId] });
      qc.invalidateQueries({ queryKey: ['monitoring-visits', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', enterpriseId] });
    },
  });
}

/** A photo captured offline and waiting in the queue to upload. */
export interface PendingVisitPhoto {
  /** Queue entry id — used to discard before it uploads. */
  queueId: string;
  blobKey: string;
  filename: string;
  /** Object URL for a local preview (revoked on unmount). */
  url: string;
}

/**
 * Reactive list of this visit's photos that are still queued for upload.
 * Rehydrates each blob into an object URL for an inline preview, and refreshes
 * whenever the queue changes (e.g. one replays away on reconnect).
 */
export function usePendingVisitPhotos(visitId: string | undefined): PendingVisitPhoto[] {
  const [items, setItems] = useState<PendingVisitPhoto[]>([]);
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    async function load() {
      if (!visitId) {
        if (!cancelled) setItems([]);
        return;
      }
      const entries = await getActiveQueueEntries();
      const out: PendingVisitPhoto[] = [];
      for (const e of entries) {
        const p = e.payload as { saveType?: string; visit_id?: string; blob_key?: string; filename?: string };
        if (p?.saveType !== 'monitoring_photo_upload' || p.visit_id !== visitId || !p.blob_key) continue;
        const rec = await getBlob(p.blob_key);
        if (!rec) continue;
        const url = URL.createObjectURL(rec.blob);
        created.push(url);
        out.push({ queueId: e.id, blobKey: p.blob_key, filename: p.filename ?? 'photo', url });
      }
      if (cancelled) {
        created.forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      setItems(out);
    }
    void load();
    const unsub = onQueueChange(() => void load());
    return () => {
      cancelled = true;
      unsub();
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [visitId]);
  return items;
}

/** Discard a queued (not-yet-uploaded) photo: drop its queue entry + blob. */
export function useDiscardPendingPhoto() {
  return useMutation<void, Error, { queueId: string; blobKey: string }>({
    mutationFn: async ({ queueId, blobKey }) => {
      await purge(queueId);
      await deleteBlob(blobKey);
    },
  });
}

export function useDeleteMonitoringVisitPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ photo, enterprise_id }: { photo: MonitoringVisitPhotoRow; enterprise_id: string }) => {
      // Best-effort storage delete; row delete is the source of truth (and
      // also bumps photo_count via trigger).
      await supabase.storage.from('monitoring-visit-photos').remove([photo.storage_path]);
      const { error } = await supabase.from('monitoring_visit_photos').delete().eq('id', photo.id);
      if (error) throw error;
      return { visit_id: photo.visit_id, enterprise_id };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['monitoring-visit-photos', r.visit_id] });
      qc.invalidateQueries({ queryKey: ['monitoring-visit', r.visit_id] });
      qc.invalidateQueries({ queryKey: ['monitoring-visits', r.enterprise_id] });
    },
  });
}

/** Return a 30-day signed URL for a photo path. */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('monitoring-visit-photos')
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  return data?.signedUrl ?? null;
}
