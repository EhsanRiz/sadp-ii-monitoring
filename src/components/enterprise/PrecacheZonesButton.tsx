/**
 * "Take zones offline" — bulk-cache every Maseru enterprise in one or more
 * monitoring Zones for offline field work.
 *
 * A field supervisor heading out to cover, say, Zones 3, 4 and 6 for the day
 * taps this once, ticks those zones, and every enterprise in them is cached —
 * no need to open each beneficiary individually or filter zone-by-zone.
 *
 * Zoning is Maseru-only, so this control is only rendered in a Maseru context
 * (see EnterprisesListPage). The dialog shows a live enterprise count per zone,
 * a per-zone "offline-ready" tick (from the localStorage registry), select-all
 * / clear, and a progress bar while caching.
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CloudDownload, Loader2, CheckCircle2, Layers, WifiOff } from 'lucide-react';
import {
  precacheZones,
  getAllZonePrecacheStates,
  zoneKey,
  type ZoneKey,
} from '@/lib/precache';
import { MASERU_ZONES, zoneLabel } from '@/lib/enterprises';
import { useOnlineStatus } from '@/lib/online-status';
import { cn } from '@/lib/utils';

interface Props {
  /** Maseru district id — scopes the count query + the cache. */
  districtId: string;
}

/** Zone keys offered in the picker: the 8 numbered zones plus Unzoned. */
const ZONE_KEYS: ZoneKey[] = [...MASERU_ZONES.map(String), 'unzoned'];

function relativeTime(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? '' : 's'} ago`;
}

export function PrecacheZonesButton({ districtId }: Props) {
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<ZoneKey>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Count enterprises per zone. Fetched only while the dialog is open so we
  // don't add a query to every list render. Lightweight: id + zone only.
  const { data: rows, isLoading } = useQuery({
    queryKey: ['zone-precache-counts', districtId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enterprises')
        .select('id, zone')
        .eq('district_id', districtId);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; zone: number | null }>;
    },
    enabled: open,
    staleTime: 60_000,
  });

  const countByZone = useMemo(() => {
    const m = new Map<ZoneKey, number>();
    for (const r of rows ?? []) m.set(zoneKey(r.zone), (m.get(zoneKey(r.zone)) ?? 0) + 1);
    return m;
  }, [rows]);

  // Cheap synchronous localStorage read — re-runs each render so per-zone
  // "cached" ticks reflect the latest state right after a cache finishes.
  const cachedStates = getAllZonePrecacheStates();

  const selectedCount = useMemo(
    () => [...selected].reduce((sum, k) => sum + (countByZone.get(k) ?? 0), 0),
    [selected, countByZone],
  );

  function toggle(key: ZoneKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Only zones that actually have enterprises are selectable / select-all-able.
  const availableKeys = ZONE_KEYS.filter((k) => (countByZone.get(k) ?? 0) > 0);
  const allSelected = availableKeys.length > 0 && availableKeys.every((k) => selected.has(k));

  function selectAll() {
    setSelected(allSelected ? new Set() : new Set(availableKeys));
  }

  async function run() {
    if (online !== 'online') {
      toast.error('Reconnect to a network first', {
        description: "Caching fetches data from Supabase — that can't happen offline.",
      });
      return;
    }
    if (selected.size === 0) return;
    setBusy(true);
    setProgress({ done: 0, total: selectedCount });
    try {
      const { total } = await precacheZones(qc, {
        districtId,
        zones: [...selected],
        onProgress: (done, t) => setProgress({ done, total: t }),
      });
      const zoneNames = [...selected]
        .sort()
        .map((k) => (k === 'unzoned' ? 'Unzoned' : `Zone ${k}`))
        .join(', ');
      toast.success('Zones ready for offline', {
        description: `Cached ${total} enterprise${total === 1 ? '' : 's'} across ${zoneNames}. You can now lose connection and keep working.`,
      });
      setOpen(false);
      setSelected(new Set());
    } catch (e) {
      toast.error('Could not cache zones', {
        description: e instanceof Error ? e.message : 'unknown error',
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Layers className="mr-1.5 h-3.5 w-3.5" />
          Take zones offline
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Take zones offline</DialogTitle>
          <DialogDescription>
            Pick one or more Maseru zones to cache every enterprise in them for offline use.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {online === 'offline' ? (
            <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-muted-foreground">
              <WifiOff className="h-4 w-4 shrink-0" />
              You're offline. Reconnect to cache zones — already-cached zones stay available.
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {isLoading ? 'Loading zones…' : `${availableKeys.length} zone${availableKeys.length === 1 ? '' : 's'} with enterprises`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={selectAll}
              disabled={busy || availableKeys.length === 0}
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </Button>
          </div>

          {/* Zone toggle grid — tap to (de)select. Cached zones show a tick. */}
          <div className="grid grid-cols-2 gap-2">
            {ZONE_KEYS.map((k) => {
              const count = countByZone.get(k) ?? 0;
              const isSel = selected.has(k);
              const cached = cachedStates[k];
              const disabled = busy || count === 0;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggle(k)}
                  disabled={disabled}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    isSel
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground',
                    disabled && !isSel && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {k === 'unzoned' ? 'Unzoned' : zoneLabel(Number(k))}
                    </span>
                    <span
                      className={cn(
                        'block text-[10px]',
                        isSel ? 'text-primary-foreground/80' : 'text-muted-foreground',
                      )}
                    >
                      {count} enterprise{count === 1 ? '' : 's'}
                      {cached ? ` · cached ${relativeTime(cached.cachedAt)}` : ''}
                    </span>
                  </span>
                  {cached && (
                    <CheckCircle2
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isSel ? 'text-primary-foreground' : 'text-success',
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {busy && progress && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Caching {progress.done} of {progress.total} enterprises…
              </p>
            </div>
          )}

          <Button type="button" className="w-full" onClick={run} disabled={busy || selected.size === 0}>
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Caching {progress?.done ?? 0}/{progress?.total ?? selectedCount}…
              </>
            ) : (
              <>
                <CloudDownload className="mr-1.5 h-4 w-4" />
                {selected.size === 0
                  ? 'Select zones to cache'
                  : `Take ${selectedCount} enterprise${selectedCount === 1 ? '' : 's'} offline`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
