/**
 * Header-strip badge that tells the user about their connection + replay state.
 *
 * Visual states:
 *   - Online + empty queue   → small green dot (no label, low chrome)
 *   - Online + replaying     → spinner + "Syncing N…"
 *   - Online + conflicts     → red "N conflicts — review →"
 *   - Offline + empty queue  → amber "Offline"
 *   - Offline + N queued     → amber "Offline · N queued"
 *
 * Click target opens the sync detail panel (Phase 6). For Phase 1 we just
 * render a placeholder dropdown listing the queue entries.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineStatus, probeNow } from '@/lib/online-status';
import {
  getQueueSummary,
  onQueueChange,
  type QueueSummary,
} from '@/lib/offline-db';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineBadge() {
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<QueueSummary>({
    pending: 0,
    replaying: 0,
    conflict: 0,
    failed: 0,
    synced: 0,
  });

  // Refresh summary on mount and whenever the queue changes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const s = await getQueueSummary();
      if (!cancelled) setSummary(s);
    };
    void load();
    const unsub = onQueueChange(() => void load());
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const queued = summary.pending + summary.replaying;
  const conflicts = summary.conflict;
  const failed = summary.failed;

  // When there are conflicts or queued/failed entries, the click takes the
  // user to /sync-conflicts to triage. Otherwise (online + idle) just
  // forces a probe.
  const onClick = () => {
    if (
      summary.conflict > 0 ||
      summary.failed > 0 ||
      summary.pending > 0 ||
      summary.replaying > 0
    ) {
      navigate('/sync-conflicts');
    } else {
      void probeNow();
    }
  };

  // ---- visual variant resolution ----
  let variant: 'idle' | 'offline-empty' | 'offline-queued' | 'syncing' | 'conflict' | 'failed';
  if (conflicts > 0) variant = 'conflict';
  else if (failed > 0 && online === 'online') variant = 'failed';
  else if (summary.replaying > 0) variant = 'syncing';
  else if (online === 'offline' && queued > 0) variant = 'offline-queued';
  else if (online === 'offline') variant = 'offline-empty';
  else variant = 'idle';

  // Idle: render a small dot so the UI doesn't get noisy.
  if (variant === 'idle') {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Online · all changes synced"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-success hover:bg-success/10 transition-colors"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="sr-only">Online</span>
      </button>
    );
  }

  // `variant` has been narrowed past 'idle' by the early return above; these
  // maps cover the remaining states only.
  const styles: Record<Exclude<typeof variant, 'idle'>, string> = {
    'offline-empty':
      'border-warning/40 bg-warning/5 text-warning hover:bg-warning/10',
    'offline-queued':
      'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20',
    syncing:
      'border-info/40 bg-info/10 text-info hover:bg-info/20',
    conflict:
      'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20',
    failed:
      'border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10',
  };

  const labels: Record<Exclude<typeof variant, 'idle'>, { icon: React.ReactNode; text: string; title: string }> = {
    'offline-empty': {
      icon: <WifiOff className="h-3.5 w-3.5" />,
      text: 'Offline',
      title: 'No network detected — changes you make will queue and sync when you reconnect.',
    },
    'offline-queued': {
      icon: <WifiOff className="h-3.5 w-3.5" />,
      text: `Offline · ${queued} queued`,
      title: `Offline. ${queued} change${queued === 1 ? '' : 's'} waiting to sync when you reconnect.`,
    },
    syncing: {
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
      text: `Syncing ${summary.replaying}…`,
      title: `Syncing ${summary.replaying} queued change${summary.replaying === 1 ? '' : 's'}.`,
    },
    conflict: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      text: `${conflicts} conflict${conflicts === 1 ? '' : 's'} — review →`,
      title: `${conflicts} queued change${conflicts === 1 ? '' : 's'} conflict with newer server data. Click to review.`,
    },
    failed: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      text: `${failed} failed`,
      title: `${failed} queued change${failed === 1 ? '' : 's'} failed to sync after multiple attempts.`,
    },
  };

  const v = labels[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      title={v.title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        styles[variant],
      )}
    >
      {v.icon}
      <span>{v.text}</span>
    </button>
  );
}

/** Compact online-only indicator for forms that gate on connection.
 *  Returns null when online, a small inline pill when offline. */
export function OnlineRequiredHint({ feature }: { feature: string }) {
  const online = useOnlineStatus();
  if (online === 'online') return null;
  return (
    <div className="inline-flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/5 px-2.5 py-1.5 text-xs text-warning">
      <WifiOff className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{feature} needs an internet connection.</span>
    </div>
  );
}

/** Inline online-only marker, e.g. next to a button label. */
export function OnlineOnly({ children }: { children: React.ReactNode }) {
  const online = useOnlineStatus();
  if (online === 'online') return <>{children}</>;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Wifi className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
