/**
 * Sync conflicts review page.
 *
 * When the replay engine detects that the server moved on while a write was
 * sitting in the offline queue, the entry is marked `conflict` instead of
 * silently overwriting. The user lands here from the OfflineBadge ("N
 * conflicts — review →") to triage each entry.
 *
 * Two actions per entry:
 *   - Use mine        — re-run the queued write, overwriting the server
 *   - Discard mine    — drop the queued write, keep the server's version
 *
 * Entries with status='failed' (gave up after N retries) and 'pending'
 * (still waiting) are also surfaced so the user can clear out stuck items.
 */
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueueEntries } from '@/lib/offline-db';
import {
  resolveConflictUseMine,
  resolveConflictDiscardMine,
} from '@/lib/offline-replay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const dt = (Date.now() - t) / 1000;
  if (dt < 60) return 'just now';
  if (dt < 3600) return `${Math.floor(dt / 60)} min ago`;
  if (dt < 86400) return `${Math.floor(dt / 3600)} h ago`;
  return `${Math.floor(dt / 86400)} days ago`;
}

export function SyncConflictsPage() {
  const entries = useQueueEntries();
  const conflicts = entries.filter((e) => e.status === 'conflict');
  const failed = entries.filter((e) => e.status === 'failed');
  const pending = entries.filter((e) => e.status === 'pending' || e.status === 'replaying');

  async function onUseMine(id: string) {
    try {
      await resolveConflictUseMine(id);
      toast.success('Your change was applied — server now has your version');
    } catch (e) {
      toast.error('Could not apply your change', {
        description: e instanceof Error ? e.message : 'unknown error',
      });
    }
  }

  async function onDiscardMine(id: string) {
    if (
      !window.confirm(
        'Discard your queued change?\n\n' +
          'The server\'s current version is kept. Your queued change is permanently dropped.',
      )
    ) return;
    await resolveConflictDiscardMine(id);
    toast.success('Discarded — server version kept');
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
            </Link>
          </Button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sync conflicts</h1>
          <p className="text-sm text-muted-foreground">
            Changes you saved while offline that couldn't be applied automatically. Review each one
            and choose whether your version or the server's wins.
          </p>
        </div>

        {entries.length === 0 && (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-success" />
              No queued changes. All your offline saves have synced.
            </CardContent>
          </Card>
        )}

        {/* Conflicts — highest priority */}
        {conflicts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-destructive">
              {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'}
            </h2>
            {conflicts.map((entry) => (
              <Card key={entry.id} className="border-destructive/40 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    {entry.description}
                  </CardTitle>
                  <CardDescription>
                    Queued {formatRelative(entry.enqueued_at)}
                    {entry.enterprise_id && ' · '}
                    {entry.enterprise_id && (
                      <Link
                        to={`/enterprises/${entry.enterprise_id}`}
                        className="text-primary hover:underline"
                      >
                        Open enterprise →
                      </Link>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    {entry.last_error ?? 'Server has newer data than what you saw when this change was made.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void onUseMine(entry.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Use mine
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void onDiscardMine(entry.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Discard mine
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* Failed — gave up after N retries */}
        {failed.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-destructive">
              {failed.length} failed
            </h2>
            {failed.map((entry) => (
              <Card key={entry.id} className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    {entry.description}
                  </CardTitle>
                  <CardDescription>
                    Queued {formatRelative(entry.enqueued_at)} · {entry.attempts} attempt
                    {entry.attempts === 1 ? '' : 's'} failed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-destructive">{entry.last_error ?? 'Unknown error'}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void onUseMine(entry.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Try again
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void onDiscardMine(entry.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Discard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* Pending / replaying — informational */}
        {pending.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {pending.length} pending
            </h2>
            {pending.map((entry) => (
              <Card key={entry.id} className="bg-muted/20">
                <CardContent className="flex items-center gap-3 py-4 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{entry.description}</div>
                    <div className="text-xs text-muted-foreground">
                      Queued {formatRelative(entry.enqueued_at)}
                      {entry.attempts > 0 && ` · ${entry.attempts} attempt${entry.attempts === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      entry.status === 'replaying'
                        ? 'border-info/40 text-info'
                        : 'border-muted-foreground/40 text-muted-foreground',
                    )}
                  >
                    {entry.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
