/**
 * 11-row editor for the enterprise lifecycle tracker.
 *
 * After migration 282 all milestones are manual — each shows the
 * Yes / No / N/A pill triplet. Two rows (ESMP, M1) additionally render an
 * "Upload" navigation pill that deep-links into the relevant module's tab
 * so users can jump from Progress straight to where they'd actually finish
 * the work, without losing their place.
 *
 * Saves are debounced/explicit (user clicks "Save lifecycle") rather than on
 * each pill click — keeps the UI snappy and avoids 11 round-trips when the
 * user is updating multiple rows in a row.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { Save, AlertCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  LIFECYCLE_MILESTONES,
  MANUAL_MILESTONE_IDS,
  type EnterpriseLifecycleRow,
  type LifecycleValue,
  type LifecycleMilestoneId,
} from '@/lib/lifecycle';
import { useSaveEnterpriseLifecycle } from '@/lib/enterprises';
import { useRegisterDirty } from '@/lib/use-unsaved-changes-guard';

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

  // Hook into the parent UnsavedChangesProvider (rendered on
  // EnterpriseDetailPage). If this editor is used outside that provider,
  // the hook is a no-op — the page-level guard takes over.
  useRegisterDirty('lifecycle', dirty);

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
      onSuccess: (result) => {
        toast.success(result.online ? 'Lifecycle saved' : 'Saved locally — will sync when online');
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
              11 milestones tracked across both partners — all manually marked Yes/No/N/A.
              ESMP and M1 rows have an <span className="font-medium">Upload</span> shortcut
              that jumps you to that module's tab so you can finish the work, then come
              back and mark the milestone Yes.
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
            const currentManual = draft[m.id];
            return (
              <li key={m.id} className="py-2 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{m.label}</div>
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
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
                  {m.upload_link ? (
                    // Upload pill is a NAV action, not a state. Renders as a
                    // Link styled to match the StatusPill so the row reads
                    // visually like the others.
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                    >
                      <Link to={m.upload_link.href(enterpriseId)}>
                        <Upload className="h-3 w-3 mr-1" />
                        {m.upload_link.label}
                      </Link>
                    </Button>
                  ) : (
                    <StatusPill
                      tone="neutral"
                      active={currentManual === 'n_a'}
                      disabled={readOnly}
                      onSelect={() => setManual(m.id, currentManual === 'n_a' ? null : 'n_a')}
                    >
                      N/A
                    </StatusPill>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {!readOnly && (
          // Sticky on mobile so the user doesn't have to scroll back down
          // past 11 milestones to find Save. Desktop keeps the inline
          // bottom-right placement — sticky there would float weirdly mid-
          // page on a tall viewport. Negative margins cancel CardContent's
          // padding so the sticky bar spans edge-to-edge on phones.
          <div className="sticky bottom-0 -mx-6 -mb-2 px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t z-10 flex justify-end items-center gap-2
                          md:static md:mx-0 md:mb-0 md:p-0 md:pt-2 md:bg-transparent md:backdrop-blur-none md:border-t-0">
            {dirty && (
              <span className="text-xs text-warning md:hidden">Unsaved</span>
            )}
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
