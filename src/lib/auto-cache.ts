/**
 * Auto-cache for offline use.
 *
 * The whole point of this module is to make "Take offline" a thing the user
 * doesn't need to remember. As long as they've been online at least once on
 * a device, every enterprise in their RLS-accessible scope is already
 * cached, refreshed in the background every 30 minutes and on every
 * reconnect. If they head to a remote area without warning, they aren't
 * stranded.
 *
 * Architecture:
 *
 *   1. ONE bulk query per table — not 7 queries × N enterprises. We pull
 *      every essf_submissions row in scope, every emmp_submissions row,
 *      etc., then call `qc.setQueryData(['essf', enterpriseId], row)` for
 *      each enterprise. The React Query IDB persister picks them up and
 *      writes them to the same `cache` store the rest of the app reads from.
 *
 *   2. A second IDB store `cache_state` tracks per-enterprise sync
 *      timestamps so the UI can show "47 ready · synced 5 min ago" and
 *      a small "cached" badge on the enterprise list. See offline-db.ts
 *      for the schema.
 *
 *   3. The orchestrator hook `useAutoCache()` runs the initial sync on
 *      first mount, sets up a 30-minute interval, listens to the `online`
 *      event for an immediate re-sync, and exposes a `manualResync()` for
 *      the status pill click.
 *
 * What this does NOT cache: PDFs and storage Blobs (per Phase 5 of the
 * offline rollout — multi-MB and not worth queueing). The enterprise
 * timeline view is also skipped — it's expensive and not part of the data-
 * entry flow.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOnlineStatus } from '@/lib/online-status';
import {
  getAllCacheState,
  setCacheStateRows,
  type CacheStateRow,
} from '@/lib/offline-db';

// ============================================================================
// Public types
// ============================================================================
export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

export interface AutoCacheProgress {
  status: SyncStatus;
  /** Number of enterprises in the most-recent successful sync. */
  cached_count: number;
  /** ISO timestamp of the most-recent successful sync. */
  last_sync_at: string | null;
  /** Error message from the last failed attempt, if any. */
  error: string | null;
}

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// Module-level state — shared across every hook subscriber so the status
// pill in the header and the badge on the enterprise list agree.
// ============================================================================
let currentProgress: AutoCacheProgress = {
  status: 'idle',
  cached_count: 0,
  last_sync_at: null,
  error: null,
};

const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): AutoCacheProgress { return currentProgress; }

function setProgress(patch: Partial<AutoCacheProgress>) {
  currentProgress = { ...currentProgress, ...patch };
  emit();
}

/** Read-only view of current sync progress. Re-renders when it changes. */
export function useAutoCacheProgress(): AutoCacheProgress {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ============================================================================
// Bulk sync — the core
// ============================================================================
type Row = Record<string, unknown> & { id?: string; enterprise_id?: string };

function indexByEnterprise<T extends Row>(rows: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const r of rows) {
    const eid = (r as { enterprise_id?: string }).enterprise_id;
    if (!eid) continue;
    if (!out[eid]) out[eid] = [];
    out[eid].push(r);
  }
  return out;
}

function firstOrNull<T>(rows: T[] | undefined): T | null {
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Run one full sync pass. Pulls everything in scope in 8 bulk queries,
 * distributes results into the React Query cache by enterprise_id, then
 * updates the cache_state IDB store with per-enterprise timestamps.
 */
export async function runAutoCacheSync(qc: QueryClient): Promise<void> {
  setProgress({ status: 'syncing', error: null });
  try {
    // Bulk fetch — one round-trip per table. RLS scopes the result set
    // automatically; no need to filter on the client.
    const [
      entRes, essfRes, emmpRes, m1Res, inspRes, docsRes, tmplRes,
      orgsRes, distsRes, ccsRes, rcsRes, typesRes,
    ] = await Promise.all([
      supabase.from('enterprises').select('*'),
      supabase.from('essf_submissions').select('*'),
      supabase.from('emmp_submissions').select('*'),
      supabase.from('m1_submissions').select('*'),
      supabase.from('inspection_visits').select('*'),
      supabase.from('m1_supporting_documents').select('*'),
      supabase.from('emmp_templates').select('id, title, version, schema, enterprise_type_ids'),
      supabase.from('organizations').select('*').order('code'),
      supabase.from('districts').select('*').order('name'),
      supabase.from('community_councils').select('*').order('name'),
      supabase.from('resource_centers').select('*').order('name'),
      supabase.from('enterprise_types').select('*').order('name'),
    ]);

    // Fail fast on any DB error
    for (const r of [entRes, essfRes, emmpRes, m1Res, inspRes, docsRes,
                     tmplRes, orgsRes, distsRes, ccsRes, rcsRes, typesRes]) {
      if (r.error) throw r.error;
    }

    const enterprises = (entRes.data ?? []) as Array<{ id: string; updated_at: string | null; enterprise_type_id: number | null; district_id: string | null }>;
    const essfByEnt = indexByEnterprise((essfRes.data ?? []) as Row[]);
    const emmpByEnt = indexByEnterprise((emmpRes.data ?? []) as Row[]);
    const m1ByEnt   = indexByEnterprise((m1Res.data   ?? []) as Row[]);
    const inspByEnt = indexByEnterprise((inspRes.data ?? []) as Row[]);
    const docsByEnt = indexByEnterprise((docsRes.data ?? []) as Row[]);

    // Distribute into per-enterprise React Query keys.
    //
    // IMPORTANT: we use `prefetchQuery` (not `setQueryData`) on purpose.
    // The IDB persister (`@tanstack/react-query-persist-client`) only writes
    // queries that go through the fetch path — `setQueryData` populates the
    // in-memory cache but never reaches IDB, so a tab close would lose
    // everything we just seeded. With `prefetchQuery({ queryFn: () => Promise.resolve(data) })`
    // the persister sees a normal query lifecycle and writes the result to
    // IDB, which is the entire point of auto-cache.
    //
    // `staleTime: 0` means the next observer (a useQuery in a page) will
    // still revalidate against the server — we don't want to mask staleness.
    // The IDB copy is what survives a tab close and rehydrates on next boot.
    const prefetch = <T>(queryKey: unknown[], data: T) =>
      qc.prefetchQuery({
        queryKey,
        queryFn: () => Promise.resolve(data),
        staleTime: 0,
      });

    // Per-enterprise writes — bulk through a single Promise.all so they
    // pipeline through the persister together.
    const perEnterpriseJobs: Promise<unknown>[] = [];
    for (const e of enterprises) {
      perEnterpriseJobs.push(prefetch(['enterprise', e.id],            e));
      perEnterpriseJobs.push(prefetch(['essf', e.id],                  firstOrNull(essfByEnt[e.id])));
      perEnterpriseJobs.push(prefetch(['emmp', e.id],                  firstOrNull(emmpByEnt[e.id])));
      perEnterpriseJobs.push(prefetch(['m1',   e.id],                  firstOrNull(m1ByEnt[e.id])));
      perEnterpriseJobs.push(prefetch(['inspection-visits',  e.id],    inspByEnt[e.id] ?? []));
      perEnterpriseJobs.push(prefetch(['m1-supporting-docs', e.id],    docsByEnt[e.id] ?? []));
    }

    // Shared catalogs — same keys as the existing useOrganizations / etc. hooks.
    const catalogJobs: Promise<unknown>[] = [
      prefetch(['organizations'],    orgsRes.data  ?? []),
      prefetch(['districts'],        distsRes.data ?? []),
      prefetch(['enterprise-types'], typesRes.data ?? []),
      prefetch(['community_councils', 'all'], ccsRes.data ?? []),
      prefetch(['resource_centers',   'all'], rcsRes.data ?? []),
    ];

    // Per-district CC / RC slices — the form hooks key by district_id.
    const ccByDist: Record<string, Array<{ district_id: string }>> = {};
    for (const cc of (ccsRes.data ?? []) as Array<{ district_id: string }>) {
      (ccByDist[cc.district_id] ??= []).push(cc);
    }
    for (const [districtId, rows] of Object.entries(ccByDist)) {
      catalogJobs.push(prefetch(['community_councils', districtId], rows));
    }
    const rcByDist: Record<string, Array<{ district_id: string }>> = {};
    for (const rc of (rcsRes.data ?? []) as Array<{ district_id: string }>) {
      (rcByDist[rc.district_id] ??= []).push(rc);
    }
    for (const [districtId, rows] of Object.entries(rcByDist)) {
      catalogJobs.push(prefetch(['resource_centers', districtId], rows));
    }

    // EMMP templates — index by enterprise_type for the form to find quickly.
    const templates = (tmplRes.data ?? []) as Array<{ id: string; enterprise_type_ids: number[] | null }>;
    for (const t of templates) {
      for (const type_id of t.enterprise_type_ids ?? []) {
        catalogJobs.push(prefetch(['emmp-template-for-type', type_id], t));
      }
    }

    await Promise.all([...perEnterpriseJobs, ...catalogJobs]);

    // Persist per-enterprise cache state
    const cached_at = new Date().toISOString();
    const rows: CacheStateRow[] = enterprises.map((e) => ({
      enterprise_id: e.id,
      cached_at,
      source_updated_at: e.updated_at ?? null,
    }));
    await setCacheStateRows(rows);

    setProgress({
      status: 'done',
      cached_count: enterprises.length,
      last_sync_at: cached_at,
      error: null,
    });
  } catch (e) {
    setProgress({
      status: 'error',
      error: e instanceof Error ? e.message : 'Sync failed',
    });
    // re-throw so callers (e.g. manual click) can show their own toast
    throw e;
  }
}

// ============================================================================
// Orchestrator hook — mount once at the top of the authenticated tree.
// ============================================================================

/**
 * Place ONCE in the authenticated AppShell. Runs the initial sync on mount,
 * sets up a 30-minute interval, and re-syncs on the `online` event.
 *
 * The progress is read from anywhere via `useAutoCacheProgress()` — both
 * are subscriptions to the same module-level state, so the status pill in
 * the header and the badge on the enterprise list stay in sync.
 */
export function useAutoCache() {
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const ranInitial = useRef(false);

  // Restore last-known cached_count + last_sync_at from IDB before the
  // first sync — gives the status pill something meaningful to display
  // on a cold load if we're offline at boot.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await getAllCacheState();
      if (cancelled || rows.length === 0) return;
      // Pick the most recent cached_at across all rows.
      const latest = rows.reduce<string | null>((acc, r) =>
        !acc || r.cached_at > acc ? r.cached_at : acc, null);
      setProgress({ cached_count: rows.length, last_sync_at: latest });
    })();
    return () => { cancelled = true; };
  }, []);

  // Initial sync — once per app load, when online.
  useEffect(() => {
    if (ranInitial.current || !online) return;
    ranInitial.current = true;
    void runAutoCacheSync(qc).catch(() => { /* state already recorded */ });
  }, [online, qc]);

  // 30-min interval while online + tab is foreground.
  useEffect(() => {
    if (!online) return;
    const i = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runAutoCacheSync(qc).catch(() => {});
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(i);
  }, [online, qc]);

  // Resync immediately when we transition offline → online.
  useEffect(() => {
    if (online) {
      void runAutoCacheSync(qc).catch(() => {});
    }
  }, [online, qc]);

  return useAutoCacheProgress();
}

/** Force a sync now — used by the status-pill click handler. */
export function manualResync(qc: QueryClient) {
  return runAutoCacheSync(qc).catch(() => {});
}

/** Reactive view of which enterprises have a cache_state row. Re-fetches
 *  whenever a sync completes so the badges stay current.  */
export function useCachedEnterpriseIds(): Set<string> {
  const progress = useAutoCacheProgress();
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await getAllCacheState();
      if (!cancelled) setIds(new Set(rows.map((r) => r.enterprise_id)));
    })();
    return () => { cancelled = true; };
    // refresh on every progress change so newly-cached enterprises show up
  }, [progress.last_sync_at, progress.cached_count]);
  return ids;
}
