/**
 * "Take this RC offline" button on the Enterprises list.
 *
 * Renders next to the filter card header when the user has selected a
 * Resource Center filter. One tap bulk-caches every enterprise served by
 * that RC, so a field supervisor heading out for the day doesn't have to
 * remember to click "Take offline" on each of their ~12 enterprises
 * individually.
 *
 * State machine:
 *   - `idle`  → "Take this RC offline (N enterprises)"  (or, if previously
 *               cached, "✓ N enterprises cached · Refresh")
 *   - `busy`  → linear progress bar + "Caching for offline · X of N done…"
 *   - `done`  → "✓ Pilot RC offline-ready · cached just now"  (collapses
 *               back to idle/cached on the next render via getRcPrecacheState)
 *
 * `getRcPrecacheState(rcId)` from src/lib/precache.ts is read on every
 * render so the button reflects the last-cached timestamp even after a
 * page refresh.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CloudDownload, Loader2, CheckCircle2, WifiOff } from 'lucide-react';
import { precacheResourceCenter, getRcPrecacheState } from '@/lib/precache';
import { useOnlineStatus } from '@/lib/online-status';
import { cn } from '@/lib/utils';

interface Props {
  rcId: string;
  rcName: string;
  /** Number of enterprises shown in the filtered list. */
  count: number;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.round(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function PrecacheRcButton({ rcId, rcName, count }: Props) {
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const cached = getRcPrecacheState(rcId);

  async function run() {
    if (online !== 'online') {
      toast.error('Reconnect to a network first', {
        description: 'Caching requires fetching data from Supabase; can\'t do that offline.',
      });
      return;
    }
    setBusy(true);
    setProgress({ done: 0, total: count });
    try {
      const { total } = await precacheResourceCenter(qc, {
        rcId,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      toast.success(`${rcName} ready for offline`, {
        description: `Cached ${total} enterprise${total === 1 ? '' : 's'}. You can now lose connection and keep working.`,
      });
    } catch (e) {
      toast.error('Could not cache RC', {
        description: e instanceof Error ? e.message : 'unknown error',
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  // Offline state — surface a hint rather than a disabled button so the
  // user understands why it's not actionable.
  if (online === 'offline' && !cached) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <WifiOff className="h-3.5 w-3.5" />
        Reconnect to cache this RC offline
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={cached ? 'outline' : 'default'}
        onClick={run}
        disabled={busy}
        className={cn(cached && 'border-success/40 text-success hover:bg-success/5')}
      >
        {busy ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Caching {progress?.done ?? 0}/{progress?.total ?? count}…
          </>
        ) : cached ? (
          <>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            {rcName} cached · Refresh
          </>
        ) : (
          <>
            <CloudDownload className="mr-1.5 h-3.5 w-3.5" />
            Take {rcName} offline ({count})
          </>
        )}
      </Button>
      {cached && !busy && (
        <span className="text-[10px] text-muted-foreground">
          Last cached {relativeTime(cached.cachedAt)} · {cached.count} enterprise
          {cached.count === 1 ? '' : 's'}
        </span>
      )}
      {busy && progress && (
        // Thin progress bar for visual reassurance during a sequential
        // 12-enterprise cache (can take 30-60s on a slow LTE link).
        <div className="w-40 h-1 rounded bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
