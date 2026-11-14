/**
 * EnterpriseJourney — the M1 → M2 → Graduation strip on the enterprise page.
 *
 * Reads the enterprise's macro stage (lifecycle_stage) + per-stage money
 * (stage_finances), derives each step's status via deriveJourney, and draws the
 * horizontal journey: left (M1) to right (M2) to graduation. Scrolls sideways
 * on a phone; the page never scrolls horizontally.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Flag, GraduationCap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { deriveJourney, type NodeStatus } from '@/lib/journey';
import { STAGE_META } from '@/lib/stage';
import type { Json, LifecycleStage } from '@/types/database';

interface Props {
  stage: LifecycleStage | null | undefined;
  stageFinances: Json | null | undefined;
}

function StatusDot({ status }: { status: NodeStatus }) {
  const base = 'flex h-7 w-7 items-center justify-center rounded-full shrink-0 text-sm font-bold';
  switch (status) {
    case 'done':
      return <span className={cn(base, 'bg-success text-success-foreground')}><Check className="h-4 w-4" /></span>;
    case 'active':
      return <span className={cn(base, 'bg-warning text-white')}>◐</span>;
    case 'flag':
      return <span className={cn(base, 'bg-destructive text-white')}><Flag className="h-3.5 w-3.5" /></span>;
    default:
      return <span className={cn(base, 'bg-muted text-muted-foreground border')}>○</span>;
  }
}

const DETAIL_TONE: Record<NodeStatus, string> = {
  done: 'text-muted-foreground',
  active: 'text-warning',
  flag: 'text-destructive',
  pending: 'text-muted-foreground/70',
};

export function EnterpriseJourney({ stage, stageFinances }: Props) {
  const journey = deriveJourney(stage ?? 'm1', stageFinances);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Journey</CardTitle>
        <CardDescription>
          M1 to M2 to graduation — each step's status and money, left to right.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div className="flex items-stretch gap-2 min-w-max">
            {journey.stages.map((js, i) => (
              <div key={js.stage} className="flex items-stretch gap-2">
                <div
                  className={cn(
                    'rounded-xl border p-3',
                    js.isCurrent ? 'border-primary/40 bg-tint-success/20' : 'border-dashed bg-muted/20',
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {STAGE_META[js.stage].full}
                    </span>
                    {js.isCurrent && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-start">
                    {js.nodes.map((n, idx) => (
                      <div key={n.key} className="flex items-start">
                        <div className="flex w-[86px] flex-col items-center gap-1.5 text-center">
                          <StatusDot status={n.status} />
                          <span className="text-xs font-medium leading-tight">{n.label}</span>
                          <span className={cn('text-[11px] leading-tight tabular-nums', DETAIL_TONE[n.status])}>
                            {n.detail}
                          </span>
                        </div>
                        {idx < js.nodes.length - 1 && (
                          <span className="mt-3 h-0.5 w-4 shrink-0 self-start bg-border" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {/* arrow to next stage */}
                {i < journey.stages.length - 1 && (
                  <span className="flex items-center self-center text-muted-foreground">
                    <ChevronRight className="h-5 w-5" />
                  </span>
                )}
              </div>
            ))}

            {/* graduation endpoint */}
            <span className="flex items-center self-center text-muted-foreground">
              <ChevronRight className="h-5 w-5" />
            </span>
            <div className="flex flex-col items-center justify-center gap-1.5 self-center px-2">
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full',
                  journey.graduated
                    ? 'bg-success text-success-foreground'
                    : 'border-2 border-dashed border-muted-foreground/40 text-muted-foreground/50',
                )}
              >
                <GraduationCap className="h-5 w-5" />
              </span>
              <span
                className={cn(
                  'text-xs font-semibold',
                  journey.graduated ? 'text-success' : 'text-muted-foreground',
                )}
              >
                {journey.graduated ? 'Graduated' : 'Graduation'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
