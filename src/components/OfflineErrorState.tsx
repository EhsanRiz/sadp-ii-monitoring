/**
 * Friendly fallback for a failed React Query when we know we're offline.
 *
 * Replaces the raw "TypeError: Failed to fetch" message that supabase-js
 * surfaces when there's no network — that message is useless to field
 * staff and was the trigger for the "I cannot load any data when offline"
 * report.
 *
 * Behaviour:
 *   - Online + error  → show the real error text so devs / power users
 *     can act on it (RLS denial, schema mismatch, etc.).
 *   - Offline + error → show a calm explanation that the page hasn't
 *     been cached on this device yet, plus a Try-again button that
 *     re-fires the failed queries on the next online transition.
 *
 * Pages call this in place of their bespoke error Card. They can opt to
 * pass a list of useQuery results so we can trigger their refetch()
 * methods from the Try-again button.
 */
import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnlineStatus, probeNow } from '@/lib/online-status';

interface Props {
  /** The error from a useQuery hook. */
  error: Error | unknown;
  /**
   * Optional list of useQuery refetch functions to call when the user taps
   * "Try again". If omitted, we just nudge the online probe so the next
   * render's queries fire automatically when the network comes back.
   */
  retry?: Array<() => Promise<unknown>>;
  /** Short label describing what failed to load ("dashboard data", "enterprises list", etc.). */
  label?: string;
}

export function OfflineErrorState({ error, retry, label = 'this page' }: Props) {
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);

  async function onRetry() {
    setBusy(true);
    try {
      // Re-probe first so the OfflineBadge updates immediately if we're
      // actually back online by now.
      await probeNow();
      if (retry?.length) {
        await Promise.allSettled(retry.map((fn) => fn()));
      }
    } finally {
      setBusy(false);
    }
  }

  if (online === 'offline') {
    return (
      <Card className="border-info/30 bg-info/5">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-info" />
            <h2 className="text-base font-medium">Not loaded offline yet</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {label === 'this page' ? 'This page' : `The ${label}`} hasn't been
            opened on this device since going offline. To make it available
            offline, reconnect to a network, open it once, then it will load
            from the cache going forward.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={onRetry} disabled={busy}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
              {busy ? 'Trying…' : 'Try again'}
            </Button>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Tip: while online, tap{' '}
              <span className="font-medium">Take this RC offline</span>{' '}
              on the Enterprises list to bulk-cache the enterprises you'll visit.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Online but query still errored — surface the real message.
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error';
  return (
    <Card className="border-destructive bg-tint-danger">
      <CardContent className="pt-6 text-sm text-destructive space-y-3">
        <div>{message}</div>
        {retry?.length && (
          <Button size="sm" variant="outline" onClick={onRetry} disabled={busy}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
