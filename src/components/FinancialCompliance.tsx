/**
 * "Financial compliance" — the Summary card that aggregates the two money risks
 * that can undo a successful graduation (farmer counterpart shortfall, funds
 * spent but unreported) and lists the enterprises carrying exposure, so staff
 * clean the books before graduation rather than after.
 */
import { useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useData, type Item } from '../lib/data';
import { useNav } from '../App';
import { DISTRICTS, DISTRICT_SHORT } from '../lib/stages';
import { formatLsl, formatLslShort } from '../lib/stage-finances';
import { deriveCompliance, aggregateCompliance, type EntCompliance } from '../lib/compliance';
import { ExpandableList } from './ExpandableList';

type View = 'all' | 'shortfall' | 'unreported';

const VIEW_META: Record<View, { label: string }> = {
  all: { label: 'All' },
  shortfall: { label: 'Farmer shortfall' },
  unreported: { label: 'Unreported' },
};

export function FinancialCompliance() {
  const { items } = useData();
  const { openItem } = useNav();
  const [district, setDistrict] = useState('');
  const [view, setView] = useState<View>('all');

  const { totals, rows } = useMemo(() => {
    const scored = items.map((it) => ({ it, c: deriveCompliance(it) }));
    const totals = aggregateCompliance(scored.map((s) => s.c));
    const rows = scored
      .filter((s) => s.c.flagged)
      .filter((s) => !district || s.it.district === district)
      .filter((s) => (view === 'shortfall' ? s.c.hasShortfall : view === 'unreported' ? s.c.hasUnreported : true))
      .sort((a, b) => b.c.exposure - a.c.exposure || a.it.name.localeCompare(b.it.name));
    return { totals, rows };
  }, [items, district, view]);

  return (
    <div className="rounded-xl border bg-white print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <ShieldAlert size={15} className="text-brand" /> Financial compliance
        </h3>
        <span className="text-xs text-slate-500">
          <b className="tabular-nums text-slate-700" title={formatLsl(totals.exposure)}>{formatLslShort(totals.exposure)}</b> exposure ·{' '}
          <b className="tabular-nums">{totals.flaggedCount}</b> enterprise{totals.flaggedCount === 1 ? '' : 's'}
        </span>
        <div className="ml-auto flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
          {['', ...DISTRICTS].map((d) => (
            <button key={d || 'all'} onClick={() => setDistrict(d)} className={`rounded px-2 py-0.5 ${district === d ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {d ? DISTRICT_SHORT[d] : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Two compliance metrics */}
      <div className="grid gap-3 border-b p-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Farmer counterpart shortfall</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-amber-700" title={formatLsl(totals.farmerShortfall)}>{formatLslShort(totals.farmerShortfall)}</span>
            <span className="text-[11px] text-slate-400">{totals.shortfallCount} enterprise{totals.shortfallCount === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100" title={totals.contributedPct == null ? 'No contract captured' : `${totals.contributedPct}% of contract paid in`}>
              <div className="h-full bg-brand-logo" style={{ width: `${totals.contributedPct ?? 0}%` }} />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{totals.contributedPct == null ? '—' : `${totals.contributedPct}% paid`}</span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Funds spent, unreported</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-amber-700" title={formatLsl(totals.unreported)}>{formatLslShort(totals.unreported)}</span>
            <span className="text-[11px] text-slate-400">{totals.unreportedCount} enterprise{totals.unreportedCount === 1 ? '' : 's'}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Depleted funds not yet accounted for to SADP — an audit risk at graduation.</p>
        </div>
      </div>

      {/* Chase queue */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Show</span>
        <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
          {(Object.keys(VIEW_META) as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded px-2 py-0.5 ${view === v ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {VIEW_META[v].label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          {totals.flaggedCount === 0 ? 'No outstanding financial compliance exposure.' : 'None in this view.'}
        </p>
      ) : (
        <ExpandableList
          items={rows.map(({ it, c }) => (
            <Row key={it.id} it={it} c={c} onOpen={() => openItem(it.id)} />
          ))}
        />
      )}
    </div>
  );
}

function Row({ it, c, onOpen }: { it: Item; c: EntCompliance; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className="hover-row flex w-full items-center gap-3 px-4 py-2.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">{it.name}</span>
            <span className="shrink-0 text-xs text-slate-400">{it.district}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {c.hasShortfall && (
              <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800" title={`Farmer counterpart short ${formatLsl(c.farmerShortfall)}`}>
                Farmer short {formatLslShort(c.farmerShortfall)}
              </span>
            )}
            {c.hasUnreported && (
              <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800" title={`Funds unreported ${formatLsl(c.unreported)}`}>
                Unreported {formatLslShort(c.unreported)}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700" title={`Total exposure ${formatLsl(c.exposure)}`}>{formatLslShort(c.exposure)}</span>
      </button>
    </li>
  );
}
