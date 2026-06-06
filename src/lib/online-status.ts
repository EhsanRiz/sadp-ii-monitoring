/**
 * Online/offline detection.
 *
 * Combines three signals:
 *
 *   1. `navigator.onLine` — fast, but only tells us if the device thinks it
 *      has network. Often wrong on captive portals + spotty cell data.
 *
 *   2. `window` 'online' / 'offline' events — fire when navigator.onLine
 *      flips. Used to kick off queue replay the moment we suspect we're back.
 *
 *   3. Active probe — every PROBE_INTERVAL_MS we send a tiny HEAD request to
 *      the Supabase URL. If it fails, we mark ourselves offline regardless of
 *      what navigator.onLine claims. This is what catches "phone says wifi but
 *      the wifi has no internet" — the common field scenario.
 *
 * The probe runs on a slow cadence (default 30s) to keep battery happy. Apps
 * that care about quicker detection can listen to onConnectionChange directly
 * and trigger their own probe.
 */
import { useEffect, useState } from 'react';

const PROBE_INTERVAL_MS = 30_000;
const PROBE_TIMEOUT_MS = 5_000;

/** Current consensus state. */
export type ConnectionState = 'online' | 'offline';

let currentState: ConnectionState = typeof navigator !== 'undefined' && !navigator.onLine
  ? 'offline'
  : 'online';

type Listener = (state: ConnectionState) => void;
const listeners = new Set<Listener>();

let probeTimer: ReturnType<typeof setInterval> | null = null;

function setState(next: ConnectionState) {
  if (currentState === next) return;
  currentState = next;
  for (const fn of listeners) {
    try {
      fn(next);
    } catch {
      /* swallow listener errors */
    }
  }
}

/**
 * Send a HEAD request to the Supabase health endpoint. Resolves true if the
 * request succeeds within PROBE_TIMEOUT_MS, false otherwise.
 */
async function probe(): Promise<boolean> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) return navigator.onLine;
  // The /auth/v1/health endpoint is unauthenticated and very cheap. If a
  // future Supabase release renames or rate-limits it, we can switch to a
  // function `ping` endpoint instead.
  const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    return res.ok || res.status === 405; // some health endpoints reject HEAD with 405
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function runProbe() {
  // If navigator clearly says we're offline, no point spending battery on a probe.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setState('offline');
    return;
  }
  const reachable = await probe();
  setState(reachable ? 'online' : 'offline');
}

function startProbeLoop() {
  if (typeof window === 'undefined' || probeTimer) return;
  // Kick off an initial probe so first-render state is accurate.
  void runProbe();
  probeTimer = setInterval(() => void runProbe(), PROBE_INTERVAL_MS);

  window.addEventListener('online', () => void runProbe());
  window.addEventListener('offline', () => setState('offline'));
}

/** Start probing if not already started. Idempotent. Call once from main.tsx. */
export function initOnlineStatus(): void {
  startProbeLoop();
}

/** Get the current cached state without triggering a probe. */
export function getOnlineState(): ConnectionState {
  return currentState;
}

/** Subscribe to state changes. Returns an unsubscribe fn. */
export function onConnectionChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** React hook — re-renders the calling component on state change. */
export function useOnlineStatus(): ConnectionState {
  const [state, setLocalState] = useState<ConnectionState>(currentState);
  useEffect(() => onConnectionChange(setLocalState), []);
  return state;
}

/** Force an immediate probe (e.g. when user clicks "Retry sync"). */
export async function probeNow(): Promise<ConnectionState> {
  await runProbe();
  return currentState;
}
