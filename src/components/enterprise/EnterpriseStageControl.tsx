/**
 * Enterprise macro-stage: a compact badge (StageBadge) used across the list
 * and detail header, plus an editable segmented control (EnterpriseStageControl)
 * on the enterprise Progress tab.
 *
 * Saves go through the offline queue (useSaveEnterprisePatch -> saveOrEnqueue),
 * so changing an enterprise's stage works offline on a field tablet and syncs
 * when back online — same path as the lifecycle milestones.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LIFECYCLE_STAGES, STAGE_META, stageOrDefault, type StageTone } from '@/lib/stage';
import type { LifecycleStage } from '@/types/database';
import { useSaveEnterprisePatch } from '@/lib/enterprises';

const TONE_BADGE: Record<StageTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
};

/** Small, read-only stage pill for lists and headers. */
export function StageBadge({
  stage,
  className,
}: {
  stage: LifecycleStage | null | undefined;
  className?: string;
}) {
  const s = stageOrDefault(stage);
  const meta = STAGE_META[s];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        TONE_BADGE[meta.tone],
        className,
      )}
      title={meta.description}
    >
      {s === 'graduated' && <GraduationCap className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}

const TONE_ACTIVE: Record<StageTone, string> = {
  neutral: 'bg-muted text-foreground border-foreground/20',
  primary: 'bg-primary text-primary-foreground border-primary',
  success: 'bg-success text-success-foreground border-success',
};

interface Props {
  enterpriseId: string;
  stage: LifecycleStage | null | undefined;
  readOnly?: boolean;
}

/** Editable M1 / M2 / Graduated segmented control. */
export function EnterpriseStageControl({ enterpriseId, stage, readOnly = false }: Props) {
  const current = stageOrDefault(stage);
  const save = useSaveEnterprisePatch(enterpriseId);

  function setStage(next: LifecycleStage) {
    if (next === current || save.isPending) return;
    save.mutate(
      {
        description: `Set lifecycle stage to ${STAGE_META[next].label}`,
        patch: { lifecycle_stage: next },
      },
      {
        onSuccess: (result) =>
          toast.success(
            result.online
              ? `Stage set to ${STAGE_META[next].full}`
              : 'Saved locally — will sync when online',
          ),
        onError: (e: Error) =>
          toast.error('Could not update stage', { description: e.message }),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lifecycle stage</CardTitle>
        <CardDescription>
          Where this enterprise sits on the M1 → M2 → Graduation journey.
          {' '}
          {STAGE_META[current].description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="group"
          aria-label="Lifecycle stage"
          className="inline-flex rounded-lg border bg-background p-1 gap-1"
        >
          {LIFECYCLE_STAGES.map((id) => {
            const meta = STAGE_META[id];
            const active = id === current;
            return (
              <button
                key={id}
                type="button"
                disabled={readOnly || save.isPending}
                aria-pressed={active}
                onClick={() => setStage(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  active
                    ? TONE_ACTIVE[meta.tone]
                    : 'border-transparent text-muted-foreground hover:bg-muted',
                )}
              >
                {id === 'graduated' && <GraduationCap className="h-3.5 w-3.5" />}
                {meta.label}
              </button>
            );
          })}
        </div>
        {save.isPending && (
          <p className="mt-2 text-xs text-muted-foreground">Saving…</p>
        )}
      </CardContent>
    </Card>
  );
}
