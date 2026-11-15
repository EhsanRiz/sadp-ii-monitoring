/**
 * "Graduation readiness" — the Summary card that ranks enterprises by how close
 * they are to graduating, with what's left for each. The actionable view: who
 * to push over the line.
 */
import { useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useData, type Item } from '../lib/data';
import { useNav } from '../App';
import { DISTRICTS, DISTRICT_SHORT } from '../lib/stages';
import { deriveReadiness, TIER_META, type Readiness, type MissingStep } from '../lib/readiness';

export function ReadinessBar({ pct, tier }: { pct: number; tier: Readiness['tier'] }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full ${TIER_META[tier].bar} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function MissingChips({ missing, max = 3 }: { missing: MissingStep[]; max?: number }) {
  if (missing.length === 0) return <span className="text-[11px] text-brand-dark">All steps complete</span>;
  const shown = missing.slice(0, max);
  const extra = missing.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] text-slate-400">still need</span>
      {shown.map((m, i) => (
        <span key={i} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
          {m.stage} {m.label}
        </span>
      ))}
      {extra > 0 && <span className="text-[10px] text-slate-400">+{extra}</span>}
    </div>
  );
}

export function GraduationReadiness() {
  const { items } = useData();
  const { openItem } = useNav();
  const [district, setDistrict] = useState('');
  const [closeOnly, setCloseOnly] = useState(false);

  const { rows, graduatedN, readyN, nearlyN, avg } = useMemo(() => {
    const scored = items.map((it) => ({ it, r: deriveReadiness(it) }));
    const graduatedN = scored.filter((s) => s.r.tier === 'graduated').length;
    const nonGrad = scored.filter((s) => s.r.tier !== 'graduated');
    const readyN = nonGrad.filter((s) => s.r.tier === 'ready').length;
    const nearlyN = nonGrad.filter((s) => s.r.tier === 'nearly').length;
    const avg = nonGrad.length ? Math.round(nonGrad.reduce((a, s) => a + s.r.pct, 0) / nonGrad.length) : 0;
    const rows = nonGrad
      .filter((s) => (!district || s.it.district === district) && (!closeOnly || s.r.tier === 'ready' || s.r.tier === 'nearly'))
      .sort((a, b) => b.r.pct - a.r.pct || a.it.name.localeCompare(b.it.name));
    return { rows, graduatedN, readyN, nearlyN, avg };
  }, [items, district, closeOnly]);

  return (
    <div className="rounded-xl border bg-white print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <GraduationCap size={15} className="text-brand" /> Graduation readiness
        </h3>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span><b className="text-brand-dark tabular-nums">{readyN}</b> ready</span>
          <span><b className="tabular-nums text-lime-700">{nearlyN}</b> nearly</span>
          <span><b className="tabular-nums">{avg}%</b> avg</span>
          <span><b className="tabular-nums">{graduatedN}</b> graduated</span>
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
            <input type="checkbox" className="h-3.5 w-3.5 accent-[#008C44]" checked={closeOnly} onChange={(e) => setCloseOnly(e.target.checked)} />
            Close only
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">{closeOnly ? 'None close to graduation in this view yet.' : 'No enterprises to show.'}</p>
      ) : (
        <ul className="max-h-96 divide-y overflow-y-auto">
          {rows.map(({ it, r }) => (
            <Row key={it.id} it={it} r={r} onOpen={() => openItem(it.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ it, r, onOpen }: { it: Item; r: Readiness; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="hover-row flex w-full items-center gap-3 px-4 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">{it.name}</span>
            <span className="shrink-0 text-xs text-slate-400">{it.district}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="min-w-0 flex-1"><ReadinessBar pct={r.pct} tier={r.tier} /></div>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-500">{r.pct}%</span>
          </div>
          <div className="mt-1"><MissingChips missing={r.missing} max={2} /></div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_META[r.tier].chip}`}>{TIER_META[r.tier].label}</span>
      </button>
    </li>
  );
}
