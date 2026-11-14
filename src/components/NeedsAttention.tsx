/**
 * "Needs attention" — the proactive queue on the Summary. Lists every
 * non-graduated enterprise with a risk flag, red (high) first, with its flag
 * chips and a click-through to the drawer. Filterable by district, with an
 * optional "high priority only" toggle.
 */
import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useData } from '../lib/data';
import { useNav } from '../App';
import { DISTRICTS, DISTRICT_SHORT } from '../lib/stages';
import { deriveRisk, FLAG_CHIP, type RiskFlag } from '../lib/risk';

export function RiskFlagChips({ flags, max }: { flags: RiskFlag[]; max?: number }) {
  const shown = max ? flags.slice(0, max) : flags;
  const extra = flags.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((f) => (
        <span key={f.id} className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${FLAG_CHIP[f.severity]}`}>
          {f.label}
        </span>
      ))}
      {extra > 0 && <span className="text-[10px] text-slate-400">+{extra}</span>}
    </div>
  );
}

export function NeedsAttention() {
  const { items } = useData();
  const { openItem } = useNav();
  const [district, setDistrict] = useState('');
  const [highOnly, setHighOnly] = useState(false);

  const { rows, redN, amberN } = useMemo(() => {
    const all = items
      .map((it) => ({ it, risk: deriveRisk(it) }))
      .filter((r) => r.risk.level === 'red' || r.risk.level === 'amber');
    const redN = all.filter((r) => r.risk.level === 'red').length;
    const amberN = all.length - redN;
    const rows = all
      .filter((r) => (!district || r.it.district === district) && (!highOnly || r.risk.level === 'red'))
      .sort((a, b) => {
        if (a.risk.level !== b.risk.level) return a.risk.level === 'red' ? -1 : 1;
        if (a.risk.highCount !== b.risk.highCount) return b.risk.highCount - a.risk.highCount;
        if (a.risk.flags.length !== b.risk.flags.length) return b.risk.flags.length - a.risk.flags.length;
        return a.it.name.localeCompare(b.it.name);
      });
    return { rows, redN, amberN };
  }, [items, district, highOnly]);

  return (
    <div className="rounded-xl border bg-white print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <AlertTriangle size={15} className="text-amber-500" /> Needs attention
        </h3>
        <span className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-red-600"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {redN} high</span>
          <span className="inline-flex items-center gap-1 text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {amberN} watch</span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
            {['', ...DISTRICTS].map((d) => (
              <button key={d || 'all'} onClick={() => setDistrict(d)} className={`rounded px-2 py-0.5 ${district === d ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {d ? DISTRICT_SHORT[d] : 'All'}
              </button>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" className="h-3.5 w-3.5 accent-[#008C44]" checked={highOnly} onChange={(e) => setHighOnly(e.target.checked)} />
            High only
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          {redN + amberN === 0 ? 'Nothing needs attention — every enterprise is on track. 🎉' : 'None in this view.'}
        </p>
      ) : (
        <ul className="max-h-96 divide-y overflow-y-auto">
          {rows.map(({ it, risk }) => (
            <li key={it.id}>
              <button onClick={() => openItem(it.id)} className="hover-row flex w-full items-start gap-2.5 px-4 py-2.5 text-left">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${risk.level === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-medium">{it.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{it.district}</span>
                  </div>
                  <div className="mt-1">
                    <RiskFlagChips flags={risk.flags} max={4} />
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
