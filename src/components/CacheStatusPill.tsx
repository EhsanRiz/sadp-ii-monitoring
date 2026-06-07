/**
 * CacheStatusPill — shows the auto-cache state in the AppShell header.
 *
 * Visual states:
 *   idle           → green "✓ N ready · synced 5m ago"  (click → refresh)
 *   syncing        → blue spinner "Caching N…"
 *   error          → red "Cache failed · Retry"
 *   never synced   → muted "Setting up offline copy…"
 *
 * Click anywhere triggers a manual re-sync.  Hover tooltip shows the exact
 * timestamp of the last successful sync.
 */
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useAutoCacheProgress, manualResync } from '@/lib/auto-cache';
import { cn } from '@/lib/utils';

function relTime(iso: string | null): string {
  if (!iso) return '';
  const dMs = Date.now() - new Date(iso).getTime();
  const dMin = Math.max(0, Math.floor(dMs / 60_000));
  if (dMin < 1)   return 'just now';
  if (dMin < 60)  return `${dMin}m ago`;
  const dH = Math.floor(dMin / 60);
  if (dH < 24)    return `${dH}h ago`;
  const dD = Math.floor(dH / 24);
  return `${dD}d ago`;
}

export function CacheStatusPill() {
  const qc = useQueryClient();
  const p = useAutoCacheProgress();
  const lastIso = p.last_sync_at;
  const tooltip = lastIso
    ? `Last sync: ${new Date(lastIso).toLocaleString()}`
    : 'Not yet synced';

  if (p.status === 'syncing') {
    return (
      <Pill tone="info" title="Refreshing your offline copy…">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Caching{p.cached_count > 0 ? ` ${p.cached_count}` : ''}…</span>
      </Pill>
    );
  }
  if (p.status === 'error') {
    return (
      <Pill tone="danger" onClick={() => manualResync(qc)} title={p.error ?? 'Sync failed — click to retry'}>
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Cache failed · Retry</span>
      </Pill>
    );
  }
  if (p.cached_count === 0 && !lastIso) {
    return (
      <Pill tone="muted" title="Auto-sync will run when you're online.">
        <Loader2 className="h-3.5 w-3.5 animate-spin opacity-60" />
        <span className="hidden sm:inline">Setting up offline copy…</span>
        <span className="sm:hidden">Setup…</span>
      </Pill>
    );
  }

  // Idle / done
  return (
    <Pill tone="success" onClick={() => manualResync(qc)} title={tooltip}>
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span className="tabular-nums">{p.cached_count} ready</span>
      {lastIso && (
        <>
          <span className="opacity-40">·</span>
          <span className="opacity-80">{relTime(lastIso)}</span>
        </>
      )}
      <RefreshCcw className="h-3 w-3 opacity-50 ml-0.5 hidden sm:inline-block" />
    </Pill>
  );
}

function Pill({
  children, tone, onClick, title,
}: {
  children: React.ReactNode;
  tone: 'success' | 'info' | 'danger' | 'muted';
  onClick?: () => void;
  title?: string;
}) {
  const toneCls = {
    success: 'border-success/30 bg-tint-success/50 text-success hover:bg-tint-success/70',
    info:    'border-info/30 bg-tint-info/50 text-info',
    danger:  'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20',
    muted:   'border-muted bg-muted/30 text-muted-foreground',
  }[tone];
  const isButton = !!onClick;
  const Tag = isButton ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-medium',
        'border rounded-full px-2.5 py-1 transition-colors',
        isButton ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30' : '',
        toneCls,
      )}
    >{children}</Tag>
  );
}
