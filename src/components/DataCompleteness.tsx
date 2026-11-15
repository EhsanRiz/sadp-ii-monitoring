/**
 * "Data completeness" — the Summary report that shows what enterprise data is
 * missing and who's missing it, so staff fill the gaps that every other card
 * depends on. Click a field to see the enterprises missing it; click an
 * enterprise to open and fill it.
 */
import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useData, type Item } from '../lib/data';
import { useNav } from '../App';
import { DISTRICTS, DISTRICT_SHORT } from '../lib/stages';
import { deriveCompleteness, COMPLETENESS_FIELDS, GROUP_META, type Completeness } from '../lib/completeness';
import { ExpandableList } from './ExpandableList';

export function DataCompleteness() {
  const { items } = useData();
  const { openItem } = useNav();
  const [district, setDistrict] = useState('');
  const [field, setField] = useState(''); // field id filter, '' = all

  const { overallPct, completeN, gapN, byField, rows } = useMemo(() => {
    const scored = items.map((it) => ({ it, c: deriveCompleteness(it) }));
    const present = scored.reduce((a, s) => a + s.c.present, 0);
    const total = scored.reduce((a, s) => a + s.c.total, 0);
    const overallPct = total ? Math.round((present / total) * 100) : 100;
    const completeN = scored.filter((s) => s.c.complete).length;
    const gapN = scored.length - completeN;

    // Missing count per field (respecting the district filter so the report matches the queue).
    const inDistrict = scored.filter((s) => !district || s.it.district === district);
    const byField = COMPLETENESS_FIELDS.map((f) => ({
      field: f,
      count: inDistrict.filter((s) => s.c.missing.some((m) => m.id === f.id)).length,
    })).filter((x) => x.count > 0);

    const rows = inDistrict
      .filter((s) => !s.c.complete)
      .filter((s) => !field || s.c.missing.some((m) => m.id === field))
      .sort((a, b) => a.c.pct - b.c.pct || b.c.missing.length - a.c.missing.length || a.it.name.localeCompare(b.it.name));

    return { overallPct, completeN, gapN, byField, rows };
  }, [items, district, field]);

  const activeField = COMPLETENESS_FIELDS.find((f) => f.id === field);

  return (
    <div className="rounded-xl border bg-white print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <ClipboardList size={15} className="text-brand" /> Data completeness
        </h3>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span><b className="tabular-nums text-slate-700">{overallPct}%</b> captured</span>
          <span><b className="tabular-nums text-brand-dark">{completeN}</b> complete</span>
          <span><b className="tabular-nums text-amber-700">{gapN}</b> with gaps</span>
        </span>
        <div className="ml-auto flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
          {['', ...DISTRICTS].map((d) => (
            <button key={d || 'all'} onClick={() => setDistrict(d)} className={`rounded px-2 py-0.5 ${district === d ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {d ? DISTRICT_SHORT[d] : 'All'}
            </button>
          ))}
        </div>
      </div>

      {gapN === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">All enterprise data captured{district ? ' in this district' : ''}. 🎉</p>
      ) : (
        <>
          {/* Missing by field */}
          <div className="border-b p-4">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Missing by field — click to filter</div>
            <div className="space-y-1.5">
              {byField.map(({ field: f, count }) => {
                const active = field === f.id;
                const pct = Math.round((count / Math.max(1, gapN)) * 100);
                return (
                  <button
                    key={f.id}
                    onClick={() => setField(active ? '' : f.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-1 text-left text-xs transition ${active ? 'bg-brand-light ring-1 ring-brand/30' : 'hover:bg-slate-50'}`}
                  >
                    <span className="flex w-36 shrink-0 items-center gap-1.5">
                      <span className={`rounded border px-1 py-px text-[9px] font-medium uppercase ${GROUP_META[f.group].chip}`}>{GROUP_META[f.group].label}</span>
                      <span className="truncate font-medium text-slate-700">{f.label}</span>
                    </span>
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-slate-600">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gap queue */}
          <div className="flex items-center justify-between gap-2 px-4 pt-3 text-xs">
            <span className="text-slate-500">{activeField ? <>Missing <b className="text-slate-700">{activeField.label}</b></> : 'Least complete first'} · {rows.length}</span>
            {activeField && <button onClick={() => setField('')} className="text-slate-500 hover:text-brand hover:underline">Clear filter</button>}
          </div>
          <ExpandableList
            items={rows.map(({ it, c }) => (
              <Row key={it.id} it={it} c={c} onOpen={() => openItem(it.id)} />
            ))}
          />
        </>
      )}
    </div>
  );
}

function Row({ it, c, onOpen }: { it: Item; c: Completeness; onOpen: () => void }) {
  const shown = c.missing.slice(0, 4);
  const extra = c.missing.length - shown.length;
  return (
    <li>
      <button onClick={onOpen} className="hover-row flex w-full items-center gap-3 px-4 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">{it.name}</span>
            <span className="shrink-0 text-xs text-slate-400">{it.district}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-slate-400">missing</span>
            {shown.map((m) => (
              <span key={m.id} className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${GROUP_META[m.group].chip}`}>{m.label}</span>
            ))}
            {extra > 0 && <span className="text-[10px] text-slate-400">+{extra}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100" title={`${c.pct}% captured`}>
            <div className="h-full bg-brand-logo" style={{ width: `${c.pct}%` }} />
          </div>
          <span className="w-8 text-right text-[11px] font-semibold tabular-nums text-slate-500">{c.pct}%</span>
        </div>
      </button>
    </li>
  );
}
