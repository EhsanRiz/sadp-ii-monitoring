/**
 * "Graduation funnel" — the Summary card that shows how the cohort converts
 * along M1 → M2 → Graduation, the drop-off at each step, and how long the
 * journey takes. A group-by toggle (district / service provider / type) ranks
 * who converts best and worst, so attention goes where progression stalls.
 */
import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { useData, type Item } from '../lib/data';
import { useNav } from '../App';
import { DISTRICT_SHORT } from '../lib/stages';
import { deriveFunnel, groupFunnel, type FunnelStep } from '../lib/funnel';

type GroupBy = 'district' | 'sp' | 'type';

const GROUP_META: Record<GroupBy, { label: string; keyOf: (it: Item) => string | null }> = {
  district: { label: 'District', keyOf: (it) => it.district },
  sp: { label: 'Service provider', keyOf: (it) => it.service_provider },
  type: { label: 'Enterprise type', keyOf: (it) => it.enterprise_type },
};

const STEP_TONE: Record<FunnelStep['key'], { bar: string; text: string }> = {
  enrolled: { bar: 'bg-slate-400', text: 'text-slate-600' },
  m2: { bar: 'bg-fdblue', text: 'text-sky-800' },
  graduated: { bar: 'bg-brand-logo', text: 'text-brand-dark' },
};

export function GraduationFunnel() {
  const { items } = useData();
  const { go } = useNav();
  const [groupBy, setGroupBy] = useState<GroupBy>('district');

  const funnel = useMemo(() => deriveFunnel(items), [items]);
  const rows = useMemo(() => groupFunnel(items, GROUP_META[groupBy].keyOf), [items, groupBy]);

  const tenure = funnel.avgTimeToGraduateDays ?? funnel.avgTenureDays;
  const tenureLabel = funnel.avgTimeToGraduateDays != null ? 'avg to graduate' : 'avg time in programme';

  return (
    <div className="rounded-xl border bg-white p-4 print:hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold">Graduation funnel</h3>
        {tenure != null && (
          <span className="text-xs text-slate-500">
            <b className="tabular-nums text-slate-700">{tenure}d</b> {tenureLabel}
          </span>
        )}
      </div>
      <p className="mb-4 mt-0.5 text-xs text-slate-500">
        How the cohort converts from enrolment to graduation. The drop between steps is where enterprises stall.
      </p>

      {/* Funnel */}
      <div className="space-y-1.5">
        {funnel.steps.map((s, i) => {
          const tone = STEP_TONE[s.key];
          return (
            <div key={s.key}>
              {i > 0 && (
                <div className="flex items-center gap-2 py-0.5 pl-1 text-[11px] text-slate-400">
                  <span className="text-slate-300">↳</span>
                  <span>
                    <b className={`tabular-nums ${s.conv != null && s.conv < 50 ? 'text-amber-700' : 'text-slate-600'}`}>{s.conv ?? 0}%</b>{' '}
                    of {funnel.steps[i - 1].label.toLowerCase()} continued
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="h-8 flex-1 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className={`flex h-full items-center rounded-md ${tone.bar} transition-all`}
                    style={{ width: `${Math.max(s.pctOfTop, s.count > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <div className="flex w-36 shrink-0 items-baseline gap-1.5">
                  <span className="text-lg font-bold tabular-nums">{s.count}</span>
                  <span className={`text-xs font-medium ${tone.text}`}>{s.label}</span>
                  <span className="ml-auto text-[11px] tabular-nums text-slate-400">{s.pctOfTop}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Group-by breakdown */}
      <div className="mt-5 border-t pt-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            <Filter size={12} /> Conversion by
          </span>
          <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
            {(Object.keys(GROUP_META) as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`rounded px-2 py-0.5 ${groupBy === g ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {GROUP_META[g].label}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            No {GROUP_META[groupBy].label.toLowerCase()} data to group by yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1.5 pr-2 font-semibold">{GROUP_META[groupBy].label}</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Enrolled</th>
                  <th className="py-1.5 pr-2 font-semibold">→ M2</th>
                  <th className="py-1.5 font-semibold">→ Graduated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const clickable = groupBy === 'district';
                  return (
                    <tr key={r.key}>
                      <td className="py-1.5 pr-2">
                        {clickable ? (
                          <button onClick={() => go('list', { district: r.label })} className="font-medium text-slate-700 hover:text-brand hover:underline">
                            {DISTRICT_SHORT[r.label] ?? r.label}
                          </button>
                        ) : (
                          <span className="font-medium text-slate-700">{r.label}</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600">{r.enrolled}</td>
                      <td className="py-1.5 pr-2">
                        <ConvCell count={r.reachedM2} pct={r.pctM2} tone="bg-fdblue" />
                      </td>
                      <td className="py-1.5">
                        <ConvCell count={r.graduated} pct={r.pctGrad} tone="bg-brand-logo" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ConvCell({ count, pct, tone }: { count: number; pct: number; tone: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100" title={`${pct}%`}>
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-slate-600">
        <b>{count}</b>
        <span className="ml-1 text-[10px] text-slate-400">{pct}%</span>
      </span>
    </div>
  );
}
