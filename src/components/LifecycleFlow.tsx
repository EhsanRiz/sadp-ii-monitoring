/**
 * LifecycleFlow — a static flow-chart on the Summary: the journey steps as
 * columns (M1: Farmer → Budget → Fund dep. → Report, then M2: the same, then
 * Graduated), with each enterprise shown as a chip under its *current* step.
 *
 * Enterprises aren't dragged — they move along automatically as their milestone
 * and stage_finances change. Derived from deriveJourney (the first step that
 * isn't "done" in the current milestone is where the enterprise sits).
 */
import { useMemo } from 'react';
import { useData, type Item } from '../lib/data';
import { useNav } from '../App';
import { DISTRICT_SHORT } from '../lib/stages';
import { deriveJourney } from '../lib/journey';

type FlowStep =
  | 'm1:farmer' | 'm1:ba' | 'm1:fd' | 'm1:report'
  | 'm2:farmer' | 'm2:ba' | 'm2:fd' | 'm2:report'
  | 'graduated';

const COLUMNS: { key: FlowStep; band: 'm1' | 'm2' | 'grad'; label: string }[] = [
  { key: 'm1:farmer', band: 'm1', label: 'Farmer contr.' },
  { key: 'm1:ba', band: 'm1', label: 'Budget alloc.' },
  { key: 'm1:fd', band: 'm1', label: 'Fund depletion' },
  { key: 'm1:report', band: 'm1', label: 'M1 report' },
  { key: 'm2:farmer', band: 'm2', label: 'Farmer contr.' },
  { key: 'm2:ba', band: 'm2', label: 'Budget alloc.' },
  { key: 'm2:fd', band: 'm2', label: 'Fund depletion' },
  { key: 'm2:report', band: 'm2', label: 'M2 report' },
  { key: 'graduated', band: 'grad', label: 'Graduated' },
];

const BAND: Record<'m1' | 'm2' | 'grad', { tag: string; head: string; bar: string }> = {
  m1: { tag: 'M1', head: 'bg-slate-100 text-slate-600', bar: 'bg-slate-300' },
  m2: { tag: 'M2', head: 'bg-fdblue-light text-sky-800', bar: 'bg-fdblue' },
  grad: { tag: '', head: 'bg-brand-light text-brand-dark', bar: 'bg-brand-logo' },
};

function currentStep(it: Item): FlowStep {
  if (it.lifecycle_stage === 'graduated') return 'graduated';
  const journey = deriveJourney(it.lifecycle_stage, it.stage_finances);
  const js = journey.stages.find((s) => s.stage === it.lifecycle_stage);
  const open = js?.nodes.find((n) => n.status !== 'done');
  return `${it.lifecycle_stage}:${open ? open.key : 'report'}` as FlowStep;
}

export function LifecycleFlow() {
  const { items } = useData();
  const { openItem } = useNav();

  const byStep = useMemo(() => {
    const m = new Map<FlowStep, Item[]>();
    for (const col of COLUMNS) m.set(col.key, []);
    for (const it of items) m.get(currentStep(it))!.push(it);
    for (const list of m.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [items]);

  return (
    <div className="rounded-xl border bg-white p-4 print:hidden">
      <h3 className="text-sm font-semibold">Lifecycle flow</h3>
      <p className="mb-3 text-xs text-slate-500">
        Each enterprise sits under its current step on the M1 → M2 → Graduation journey, and moves along as its finances are filled in. Click a card to open it.
      </p>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-start gap-2">
          {COLUMNS.map((col, i) => {
            const list = byStep.get(col.key)!;
            const band = BAND[col.band];
            return (
              <div key={col.key} className="flex items-start gap-2">
                <div className="w-44 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                  <div className={`h-1 ${band.bar}`} />
                  <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-semibold ${band.head}`}>
                    <span className="truncate">
                      {band.tag && <span className="mr-1 rounded bg-white/60 px-1 text-[10px]">{band.tag}</span>}
                      {col.label}
                    </span>
                    <span className="shrink-0 rounded-full bg-white/70 px-1.5 text-[11px] tabular-nums">{list.length}</span>
                  </div>
                  <div className="max-h-80 space-y-1 overflow-y-auto bg-slate-50/50 p-1.5">
                    {list.length === 0 ? (
                      <div className="px-1 py-2 text-center text-[11px] text-slate-300">—</div>
                    ) : (
                      list.map((it) => (
                        <button
                          key={it.id}
                          onClick={() => openItem(it.id)}
                          className="block w-full truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-xs transition hover:border-brand hover:bg-brand-light/50"
                          title={`${it.name} · ${it.district}`}
                        >
                          <span className="font-medium">{it.name}</span>
                          <span className="ml-1 text-[10px] text-slate-400">{DISTRICT_SHORT[it.district] ?? ''}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                {i < COLUMNS.length - 1 && <span className="mt-8 select-none text-slate-300">›</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
