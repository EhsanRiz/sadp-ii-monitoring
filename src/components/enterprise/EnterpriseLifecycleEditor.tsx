/**
 * 11-row editor for the enterprise lifecycle tracker.
 *
 * Manual milestones (6): editable ✓/×/N/A pill triplet.
 * Derived milestones (5): read-only badge showing the current computed value,
 *   with a tooltip explaining the derivation rule.
 *
 * Saves are debounced/explicit (user clicks "Save lifecycle") rather than on
 * each pill click — keeps the UI snappy and avoids 11 round-trips when the
 * user is updating multiple rows in a row.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { Save, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  LIFECYCLE_MILESTONES,
  lifecycleGlyph,
  MANUAL_MILESTONE_IDS,
  type EnterpriseLifecycleRow,
  type LifecycleValue,
  type LifecycleMilestoneId,
} from '@/lib/lifecycle';
import { useSaveEnterpriseLifecycle } from '@/lib/enterprises';

interface Props {
  enterpriseId: string;
  /** Server-side computed row (5 derived + 6 manual hydrated from jsonb). May be null while loading. */
  lifecycle: EnterpriseLifecycleRow | null | undefined;
  /** Disable all editing (e.g. for read-only viewers). */
  readOnly?: boolean;
}

/** Stored shape of the manual portion (subset of LIFECYCLE_MILESTONES). */
type ManualMap = Partial<Record<LifecycleMilestoneId, LifecycleValue>>;

export function EnterpriseLifecycleEditor({ enterpriseId, lifecycle, readOnly = false }: Props) {
  const save = useSaveEnterpriseLifecycle(enterpriseId);
  const [draft, setDraft] = useState<ManualMap>({});
  const [dirty, setDirty] = useState(false);

  // Hydrate draft when lifecycle arrives or enterprise switches.
  useEffect(() => {
    if (!lifecycle) return;
    const next: ManualMap = {};
    for (const id of MANUAL_MILESTONE_IDS) {
      const v = lifecycle[id] as LifecycleValue | null | undefined;
      if (v === 'yes' || v === 'no' || v === 'n_a') next[id] = v;
    }
    setDraft(next);
    setDirty(false);
  }, [lifecycle, enterpriseId]);

  function setManual(id: LifecycleMilestoneId, value: LifecycleValue | null) {
    setDraft((d) => {
      const next = { ...d };
      if (value === null) delete next[id];
      else next[id] = value;
      return next;
    });
    setDirty(true);
  }

  function onSave() {
    save.mutate(draft as Record<string, 'yes' | 'no' | 'n_a'>, {
      onSuccess: () => {
        toast.success('Lifecycle saved');
        setDirty(false);
      },
      onError: (e: Error) => {
        toast.error('Save failed', { description: e.message });
      },
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Enterprise lifecycle</CardTitle>
            <CardDescription>
              11 milestones tracked across both partners. Six are edited here; five
              are <span className="font-medium">auto-derived</span> from existing data
              (signatures, business plan status, ESMP approvals, grant payment, M1
              submission). Saved as a single jsonb on the enterprise row.
            </CardDescription>
          </div>
          {dirty && !readOnly && (
            <span className="inline-flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="h-3 w-3" /> unsaved
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="divide-y">
          {LIFECYCLE_MILESTONES.map((m) => {
            const derivedValue = lifecycle?.[m.id] as LifecycleValue | null | undefined;
            const isManual = m.source === 'manual';
            const currentManual = draft[m.id];
            return (
              <li key={m.id} className="py-2 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {m.label}
                    {m.source === 'derived' && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-info/10 text-info text-[10px] px-1.5 py-0.5"
                        title={m.derived_from}
                      >
                        <Sparkles className="h-2.5 w-2.5" /> auto
                      </span>
                    )}
                  </div>
                  {m.source === 'derived' && (
                    <p className="text-xs text-muted-foreground">{m.derived_from}</p>
                  )}
                </div>
                {isManual ? (
                  <div className="flex gap-1.5 shrink-0">
                    <StatusPill
                      tone="success"
                      active={currentManual === 'yes'}
                      disabled={readOnly}
                      onSelect={() => setManual(m.id, currentManual === 'yes' ? null : 'yes')}
                    >
                      Yes
                    </StatusPill>
                    <StatusPill
                      tone="destructive"
                      active={currentManual === 'no'}
                      disabled={readOnly}
                      onSelect={() => setManual(m.id, currentManual === 'no' ? null : 'no')}
                    >
                      No
                    </StatusPill>
                    <StatusPill
                      tone="neutral"
                      active={currentManual === 'n_a'}
                      disabled={readOnly}
                      onSelect={() => setManual(m.id, currentManual === 'n_a' ? null : 'n_a')}
                    >
                      N/A
                    </StatusPill>
                  </div>
                ) : (
                  <ReadOnlyValueBadge value={derivedValue ?? null} />
                )}
              </li>
            );
          })}
        </ul>
        {!readOnly && (
          <div className="flex justify-end pt-2">
            <Button onClick={onSave} disabled={!dirty || save.isPending} size="sm">
              <Save className="mr-2 h-3 w-3" />
              {save.isPending ? 'Saving…' : 'Save lifecycle'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReadOnlyValueBadge({ value }: { value: LifecycleValue | null }) {
  const { glyph, tone, label } = lifecycleGlyph(value);
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-6 min-w-[28px] px-2 rounded text-xs font-bold',
        tone === 'success' && 'bg-success/15 text-success',
        tone === 'destructive' && 'bg-destructive/10 text-destructive',
        tone === 'muted' && 'bg-muted text-muted-foreground text-[10px]',
        tone === 'empty' && 'text-muted-foreground/40',
      )}
      title={label}
    >
      {glyph}
    </span>
  );
}
