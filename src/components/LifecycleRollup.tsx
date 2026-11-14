/**
 * Summary rollups for the lifecycle feature:
 *   1. Milestone distribution (M1 / M2 / Graduated) by district — clickable.
 *   2. Contributions & funds (M1 + M2) by district — farmer vs contract,
 *      SADP contributed, funds depleted vs allocated.
 *
 * Derived from the tracker's items (lifecycle_stage + stage_finances); no chart
 * library, same card/bar language as the rest of the Summary.
 */
import { useMemo } from 'react';
import { Sprout, Leaf, GraduationCap, type LucideIcon } from 'lucide-react';
import { useData } from '../lib/data';
import { useNav } from '../App';
import { DISTRICTS, DISTRICT_SHORT } from '../lib/stages';
import { LIFECYCLE_STAGES, LIFECYCLE_META, type LifecycleStage } from '../lib/lifecycle';
import { MONEY_STAGES, parseStageFinances, formatLsl, formatLslShort } from '../lib/stage-finances';

const MILESTONE_ICON: Record<LifecycleStage, LucideIcon> = { m1: Sprout, m2: Leaf, graduated: GraduationCap };

type Counts = Record<LifecycleStage, number>;
interface Money { contract: number; contributed: number; sadp: number; allocated: number; depleted: number }

const blankCounts = (): Counts => ({ m1: 0, m2: 0, graduated: 0 });
const blankMoney = (): Money => ({ contract: 0, contributed: 0, sadp: 0, allocated: 0, depleted: 0 });

export function LifecycleRollup() {
  const { items } = useData();
  const { go } = useNav();

  const { counts, totalCounts, money, totalMoney, anyMoney } = useMemo(() => {
    const counts: Record<string, Counts> = {};
    const money: Record<string, Money> = {};
    for (const d of DISTRICTS) {
      counts[d] = blankCounts();
      money[d] = blankMoney();
    }
    const totalCounts = blankCounts();
    const totalMoney = blankMoney();

    for (const it of items) {
      const d = (DISTRICTS as readonly string[]).includes(it.district) ? it.district : null;
      totalCounts[it.lifecycle_stage]++;
      if (d) counts[d][it.lifecycle_stage]++;

      const map = parseStageFinances(it.stage_finances);
      for (const s of MONEY_STAGES) {
        const f = map[s];
        if (!f) continue;
        const add = (m: Money) => {
          m.contract += f.farmer_contract_lsl ?? 0;
          m.contributed += f.farmer_contributed_lsl ?? 0;
          m.sadp += f.sadp_contributed_lsl ?? 0;
          m.allocated += f.funds_allocated_lsl ?? 0;
          m.depleted += f.funds_depleted_lsl ?? 0;
        };
        add(totalMoney);
        if (d) add(money[d]);
      }
    }
    const anyMoney = Object.values(totalMoney).some((v) => v > 0);
    return { counts, totalCounts, money, totalMoney, anyMoney };
  }, [items]);

  const rows: { key: string; label: string; district?: string }[] = [
    { key: 'total', label: 'Total' },
    ...DISTRICTS.map((d) => ({ key: d, label: DISTRICT_SHORT[d], district: d })),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Milestones */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-0.5 text-sm font-semibold">Enterprise milestones</h3>
        <p className="mb-3 text-xs text-slate-500">Where each enterprise sits on the M1 → M2 → Graduation journey. Click to see them.</p>

        {/* Headline tiles */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {LIFECYCLE_STAGES.map((s) => {
            const Icon = MILESTONE_ICON[s];
            const n = totalCounts[s];
            const total = totalCounts.m1 + totalCounts.m2 + totalCounts.graduated;
            return (
              <button
                key={s}
                onClick={() => go('list', { lifecycle: s })}
                className="relative overflow-hidden rounded-lg border border-slate-200 p-3 text-left transition hover:border-brand hover:shadow-sm"
                title={LIFECYCLE_META[s].description}
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${LIFECYCLE_META[s].dot}`} />
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Icon size={13} /> {LIFECYCLE_META[s].full}
                </div>
                <div className="mt-0.5 text-2xl font-bold tabular-nums">{n}</div>
                <div className="text-[11px] text-slate-400">{total ? Math.round((n / total) * 100) : 0}% of {total}</div>
              </button>
            );
          })}
        </div>

        {/* By district */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">By district</div>
          {rows.map((r) => {
            const c = r.district ? counts[r.district] : totalCounts;
            const tot = c.m1 + c.m2 + c.graduated;
            return (
              <div key={r.key} className="flex items-center gap-3">
                <span className={`w-12 shrink-0 text-xs ${r.key === 'total' ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>{r.label}</span>
                <div className="flex h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/60" title={`${tot} enterprise${tot === 1 ? '' : 's'}`}>
                  {LIFECYCLE_STAGES.map((s) =>
                    c[s] ? <div key={s} className={`${LIFECYCLE_META[s].dot} transition-all`} style={{ width: `${(c[s] / Math.max(tot, 1)) * 100}%` }} title={`${LIFECYCLE_META[s].full}: ${c[s]}`} /> : null,
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5 text-xs tabular-nums">
                  {LIFECYCLE_STAGES.map((s) => (
                    <button
                      key={s}
                      onClick={() => go('list', { lifecycle: s, district: r.district })}
                      className="inline-flex items-center gap-1 rounded px-1 hover:bg-brand-light disabled:opacity-30"
                      disabled={!c[s]}
                      title={`${LIFECYCLE_META[s].full}${r.district ? ` · ${r.district}` : ''}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${LIFECYCLE_META[s].dot}`} />
                      <b>{c[s]}</b>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contributions & funds */}
      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-0.5 text-sm font-semibold">Contributions &amp; funds</h3>
        <p className="mb-3 text-xs text-slate-500">Farmer &amp; SADP contributions and fund depletion across M1 + M2 (Maloti).</p>
        {!anyMoney ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">No amounts captured yet. Open an enterprise and fill in Stage finances.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1.5 pr-2 font-semibold"></th>
                  <th className="py-1.5 pr-2 font-semibold">Farmer (paid / contract)</th>
                  <th className="py-1.5 pr-2 font-semibold">SADP</th>
                  <th className="py-1.5 font-semibold">Funds (depleted / allocated)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const m = r.district ? money[r.district] : totalMoney;
                  const farmerPct = m.contract > 0 ? Math.min(100, Math.round((m.contributed / m.contract) * 100)) : null;
                  const fundPct = m.allocated > 0 ? Math.min(100, Math.round((m.depleted / m.allocated) * 100)) : null;
                  return (
                    <tr key={r.key} className={r.key === 'total' ? 'font-semibold' : ''}>
                      <td className="py-1.5 pr-2 text-slate-600">{r.label}</td>
                      <td className="py-1.5 pr-2">
                        <div className="tabular-nums">{formatLslShort(m.contributed)} / {formatLslShort(m.contract)}</div>
                        <MiniBar pct={farmerPct} tone="bg-brand-logo" />
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums" title={formatLsl(m.sadp)}>{formatLslShort(m.sadp)}</td>
                      <td className="py-1.5">
                        <div className="tabular-nums">{formatLslShort(m.depleted)} / {formatLslShort(m.allocated)}</div>
                        <MiniBar pct={fundPct} tone="bg-fdblue" />
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

function MiniBar({ pct, tone }: { pct: number | null; tone: string }) {
  if (pct == null) return <div className="mt-1 h-1 w-full rounded-full bg-slate-100" />;
  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100" title={`${pct}%`}>
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
