/**
 * LifecycleFlow — a static flow-chart on the Summary: the journey steps as
 * columns (M1: Farmer → Budget → Fund dep. → Report, then M2: the same, then
 * Graduated), with each enterprise shown as a chip under its *current* step.
 *
 * The M1 report column is driven by the approval workflow (this is the M1
 * Approval Tracker): an enterprise whose report has reached 4D/SADP sits at
 * "M1 report", with a colour dot showing its exact approval stage. Enterprises
 * aren't dragged — they move along automatically as their data changes.
 *
 * Filterable by district, service provider and enterprise type.
 */
import { useMemo, useState } from 'react';
import { useData, type Item } from '../lib/data';
import { useNav } from '../App';
import { DISTRICTS, DISTRICT_SHORT, STAGE } from '../lib/stages';
import { deriveJourney, M1_REPORT_REACHED } from '../lib/journey';
import { selectCls } from './ui';

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
  const ls = it.lifecycle_stage;
  if (ls === 'graduated') return 'graduated';
  if (ls === 'm1') {
    // The M1 report step is the approval pipeline; everything there sits at "M1 report".
    if (M1_REPORT_REACHED.has(it.stage)) return 'm1:report';
    const js = deriveJourney('m1', it.stage_finances).stages.find((s) => s.stage === 'm1')!;
    const open = js.nodes.find((n) => n.key !== 'report' && n.status !== 'done');
    return open ? (`m1:${open.key}` as FlowStep) : 'm1:report';
  }
  const js = deriveJourney('m2', it.stage_finances).stages.find((s) => s.stage === 'm2')!;
  const open = js.nodes.find((n) => n.status !== 'done');
  return open ? (`m2:${open.key}` as FlowStep) : 'm2:report';
}

export function LifecycleFlow() {
  const { items } = useData();
  const { openItem } = useNav();
  const [district, setDistrict] = useState('');
  const [sp, setSp] = useState('');
  const [type, setType] = useState('');

  const spOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) {
      const v = it.service_provider?.trim();
      if (!v) continue;
      const k = v.toLowerCase();
      const cur = m.get(k);
      if (!cur || (/[A-Z]/.test(v) && !/[A-Z]/.test(cur))) m.set(k, v);
    }
    return Array.from(m.values()).sort((a, b) => a.localeCompare(b));
  }, [items]);
  const typeOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.enterprise_type).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const byStep = useMemo(() => {
    const filtered = items.filter(
      (it) =>
        (!district || it.district === district) &&
        (!sp || it.service_provider?.toLowerCase() === sp.toLowerCase()) &&
        (!type || it.enterprise_type === type),
    );
    const m = new Map<FlowStep, Item[]>();
    for (const col of COLUMNS) m.set(col.key, []);
    for (const it of filtered) m.get(currentStep(it))!.push(it);
    for (const list of m.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [items, district, sp, type]);

  const active = district || sp || type;

  return (
    <div className="rounded-xl border bg-white p-4 print:hidden">
      <h3 className="text-sm font-semibold">Lifecycle flow</h3>
      <p className="mb-3 text-xs text-slate-500">
        Each enterprise sits under its current step on the M1 → M2 → Graduation journey, and moves along as it progresses. The M1 report column is the SADP approval pipeline. Click a card to open it.
      </p>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
          {['', ...DISTRICTS].map((d) => (
            <button
              key={d || 'all'}
              onClick={() => setDistrict(d)}
              className={`rounded px-2 py-1 ${district === d ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {d ? DISTRICT_SHORT[d] : 'All'}
            </button>
          ))}
        </div>
        <select className={`${selectCls} py-1.5 text-xs`} value={sp} onChange={(e) => setSp(e.target.value)} title="Filter by service provider">
          <option value="">All service providers</option>
          {spOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className={`${selectCls} py-1.5 text-xs`} value={type} onChange={(e) => setType(e.target.value)} title="Filter by enterprise type">
          <option value="">All types</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {active && (
          <button onClick={() => { setDistrict(''); setSp(''); setType(''); }} className="text-xs text-slate-500 hover:text-brand hover:underline">
            Clear
          </button>
        )}
      </div>

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
                          className="flex w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-xs transition hover:border-brand hover:bg-brand-light/50"
                          title={`${it.name} · ${it.district}${it.lifecycle_stage === 'm1' ? ` · M1: ${STAGE[it.stage].label}` : ''}`}
                        >
                          {it.lifecycle_stage === 'm1' && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STAGE[it.stage].dot}`} />}
                          <span className="min-w-0 flex-1 truncate font-medium">{it.name}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">{DISTRICT_SHORT[it.district] ?? ''}</span>
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
