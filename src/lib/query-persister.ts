/**
 * React Query persistence backed by the same IndexedDB the offline queue uses.
 *
 * The persister snapshots the full React Query cache to IDB whenever it
 * changes (debounced) and restores it on page load. Combined with the
 * `gcTime` settings in main.tsx, this means:
 *
 *   - A query the user fetched yesterday is still in cache today.
 *   - When the device is offline, useQuery() returns the cached value
 *     immediately instead of throwing.
 *   - When the device is online, React Query's normal stale-while-revalidate
 *     behaviour kicks in — cached value renders first, fresh fetch swaps in.
 *
 * This is the read-side complement to Phase 1's queue. Together they make
 * the app fully readable AND writable offline.
 */
import {
  experimental_createQueryPersister,
  type AsyncStorage,
} from '@tanstack/react-query-persist-client';
import { cacheGet, cachePut } from '@/lib/offline-db';

const RQ_PREFIX = 'rq:';

/**
 * AsyncStorage adapter for the offline-db `cache` store. Each cache slot is
 * keyed by `rq:<hashed query key>` so it shares the IDB but doesn't collide
 * with future direct cache uses.
 */
const idbStorage: AsyncStorage<string> = {
  async getItem(key: string): Promise<string | undefined> {
    const v = await cacheGet<string>(`${RQ_PREFIX}${key}`);
    return v ?? undefined;
  },
  async setItem(key: string, value: string): Promise<void> {
    await cachePut(`${RQ_PREFIX}${key}`, value);
  },
  async removeItem(key: string): Promise<void> {
    // We don't currently remove from cache. The cache grows bounded by the
    // number of distinct query keys (small) and is invalidated by
    // `maxAge` below, so unused entries will time out on their own.
    await cachePut(`${RQ_PREFIX}${key}`, '__expired__');
  },
};

/**
 * The persister we install on QueryClient. The `experimental_createPersister`
 * API persists ON A PER-QUERY BASIS — each query writes to storage when it
 * settles, instead of one big debounced dump. That avoids reading + writing
 * the entire cache on every change.
 *
 * `maxAge` keeps very old entries from sticking around forever — anything
 * older than 14 days won't be restored.
 */
const persister = experimental_createQueryPersister({
  storage: idbStorage,
  maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
  // Skip queries whose result isn't JSON-serializable. Maps + Sets round-trip
  // through JSON as plain objects/arrays, which then breaks downstream code
  // that calls `.values()` / `.entries()` / `.has()` etc. on what it thought
  // was still a Map.
  filters: {
    predicate: (query) => {
      const data = query.state.data;
      if (data instanceof Map) return false;
      if (data instanceof Set) return false;
      return true;
    },
  },
});

/** Hand this to `defaultOptions.queries.persister` on the QueryClient. */
export const queryPersister = persister.persisterFn;
