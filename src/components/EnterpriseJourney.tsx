/**
 * EnterpriseJourney — the M1 → M2 → Graduation strip in the enterprise drawer.
 *
 * Reads the enterprise's milestone (lifecycle_stage) + per-stage money
 * (stage_finances), derives each step's status via deriveJourney, and draws the
 * horizontal journey: M1 → M2 → graduation. Scrolls sideways on a phone.
 */
import { Check, Flag, GraduationCap, ChevronRight } from 'lucide-react';
import { deriveJourney, type NodeStatus } from '../lib/journey';
import { LIFECYCLE_META, type LifecycleStage } from '../lib/lifecycle';
import { type StageKey } from '../lib/stages';
import { type Json } from '../lib/stage-finances';

interface Props {
  stage: LifecycleStage;
  stageFinances: Json | null | undefined;
  approvalStage?: StageKey | null;
}

function StatusDot({ status }: { status: NodeStatus }) {
  const base = 'flex h-7 w-7 items-center justify-center rounded-full shrink-0 text-sm font-bold';
  switch (status) {
    case 'done':
      return <span className={`${base} bg-brand text-white`}><Check size={16} /></span>;
    case 'active':
      return <span className={`${base} bg-amber-500 text-white`}>◐</span>;
    case 'flag':
      return <span className={`${base} bg-red-500 text-white`}><Flag size={14} /></span>;
    default:
      return <span className={`${base} border border-slate-200 bg-slate-100 text-slate-400`}>○</span>;
  }
}

const DETAIL_TONE: Record<NodeStatus, string> = {
  done: 'text-slate-500',
  active: 'text-amber-600',
  flag: 'text-red-600',
  pending: 'text-slate-400',
};

export function EnterpriseJourney({ stage, stageFinances, approvalStage }: Props) {
  const journey = deriveJourney(stage, stageFinances, approvalStage);

  return (
    <section>
      <div className="mb-2">
        <h3 className="text-sm font-semibold">Journey</h3>
        <p className="text-xs text-slate-500">M1 → M2 → graduation — each step's status and money, left to right.</p>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch gap-2">
          {journey.stages.map((js, i) => (
            <div key={js.stage} className="flex items-stretch gap-2">
              <div className={`rounded-xl border p-3 ${js.isCurrent ? 'border-brand/40 bg-brand-light/40' : 'border-dashed border-slate-200 bg-slate-50/60'}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{LIFECYCLE_META[js.stage].full}</span>
                  {js.isCurrent && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand-dark">Current</span>}
                </div>
                <div className="flex items-start">
                  {js.nodes.map((n, idx) => (
                    <div key={n.key} className="flex items-start">
                      <div className="flex w-[86px] flex-col items-center gap-1.5 text-center">
                        <StatusDot status={n.status} />
                        <span className="text-xs font-medium leading-tight">{n.label}</span>
                        <span className={`text-[11px] leading-tight tabular-nums ${DETAIL_TONE[n.status]}`}>{n.detail}</span>
                      </div>
                      {idx < js.nodes.length - 1 && <span className="mt-3 h-0.5 w-4 shrink-0 self-start bg-slate-200" />}
                    </div>
                  ))}
                </div>
              </div>
              {i < journey.stages.length - 1 && (
                <span className="flex items-center self-center text-slate-400">
                  <ChevronRight size={20} />
                </span>
              )}
            </div>
          ))}

          {/* graduation endpoint */}
          <span className="flex items-center self-center text-slate-400">
            <ChevronRight size={20} />
          </span>
          <div className="flex flex-col items-center justify-center gap-1.5 self-center px-2">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${journey.graduated ? 'bg-brand text-white' : 'border-2 border-dashed border-slate-300 text-slate-300'}`}>
              <GraduationCap size={20} />
            </span>
            <span className={`text-xs font-semibold ${journey.graduated ? 'text-brand-dark' : 'text-slate-500'}`}>{journey.graduated ? 'Graduated' : 'Graduation'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
