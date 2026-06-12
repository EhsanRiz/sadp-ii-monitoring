/**
 * Shared offline pre-caching logic.
 *
 * Exposes:
 *   - `precacheCatalogs(qc)` — fetches the global lookup tables (orgs,
 *     districts, types). Cheap, shared by every enterprise.
 *   - `precacheEnterprise(qc, params)` — fetches everything needed to
 *     view + edit ONE enterprise without a network connection.
 *   - `precacheResourceCenter(qc, params)` — iterates every enterprise
 *     under the given RC and calls precacheEnterprise for each.
 *   - `getCachedEnterpriseIds()` / `markEnterpriseCached(id)` /
 *     `getRcPrecacheState(rcId)` / `markRcCached(rcId, ids)` —
 *     localStorage-backed registry that the Enterprises list reads to
 *     show "📡 offline-ready" dots on cached rows and a "Pilot RC
 *     offline-ready · last cached 14 min ago" status on the RC button.
 *
 * localStorage was chosen (vs IDB) because the registry is read
 * synchronously during list-page render — every row needs to know if it's
 * cached to decide whether to show the dot. IDB would require an async
 * load + state hydration; localStorage is a single synchronous read at
 * mount time. The registry is just a lightweight hint anyway — the
 * actual offline data lives in the React Query persister's IDB store.
 */
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// localStorage registry
// ---------------------------------------------------------------------------

const ENTERPRISES_KEY = 'sadp:cached-enterprises';
const RCS_KEY = 'sadp:cached-rcs';

/** Set of enterprise IDs that have been pre-cached on this device. */
export function getCachedEnterpriseIds(): Set<string> {
  try {
    const raw = localStorage.getItem(ENTERPRISES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr as string[]);
  } catch {
    return new Set();
  }
}

export function markEnterpriseCached(id: string): void {
  try {
    const set = getCachedEnterpriseIds();
    set.add(id);
    localStorage.setItem(ENTERPRISES_KEY, JSON.stringify([...set]));
    notifyPrecacheChanged();
  } catch {
    // ignore — we'll re-cache silently next time
  }
}

/** Fire a same-tab event so list views can refresh their offline-ready dots
 *  without polling. Bridged across tabs by the native 'storage' event. */
function notifyPrecacheChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent('sadp:precache-changed'));
  } catch {
    // SSR / older environments — fall through
  }
}

export interface RcPrecacheState {
  cachedAt: number;
  count: number;
  enterpriseIds: string[];
}

export function getRcPrecacheState(rcId: string): RcPrecacheState | null {
  try {
    const raw = localStorage.getItem(RCS_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, RcPrecacheState>;
    return map[rcId] ?? null;
  } catch {
    return null;
  }
}

export function markRcCached(rcId: string, enterpriseIds: string[]): void {
  try {
    const raw = localStorage.getItem(RCS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, RcPrecacheState>) : {};
    map[rcId] = {
      cachedAt: Date.now(),
      count: enterpriseIds.length,
      enterpriseIds,
    };
    localStorage.setItem(RCS_KEY, JSON.stringify(map));
    notifyPrecacheChanged();
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Catalog prefetch (orgs, districts, types)
// ---------------------------------------------------------------------------

export async function precacheCatalogs(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.prefetchQuery({
      queryKey: ['organizations'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .order('code');
        if (error) throw error;
        return data ?? [];
      },
    }),
    qc.prefetchQuery({
      queryKey: ['districts'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('districts')
          .select('*')
          .order('name');
        if (error) throw error;
        return data ?? [];
      },
    }),
    qc.prefetchQuery({
      queryKey: ['enterprise-types'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('enterprise_types')
          .select('*')
          .order('name');
        if (error) throw error;
        return data ?? [];
      },
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Per-enterprise prefetch
// ---------------------------------------------------------------------------

export interface PrecacheEnterpriseParams {
  enterpriseId: string;
  enterpriseTypeId: number | null;
  districtId: string | null;
}

export async function precacheEnterprise(
  qc: QueryClient,
  params: PrecacheEnterpriseParams,
): Promise<void> {
  const { enterpriseId, enterpriseTypeId, districtId } = params;

  const jobs: Array<Promise<unknown>> = [
    qc.prefetchQuery({
      queryKey: ['enterprise', enterpriseId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('enterprises')
          .select('*')
          .eq('id', enterpriseId)
          .single();
        if (error) throw error;
        return data;
      },
    }),
    qc.prefetchQuery({
      queryKey: ['essf', enterpriseId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('essf_submissions')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
    }),
    qc.prefetchQuery({
      queryKey: ['emmp', enterpriseId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('emmp_submissions')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
    }),
    qc.prefetchQuery({
      queryKey: ['inspection-visits', enterpriseId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('inspection_visits')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .order('visit_date', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
    }),
    qc.prefetchQuery({
      queryKey: ['m1', enterpriseId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('m1_submissions')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
    }),
    qc.prefetchQuery({
      queryKey: ['m1-supporting-docs', enterpriseId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('m1_supporting_documents')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .order('uploaded_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
    }),
    // Monitoring visits — added with migration 281. Photos stay online-only.
    qc.prefetchQuery({
      queryKey: ['monitoring-visits', enterpriseId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('monitoring_visits')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .order('visit_date', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
      },
    }),
    qc.prefetchQuery({
      queryKey: ['enterprise-timeline', enterpriseId],
      queryFn: async () => {
        // The enterprise_timeline view isn't fully typed in Database — same
        // cast pattern as useEnterpriseTimeline.
        const { data, error } = await (
          supabase as unknown as {
            from: (table: string) => {
              select: (cols: string) => {
                eq: (col: string, val: string) => {
                  order: (
                    col: string,
                    opts: { ascending: boolean; nullsFirst?: boolean },
                  ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
                };
              };
            };
          }
        )
          .from('enterprise_timeline')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .order('occurred_at', { ascending: false, nullsFirst: false });
        if (error) throw error;
        return data ?? [];
      },
    }),
  ];

  if (districtId) {
    jobs.push(
      qc.prefetchQuery({
        queryKey: ['community-councils', districtId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('community_councils')
            .select('*')
            .eq('district_id', districtId)
            .order('name');
          if (error) throw error;
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: ['resource-centers', districtId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('resource_centers')
            .select('*')
            .eq('district_id', districtId)
            .order('name');
          if (error) throw error;
          return data ?? [];
        },
      }),
    );
  }

  if (enterpriseTypeId != null) {
    jobs.push(
      qc.prefetchQuery({
        queryKey: ['emmp-template-for-type', enterpriseTypeId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('emmp_templates')
            .select('id, title, version, schema')
            .contains('enterprise_type_ids', [enterpriseTypeId])
            .maybeSingle();
          if (error) throw error;
          return data;
        },
      }),
    );
  }

  await Promise.all(jobs);
  markEnterpriseCached(enterpriseId);
}

// ---------------------------------------------------------------------------
// Resource-center prefetch (the headline feature of this push)
// ---------------------------------------------------------------------------

export interface PrecacheRcParams {
  rcId: string;
  /** Optional progress callback fired per enterprise so the UI can show "4 of 12". */
  onProgress?: (done: number, total: number) => void;
}

export async function precacheResourceCenter(
  qc: QueryClient,
  params: PrecacheRcParams,
): Promise<{ total: number }> {
  const { rcId, onProgress } = params;

  // Fire catalogs in parallel with the RC enterprise-list query. Both are
  // independent so there's no ordering dependency.
  const [_, enterprisesRes] = await Promise.all([
    precacheCatalogs(qc),
    supabase
      .from('enterprises')
      .select('id, enterprise_type_id, district_id')
      .eq('resource_center_id', rcId),
  ]);

  if (enterprisesRes.error) throw enterprisesRes.error;
  const list = enterprisesRes.data ?? [];
  const total = list.length;
  onProgress?.(0, total);

  // Sequential so progress reporting is meaningful + we don't fire 12×8
  // concurrent requests at once. Each enterprise's internal jobs still run
  // in parallel via Promise.all inside precacheEnterprise.
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    await precacheEnterprise(qc, {
      enterpriseId: e.id,
      enterpriseTypeId: e.enterprise_type_id,
      districtId: e.district_id,
    });
    onProgress?.(i + 1, total);
  }

  markRcCached(rcId, list.map((e) => e.id));
  return { total };
}
