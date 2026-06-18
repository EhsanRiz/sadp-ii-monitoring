/**
 * IndexedDB wrapper for the offline-first stack.
 *
 * Two object stores in `sadp_offline` DB:
 *
 *   queue — pending writes that need to be replayed when the device reconnects.
 *     One entry per attempted mutation; entries persist across browser
 *     restarts (data lives in IndexedDB, not session memory).
 *
 *   cache — last-known reads, used by React Query persistence (Phase 2)
 *     and by the "Pre-cache enterprise for offline" button.
 *
 * Phase 1 implements only the queue side. The cache side is unused but the
 * schema is provisioned now so Phase 2 doesn't need a migration.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export type QueueKind = 'mutation' | 'rpc' | 'upload' | 'storage_remove';
export type QueueStatus = 'pending' | 'replaying' | 'synced' | 'conflict' | 'failed';

export interface QueueEntry {
  /** Stable UUID generated at enqueue time; used as the IDB key. */
  id: string;
  /** What category of write this is, for replay routing. */
  kind: QueueKind;
  /** Human-readable description shown in the queue UI. */
  description: string;
  /** Optional enterprise context — used to group queued writes per enterprise. */
  enterprise_id: string | null;
  /** Serialised mutation payload. Shape depends on kind:
   *   mutation → { table, op: 'insert' | 'update' | 'upsert' | 'delete', match, values }
   *   rpc      → { fn, args }
   *   upload   → { bucket, path, blob_key, content_type, options }
   *   storage_remove → { bucket, paths } */
  payload: Record<string, unknown>;
  /** updated_at value of the source row at enqueue time. Used by Phase 6
   *  conflict detection — if the server's updated_at is later than this when
   *  we replay, the write is marked 'conflict' instead of overwriting. */
  source_updated_at: string | null;
  /** ISO timestamp of enqueue. */
  enqueued_at: string;
  /** Replay attempt count. Capped at 5 before being marked 'failed'. */
  attempts: number;
  /** Last error message from a failed replay attempt. */
  last_error: string | null;
  /** Current state of this entry in its lifecycle. */
  status: QueueStatus;
}

export interface CacheEntry {
  /** "table:key" or "rq:hashed-query-key". */
  cacheKey: string;
  value: unknown;
  fetched_at: string;
}

export interface CacheStateRow {
  /** Enterprise UUID — the IDB key. */
  enterprise_id: string;
  /** ISO timestamp of the last successful auto-cache sync for this enterprise. */
  cached_at: string;
  /** updated_at of the enterprise row at the moment of caching — used for
   *  staleness detection (compare with the server's current updated_at). */
  source_updated_at: string | null;
}

/**
 * A binary payload (photo) captured offline and parked in IDB until its queue
 * entry replays. Keyed by a UUID `blob_key` referenced from the queue payload,
 * so the (potentially multi-MB) image never has to be JSON-serialised into the
 * queue entry itself.
 */
export interface BlobEntry {
  key: string;
  blob: Blob;
  content_type: string;
  filename: string;
  created_at: string;
}

interface SadpOfflineSchema extends DBSchema {
  queue: {
    key: string;
    value: QueueEntry;
    indexes: {
      'by-status': string;
      'by-enterprise': string;
      'by-enqueued_at': string;
    };
  };
  cache: {
    key: string;
    value: CacheEntry;
  };
  cache_state: {
    key: string;
    value: CacheStateRow;
  };
  blobs: {
    key: string;
    value: BlobEntry;
  };
}

const DB_NAME = 'sadp_offline';
// v3 bump: the persister `filters` option doesn't actually gate per-query
// persistence, so Maps from useEnterpriseLifecycle / useUserDisplayNames
// were still leaking into the cache as plain objects and breaking
// `.values()` / `.get()` on rehydrate. The fix is two-pronged: change
// those hooks to return plain Records at the source (commit), AND clear
// the cache one more time for users who already have the bad data.
// v5 bump: add the `blobs` store so photos captured offline (e.g. monitoring
// visit photos) can be parked locally and uploaded when the device reconnects.
const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<SadpOfflineSchema>> | null = null;
let dbConn: IDBPDatabase<SadpOfflineSchema> | null = null;

function getDb(): Promise<IDBPDatabase<SadpOfflineSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<SadpOfflineSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          // Initial schema (was DB_VERSION = 1 in Phase 1).
          const store = db.createObjectStore('queue', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-enterprise', 'enterprise_id');
          store.createIndex('by-enqueued_at', 'enqueued_at');
          db.createObjectStore('cache', { keyPath: 'cacheKey' });
        }
        if (oldVersion < 2) {
          // v2 migration: purge cache store. The previous persister wrote
          // queries whose data is a JS Map (e.g. enterprise-lifecycle) into
          // the cache as plain objects, which then broke `.values()` calls on
          // re-hydrate.
          if (db.objectStoreNames.contains('cache')) {
            void tx.objectStore('cache').clear();
          }
        }
        if (oldVersion < 3) {
          // v3 migration: the persister filter we shipped in v2 didn't
          // actually gate per-query persistence, so Maps kept leaking in.
          // The hooks that return Maps were rewritten to return Records at
          // the source — but anyone with cached Map data from before that
          // commit will still see the broken hydrate path. Clear the cache
          // one more time to flush the bad entries.
          if (db.objectStoreNames.contains('cache')) {
            void tx.objectStore('cache').clear();
          }
        }
        if (oldVersion < 4) {
          // v4 — track per-enterprise auto-cache state so we can show
          // "cached" indicators in the list and last-sync timestamps in the
          // pre-cache button without losing state across reloads.
          if (!db.objectStoreNames.contains('cache_state')) {
            db.createObjectStore('cache_state', { keyPath: 'enterprise_id' });
          }
        }
        if (oldVersion < 5) {
          // v5 — binary store for offline-captured photos awaiting upload.
          if (!db.objectStoreNames.contains('blobs')) {
            db.createObjectStore('blobs', { keyPath: 'key' });
          }
        }
      },
      // Another tab holds an older-version connection open, blocking our
      // upgrade. Without handling this, openDB() never resolves and EVERY
      // offline write (save draft, photo enqueue) hangs forever — the
      // "Saving…" / "Adding…" spinner that never finishes. We just log; the
      // blocking tab's `blocking` handler (same code) closes its connection.
      blocked() {
        console.warn('[offline-db] open is blocked by another tab/connection');
      },
      // We are the tab holding a connection that is blocking another tab's
      // upgrade. Close so the upgrade can proceed; next getDb() re-opens.
      blocking() {
        console.warn('[offline-db] closing connection to unblock another tab');
        dbConn?.close();
        dbConn = null;
        dbPromise = null;
      },
      // Browser killed the connection (e.g. storage pressure). Allow re-open.
      terminated() {
        dbConn = null;
        dbPromise = null;
      },
    })
      .then((db) => {
        dbConn = db;
        // If the browser closes this connection out from under us, drop the
        // cached promise so the next call transparently re-opens.
        db.addEventListener('close', () => {
          dbConn = null;
          dbPromise = null;
        });
        return db;
      })
      .catch((e) => {
        // Never cache a rejected/failed open — otherwise every later call
        // re-throws the same error instead of retrying.
        dbPromise = null;
        throw e;
      });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Queue API
// ---------------------------------------------------------------------------

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for very old browsers (unlikely in our PWA target).
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export interface EnqueueInput {
  kind: QueueKind;
  description: string;
  enterprise_id?: string | null;
  payload: Record<string, unknown>;
  source_updated_at?: string | null;
}

/** Append a new write to the replay queue. Returns the persisted entry. */
export async function enqueue(input: EnqueueInput): Promise<QueueEntry> {
  const db = await getDb();
  const entry: QueueEntry = {
    id: genId(),
    kind: input.kind,
    description: input.description,
    enterprise_id: input.enterprise_id ?? null,
    payload: input.payload,
    source_updated_at: input.source_updated_at ?? null,
    enqueued_at: new Date().toISOString(),
    attempts: 0,
    last_error: null,
    status: 'pending',
  };
  await db.put('queue', entry);
  notifyChange();
  return entry;
}

/** Return every entry, oldest first. */
export async function getAllQueueEntries(): Promise<QueueEntry[]> {
  const db = await getDb();
  return (await db.getAllFromIndex('queue', 'by-enqueued_at')) as QueueEntry[];
}

/** Return only entries that still need attention (pending or conflict or failed). */
export async function getActiveQueueEntries(): Promise<QueueEntry[]> {
  const all = await getAllQueueEntries();
  return all.filter((e) => e.status !== 'synced');
}

export interface QueueSummary {
  pending: number;
  replaying: number;
  conflict: number;
  failed: number;
  synced: number;
}

/** Counts by status. Cheap — single tx, single iteration. */
export async function getQueueSummary(): Promise<QueueSummary> {
  const all = await getAllQueueEntries();
  const out: QueueSummary = { pending: 0, replaying: 0, conflict: 0, failed: 0, synced: 0 };
  for (const e of all) out[e.status] += 1;
  return out;
}

/** Patch one entry's status (replay loop calls this between attempts). */
export async function markStatus(
  id: string,
  status: QueueStatus,
  lastError?: string | null,
): Promise<void> {
  const db = await getDb();
  const existing = await db.get('queue', id);
  if (!existing) return;
  const next: QueueEntry = {
    ...existing,
    status,
    last_error: lastError ?? existing.last_error,
    attempts: status === 'replaying' ? existing.attempts + 1 : existing.attempts,
  };
  await db.put('queue', next);
  notifyChange();
}

/**
 * Re-snapshot one entry's `source_updated_at` (the conflict baseline). Used by
 * replay to rebase a pending entry after one of our own earlier writes advanced
 * the target row's updated_at — so the user's own sequential offline edits
 * don't self-conflict.
 */
export async function setEntrySourceUpdatedAt(
  id: string,
  source_updated_at: string | null,
): Promise<void> {
  const db = await getDb();
  const existing = await db.get('queue', id);
  if (!existing) return;
  await db.put('queue', { ...existing, source_updated_at });
  notifyChange();
}

/** Permanently remove one entry (after successful replay, or when user discards). */
export async function purge(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('queue', id);
  notifyChange();
}

/** Purge every entry whose status is 'synced'. */
export async function purgeSynced(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('queue', 'readwrite');
  const idx = tx.store.index('by-status');
  for await (const cursor of idx.iterate('synced')) {
    await cursor.delete();
  }
  await tx.done;
  notifyChange();
}

// ---------------------------------------------------------------------------
// Cache API (Phase 2 — implemented now for schema)
// ---------------------------------------------------------------------------

export async function cachePut(cacheKey: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('cache', { cacheKey, value, fetched_at: new Date().toISOString() });
}

export async function cacheGet<T = unknown>(cacheKey: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.get('cache', cacheKey);
  return (row?.value as T) ?? null;
}

// ---------------------------------------------------------------------------
// Blob store — offline-captured binaries (photos) awaiting upload
// ---------------------------------------------------------------------------

/** Park a binary in IDB under a fresh key. Returns the key for the queue payload. */
export async function putBlob(
  blob: Blob,
  meta: { content_type: string; filename: string },
): Promise<string> {
  const db = await getDb();
  const key = genId();
  await db.put('blobs', {
    key,
    blob,
    content_type: meta.content_type,
    filename: meta.filename,
    created_at: new Date().toISOString(),
  });
  return key;
}

export async function getBlob(key: string): Promise<BlobEntry | undefined> {
  const db = await getDb();
  return (await db.get('blobs', key)) as BlobEntry | undefined;
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await getDb();
  await db.delete('blobs', key);
}

// ---------------------------------------------------------------------------
// Change notifications — components subscribe to refresh badge counts etc.
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyChange() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* swallow */
    }
  }
}

/** Subscribe to queue mutations. Returns an unsubscribe fn. */
export function onQueueChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ---------------------------------------------------------------------------
// React hook — re-render on queue changes
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';

/**
 * Reactive list of every queued entry (pending / conflict / failed).
 * Re-fetches whenever the queue changes.
 */
export function useQueueEntries(): QueueEntry[] {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const all = await getActiveQueueEntries();
      if (!cancelled) setEntries(all);
    };
    void load();
    const unsub = onQueueChange(() => void load());
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);
  return entries;
}

// ---------------------------------------------------------------------------
// Cache-state helpers (v4 onwards) — tiny key/value layer over the
// cache_state object store. The shape mirrors `CacheStateRow` above. We
// expose this via simple functions instead of React Query so it can be
// read from a layout component without subscribing to a query.
// ---------------------------------------------------------------------------
export async function getAllCacheState(): Promise<CacheStateRow[]> {
  const db = await getDb();
  return (await db.getAll('cache_state')) as CacheStateRow[];
}

export async function getCacheStateFor(enterpriseId: string): Promise<CacheStateRow | undefined> {
  const db = await getDb();
  return (await db.get('cache_state', enterpriseId)) as CacheStateRow | undefined;
}

export async function setCacheStateRows(rows: CacheStateRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  const tx = db.transaction('cache_state', 'readwrite');
  await Promise.all(rows.map((r) => tx.objectStore('cache_state').put(r)));
  await tx.done;
}

export async function clearCacheStateFor(enterpriseId: string): Promise<void> {
  const db = await getDb();
  await db.delete('cache_state', enterpriseId);
}

export async function clearAllCacheState(): Promise<void> {
  const db = await getDb();
  await db.clear('cache_state');
}

