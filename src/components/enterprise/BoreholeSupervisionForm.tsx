/**
 * Borehole Supervision form — 6 checkbox/date rows + optional notes textarea.
 * Single Save button (no per-row autosave so 6 quick clicks don't trigger 6
 * round-trips). Progress strip at top counts completed milestones.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Droplet, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BOREHOLE_MILESTONES,
  countCompleted,
  type BoreholeMilestoneId,
  type BoreholeSupervisionResponses,
} from '@/forms/boreholeSupervisionSchema';

interface Props {
  enterpriseId: string;
  initial: BoreholeSupervisionResponses | null | undefined;
  readOnly?: boolean;
}

export function BoreholeSupervisionForm({ enterpriseId, initial, readOnly = false }: Props) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<BoreholeSupervisionResponses>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(initial ?? {});
    setDirty(false);
  }, [initial, enterpriseId]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('enterprises')
        .update({ borehole_supervision: draft as unknown as never })
        .eq('id', enterpriseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Borehole supervision saved');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['enterprise', enterpriseId] });
    },
    onError: (e: Error) => toast.error('Save failed', { description: e.message }),
  });

  function patchMilestone(id: BoreholeMilestoneId, patch: { done?: boolean; date?: string }) {
    setDraft((d) => {
      const prev = d[id] ?? { done: false };
      const next: { done: boolean; date?: string } = {
        done: patch.done !== undefined ? patch.done : prev.done,
        date: patch.date !== undefined ? patch.date : prev.date,
      };
      if (!next.date) delete next.date;
      return { ...d, [id]: next };
    });
    setDirty(true);
  }

  const completed = countCompleted(draft);
  const total = BOREHOLE_MILESTONES.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total;

  return (
    <div className="space-y-4">
      {/* Progress card */}
      <Card className={cn(
        'transition-all duration-200',
        allDone ? 'border-success/40 bg-gradient-to-br from-tint-success/40 to-background'
                : 'bg-gradient-to-br from-tint-info/30 to-background border-info/20',
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Droplet className={cn('h-4 w-4', allDone ? 'text-success' : 'text-info')} />
                Borehole supervision
              </CardTitle>
              <CardDescription>
                Track the six drilling-lifecycle milestones for this enterprise. Tick
                each as it completes and record the completion date.
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums shrink-0">
              {allDone && <CheckCircle2 className="h-3 w-3 text-success" />}
              {completed} / {total} · {pct}%
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300',
                allDone ? 'bg-success' : 'bg-info')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Milestone list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Milestones</CardTitle>
          <CardDescription className="text-xs">
            Tick the checkbox when completed, then set the date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {BOREHOLE_MILESTONES.map((m, i) => {
              const entry = draft[m.id];
              const isDone = entry?.done === true;
              return (
                <li
                  key={m.id}
                  className={cn(
                    'py-3 grid gap-3 md:grid-cols-[auto_1fr_180px] items-start transition-colors duration-150',
                    'hover:bg-muted/30',
                    isDone && 'bg-success/5 hover:bg-success/10',
                  )}
                >
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-muted-foreground tabular-nums w-4 text-right">{i + 1}.</span>
                    <input
                      type="checkbox"
                      checked={isDone}
                      disabled={readOnly}
                      onChange={(e) => patchMilestone(m.id, { done: e.target.checked })}
                      className="h-4 w-4 rounded border-input text-success focus:ring-2 focus:ring-success/30 disabled:cursor-not-allowed cursor-pointer accent-success"
                      aria-label={`Mark ${m.label} as completed`}
                    />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <Label className={cn('text-sm font-medium block', isDone && 'text-success')}>
                      {m.label}
                    </Label>
                    {m.helper && <p className="text-xs text-muted-foreground mt-0.5">{m.helper}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${m.id}-date`} className="text-xs text-muted-foreground">
                      Completion date
                    </Label>
                    <Input
                      id={`${m.id}-date`}
                      type="date"
                      value={entry?.date ?? ''}
                      disabled={readOnly || !isDone}
                      onChange={(e) => patchMilestone(m.id, { date: e.target.value || undefined })}
                      className="h-8 text-xs"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Notes (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Anything worth flagging — contractor issues, delays, water-quality observations…"
            value={draft.notes ?? ''}
            disabled={readOnly}
            onChange={(e) => {
              setDraft((d) => ({ ...d, notes: e.target.value || undefined }));
              setDirty(true);
            }}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Save row */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {dirty && (
            <span className="inline-flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="h-3 w-3" /> Unsaved changes
            </span>
          )}
          <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            <Save className="mr-2 h-3 w-3" />
            {save.isPending ? 'Saving…' : 'Save borehole supervision'}
          </Button>
        </div>
      )}
    </div>
  );
}
