/**
 * "Report SLA & bottlenecks" — the Summary card that lists reports still waiting
 * on SADP approval, aged against the approval SLA, so staff chase the oldest
 * first. The forward clock to the "Report approval time" card's backward one.
 */
import { useMemo, useState } from 'react';
import { Timer } from 'lucide-react';
import { useData, type Item } from '../lib/data';
import { useNav } from '../App';
import { DISTRICTS, DISTRICT_SHORT } from '../lib/stages';
import { deriveReportSla, SLA_META, SLA_TARGET_DAYS, type ReportSla as Sla } from '../lib/sla';
import { ExpandableList } from './ExpandableList';

const LEVEL_ORDER = { breach: 0, warn: 1, ok: 2 } as const;

function sourceLabel(s: Sla): string {
  if (s.source === 'report') return `${s.stage === 'm2' ? 'M2' : 'M1'} report`;
  return 'At SADP';
}

/** Compact SLA badge — reused in the Summary queue and the enterprise drawer. */
export function SlaBadge({ sla }: { sla: Sla }) {
  if (!sla.waiting || sla.days == null) return null;
  const meta = SLA_META[sla.level];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`} title={`SLA target ${SLA_TARGET_DAYS} days`}>
      <Timer size={10} /> {sla.days}d · {sourceLabel(sla)}
    </span>
  );
}

export function ReportSla() {
  const { items } = useData();
  const { openItem } = useNav();
  const [district, setDistrict] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { rows, breachN, warnN, avg } = useMemo(() => {
    const scored = items
      .map((it) => ({ it, s: deriveReportSla(it) }))
      .filter((x) => x.s.waiting);
    const breachN = scored.filter((x) => x.s.level === 'breach').length;
    const warnN = scored.filter((x) => x.s.level === 'warn').length;
    const avg = scored.length ? Math.round(scored.reduce((a, x) => a + (x.s.days ?? 0), 0) / scored.length) : 0;
    const rows = scored
      .filter((x) => (!district || x.it.district === district) && (!overdueOnly || x.s.level === 'breach'))
      .sort((a, b) => LEVEL_ORDER[a.s.level] - LEVEL_ORDER[b.s.level] || (b.s.days ?? 0) - (a.s.days ?? 0) || a.it.name.localeCompare(b.it.name));
    return { rows, breachN, warnN, avg };
  }, [items, district, overdueOnly]);

  return (
    <div className="rounded-xl border bg-white print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Timer size={15} className="text-brand" /> Report SLA &amp; bottlenecks
        </h3>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span><b className="tabular-nums text-red-700">{breachN}</b> overdue</span>
          <span><b className="tabular-nums text-amber-700">{warnN}</b> due soon</span>
          <span><b className="tabular-nums">{avg}d</b> avg wait</span>
          <span className="text-slate-400">SLA {SLA_TARGET_DAYS}d</span>
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
            <input type="checkbox" className="h-3.5 w-3.5 accent-[#008C44]" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
            Overdue only
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          {overdueOnly ? 'No reports over the SLA in this view.' : 'No reports waiting on SADP approval right now.'}
        </p>
      ) : (
        <ExpandableList
          items={rows.map(({ it, s }) => (
            <Row key={it.id} it={it} s={s} onOpen={() => openItem(it.id)} />
          ))}
        />
      )}
    </div>
  );
}

function Row({ it, s, onOpen }: { it: Item; s: Sla; onOpen: () => void }) {
  const meta = SLA_META[s.level];
  const pct = Math.min(100, Math.round(((s.days ?? 0) / SLA_TARGET_DAYS) * 100));
  return (
    <li>
      <button onClick={onOpen} className="hover-row flex w-full items-center gap-3 px-4 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">{it.name}</span>
            <span className="shrink-0 text-xs text-slate-400">{it.district}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{sourceLabel(s)}</span>
            <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-slate-100" title={`SLA target ${SLA_TARGET_DAYS} days`}>
              <div className={`h-full ${meta.bar}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${meta.text}`}>{s.days}d</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>{meta.label}</span>
      </button>
    </li>
  );
}
