import { useMemo, useState } from 'react';
import { Printer, Flag, ArrowRight } from 'lucide-react';
import { useData, stagesAt, fmtDate, fmtDateTime, errMsg } from '../lib/data';
import { DISTRICTS, DISTRICT_SHORT, STAGE, STAGES, type StageKey } from '../lib/stages';
import { supabase } from '../lib/supabase';
import { useNav, type ListFilter } from '../App';
import { Button, Modal, toast } from './ui';

type Row =
  | { kind: 'stage'; key: StageKey; label: string; indent: number; strong?: boolean }
  | { kind: 'group'; filter: 'with_4d' | 'pending'; keys: StageKey[]; label: string; indent: number }
  | { kind: 'header'; label: string }
  | { kind: 'unplaced'; label: string }
  | { kind: 'total'; label: string };

const PENDING: StageKey[] = ['sadp_queries', 'under_review', 'with_isp', 'blocked_infra', 'withdrawn'];

const ROWS: Row[] = [
  { kind: 'stage', key: 'approved', label: '1. Approved', indent: 0, strong: true },
  { kind: 'stage', key: 'at_sadp', label: '2. At SADP – pending approval', indent: 0, strong: true },
  { kind: 'header', label: '3. Pending' },
  { kind: 'group', filter: 'with_4d', keys: ['sadp_queries', 'under_review'], label: '(a) With 4D', indent: 1 },
  { kind: 'stage', key: 'sadp_queries', label: '(i) Resolving SADP queries', indent: 2 },
  { kind: 'stage', key: 'under_review', label: '(ii) Under 4D review — submitted by ISP/farmer', indent: 2 },
  { kind: 'stage', key: 'with_isp', label: '(b) With ISPs', indent: 1 },
  { kind: 'stage', key: 'blocked_infra', label: '(c) Borehole / shadenet', indent: 1 },
  { kind: 'stage', key: 'withdrawn', label: '(d) Withdrawal', indent: 1 },
  { kind: 'group', filter: 'pending', keys: PENDING, label: 'Total pending (3)', indent: 0 },
  { kind: 'unplaced', label: 'Not yet placed on tracker' },
  { kind: 'total', label: 'Total' },
];

export function Summary() {
  const { items, unplaced, catalog, history, baselineAt, isAdmin, reload, userName, itemById } = useData();
  const { go, openItem } = useNav();
  const [confirmBaseline, setConfirmBaseline] = useState(false);

  const baseStage = useMemo(() => (baselineAt ? stagesAt(history, baselineAt) : null), [history, baselineAt]);

  const districtTotal = (d: string | null) =>
    d === null ? catalog.length + items.filter((i) => !i.enterprise_id).length : catalog.filter((c) => c.district === d).length + items.filter((i) => !i.enterprise_id && i.district === d).length;

  const count = (keys: StageKey[], d: string | null) => items.filter((i) => keys.includes(i.stage) && (d === null || i.district === d)).length;
  const baseCount = (keys: StageKey[], d: string | null) =>
    baseStage ? items.filter((i) => (d === null || i.district === d) && keys.includes(baseStage.get(i.id) as StageKey)).length : 0;
  const unplacedCount = (d: string | null) => unplaced.filter((c) => d === null || c.district === d).length;
  const baseUnplaced = (d: string | null) => districtTotal(d) - (baseStage ? items.filter((i) => (d === null || i.district === d) && baseStage.has(i.id)).length : 0);

  const cols: (string | null)[] = [...DISTRICTS, null];
  const total = districtTotal(null);
  const approved = count(['approved'], null);

  const recent = useMemo(() => [...history].reverse().slice(0, 12), [history]);

  async function setBaseline() {
    const { error } = await supabase.from('mgp_settings').upsert({ key: 'baseline_at', value: new Date().toISOString(), updated_at: new Date().toISOString() });
    if (error) toast.err(errMsg(error));
    else {
      toast.ok('Baseline set — changes will be counted from now');
      reload();
    }
    setConfirmBaseline(false);
  }

  const cell = (filter: ListFilter, n: number, base: number | null, cls = '') => (
    <button onClick={() => go('list', filter)} className={`group inline-flex items-baseline gap-1.5 rounded px-1.5 hover:bg-brand-light ${cls}`}>
      <span className="tabular-nums">{n}</span>
      {base !== null && n - base !== 0 && (
        <span className={`text-[11px] font-semibold tabular-nums ${n - base > 0 ? 'text-brand' : 'text-red-500'}`}>
          {n - base > 0 ? '+' : ''}
          {n - base}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">M1 report status by district</h2>
          <p className="text-sm text-slate-500">
            As at {fmtDateTime(new Date().toISOString())}
            {baselineAt && <> · coloured numbers show change since baseline <b>{fmtDate(baselineAt)}</b></>}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setConfirmBaseline(true)}>
              <Flag size={15} /> {baselineAt ? 'Reset baseline' : 'Set baseline'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Approved" value={approved} sub={`${total ? Math.round((approved / total) * 100) : 0}% of ${total}`} tone="emerald" />
        <Kpi label="At SADP" value={count(['at_sadp'], null)} sub="awaiting approval" tone="sky" />
        <Kpi label="With 4D" value={count(['sadp_queries', 'under_review'], null)} sub={`${count(['sadp_queries'], null)} resolving queries`} tone="amber" />
        <Kpi label="With ISPs" value={count(['with_isp'], null)} sub={`${unplacedCount(null)} not yet placed`} tone="orange" />
      </div>

      {/* Stacked progress bar */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
          {STAGES.map((s) => {
            const n = count([s.key], null);
            return n ? <div key={s.key} className={s.dot} style={{ width: `${(n / Math.max(total, 1)) * 100}%` }} title={`${s.label}: ${n}`} /> : null;
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {STAGES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {s.short} <b className="tabular-nums">{count([s.key], null)}</b>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-200" />
            Not placed <b>{unplacedCount(null)}</b>
          </span>
        </div>
      </div>

      {/* The whiteboard table */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left">
              <th className="px-2 py-3 font-semibold sm:px-4">Item</th>
              {cols.map((d) => (
                <th key={d ?? 'total'} className={`px-1 py-3 text-right font-semibold sm:px-3 ${d === null ? 'bg-slate-50' : ''}`}>
                  {d === null ? 'Total' : DISTRICT_SHORT[d]} <span className="block font-normal text-slate-500 sm:inline">({districtTotal(d)})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, idx) => {
              if (r.kind === 'header')
                return (
                  <tr key={idx} className="border-t">
                    <td className="px-2 pb-1 pt-3 font-semibold sm:px-4" colSpan={cols.length + 1}>
                      {r.label}
                    </td>
                  </tr>
                );
              const isGroup = r.kind === 'group';
              const isTotal = r.kind === 'total';
              const rowCls = isTotal ? 'border-t-2 border-slate-800 font-bold' : isGroup ? 'bg-slate-50 font-semibold' : r.kind === 'unplaced' ? 'border-t text-slate-500 italic' : 'border-t';
              const indent = 'indent' in r ? r.indent : 0;
              return (
                <tr key={idx} className={rowCls}>
                  <td className="py-2 pr-1" style={{ paddingLeft: 8 + indent * 14 }}>
                    <span className="inline-flex items-center gap-2">
                      {r.kind === 'stage' && <span className={`h-2 w-2 rounded-full ${STAGE[r.key].dot}`} />}
                      <span className={r.kind === 'stage' && r.strong ? 'font-semibold' : ''}>{r.label}</span>
                    </span>
                  </td>
                  {cols.map((d) => {
                    const dist = d ?? undefined;
                    let n = 0;
                    let b: number | null = null;
                    let filter: ListFilter = { district: dist };
                    if (r.kind === 'stage') {
                      n = count([r.key], d);
                      b = baseStage ? baseCount([r.key], d) : null;
                      filter = { stage: r.key, district: dist };
                    } else if (r.kind === 'group') {
                      n = count(r.keys, d);
                      b = baseStage ? baseCount(r.keys, d) : null;
                      filter = { stage: r.filter, district: dist };
                    } else if (r.kind === 'unplaced') {
                      n = unplacedCount(d);
                      b = baseStage ? baseUnplaced(d) : null;
                      return (
                        <td key={d ?? 'total'} className={`px-1 py-2 text-right sm:px-3 ${d === null ? 'bg-slate-50' : ''}`}>
                          <button onClick={() => go('list', { stage: 'unplaced', district: dist })} className="rounded px-1.5 tabular-nums hover:bg-brand-light">{n}</button>
                          {b !== null && n - b !== 0 && <span className={`ml-1 text-[11px] font-semibold ${n - b > 0 ? 'text-red-500' : 'text-brand'}`}>{n - b > 0 ? '+' : ''}{n - b}</span>}
                        </td>
                      );
                    } else if (r.kind === 'total') {
                      n = districtTotal(d);
                    }
                    return (
                      <td key={d ?? 'total'} className={`px-1 py-2 text-right sm:px-3 ${d === null ? 'bg-slate-50 font-semibold' : ''}`}>
                        {r.kind === 'total' ? <span className="px-1.5 tabular-nums">{n}</span> : cell(filter, n, b)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="-mt-3 text-xs text-slate-500 print:hidden">Click any number to see the enterprises behind it.</p>

      {/* Recent movement */}
      <div className="rounded-xl border bg-white print:hidden">
        <div className="border-b px-4 py-3 text-sm font-semibold">Latest movements</div>
        {recent.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500">No enterprises placed yet. Open Enterprises or Board — every enterprise is listed with its district, ready to be placed.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((h) => {
              const it = itemById[h.tracking_id];
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-sm">
                  <button className="font-medium text-brand hover:underline" onClick={() => it && openItem(it.id)}>
                    {it?.name ?? '—'}
                  </button>
                  <span className="text-xs text-slate-400">{it?.district}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                    {h.from_stage ? STAGE[h.from_stage].short : 'Added'} <ArrowRight size={12} /> <b>{STAGE[h.to_stage].short}</b>
                  </span>
                  <span className="ml-auto text-xs text-slate-400">
                    {userName(h.changed_by)} · {fmtDateTime(h.changed_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal open={confirmBaseline} onClose={() => setConfirmBaseline(false)} title="Set baseline to now?">
        <p className="mb-4 text-sm text-slate-600">
          The summary will show how each number has changed since this moment (e.g. “+5” at SADP). Use this at the start of a push, such as today’s two-week sprint.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmBaseline(false)}>Cancel</Button>
          <Button onClick={setBaseline}>Set baseline</Button>
        </div>
      </Modal>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: number; sub: string; tone: 'emerald' | 'sky' | 'amber' | 'orange' }) {
  const bar = { emerald: 'bg-brand-logo', sky: 'bg-fdblue', amber: 'bg-amber-500', orange: 'bg-fdbrown-light' }[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border bg-white p-4">
      <div className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}
