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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { saveOrEnqueue, pickUpdatedAt, type OfflineSaveResult } from '@/lib/offline-saves';
import { applyMonitoringVisitDraft } from '@/lib/offline-replay';
import type { MonitoringVisitRow, MonitoringVisitPhotoRow } from '@/types/database';

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
 * Upload a photo + insert the row. Path layout matches the storage RLS
 * policy: {enterprise_id}/{visit_id}/{photo_id}.{ext}. The bucket only allows
 * image/* mime types.
 *
 * Online-only — the bucket isn't reachable from the offline queue, and a
 * batch of phone-captured photos would blow up the IDB store.
 */
export function useUploadMonitoringVisitPhoto(visitId: string, enterpriseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }) => {
      // organization_id is NOT NULL on monitoring_visit_photos and has no
      // BEFORE-INSERT trigger to auto-fill it (unlike monitoring_visits).
      // We look it up from the enterprise row before inserting so RLS sees
      // a complete row. Use the cached enterprise to skip a round-trip when
      // it's already loaded on the page.
      const orgRes = await supabase
        .from('enterprises')
        .select('organization_id')
        .eq('id', enterpriseId)
        .single();
      if (orgRes.error) throw orgRes.error;
      const organizationId = orgRes.data.organization_id;

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const photoId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${enterpriseId}/${visitId}/${photoId}.${ext}`;
      const up = await supabase.storage
        .from('monitoring-visit-photos')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from('monitoring_visit_photos').insert({
        visit_id: visitId,
        enterprise_id: enterpriseId,
        organization_id: organizationId,
        storage_path: path,
        caption: caption ?? null,
      });
      if (error) {
        // Best-effort cleanup if the DB row didn't land.
        await supabase.storage.from('monitoring-visit-photos').remove([path]);
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring-visit-photos', visitId] });
      qc.invalidateQueries({ queryKey: ['monitoring-visit', visitId] });
      qc.invalidateQueries({ queryKey: ['monitoring-visits', enterpriseId] });
      qc.invalidateQueries({ queryKey: ['enterprise-timeline', enterpriseId] });
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
