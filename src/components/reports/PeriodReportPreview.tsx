/**
 * PeriodReportPreview — renders the snapshot JSON returned by
 * generate_period_report() as a print-friendly web preview.
 *
 * Layout matches the eventual PDF order:
 *   Cover  →  Summary KPIs  →  Milestone matrix  →  ESMP compliance
 *          →  Borehole progress  →  M1 financials  →  New enterprises  →  Appendix
 */
import type { PeriodReportSnapshot } from '@/lib/reports';
import { periodLabel } from '@/lib/reports';
import { cn } from '@/lib/utils';

interface Props {
  snapshot: PeriodReportSnapshot;
  kind: 'monthly' | 'quarterly' | 'custom';
}

const fmtLSL = (n: number) =>
  'M ' + Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
const fmtPct = (n: number, d: number) => (d === 0 ? '–' : `${Math.round((n / d) * 100)}%`);
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function PeriodReportPreview({ snapshot, kind }: Props) {
  const { summary, milestone_matrix, new_enterprises, m1_financials,
          esmp_compliance, borehole_progress, appendix } = snapshot;
  const totalEnt = summary.enterprises_total || 0;
  const label = periodLabel(kind, snapshot.period);

  const totalDone = (k: keyof typeof milestone_matrix[0]) =>
    milestone_matrix.reduce((acc, r) => acc + (r[k] as number), 0);
  const grandTotal = milestone_matrix.reduce((a, r) => a + r.total, 0);

  return (
    <div className="space-y-8">
      {/* --- Cover --- */}
      <section className="rounded-xl border bg-gradient-to-br from-primary/5 to-tint-success/30 p-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">
          SADP-II Monitoring · Period Report
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {label}
        </h1>
        <div className="mt-1 text-sm text-muted-foreground">
          {fmtDate(snapshot.period.start)} – {fmtDate(snapshot.period.end)}
          {' · '}
          Scope: {snapshot.scope.kind === 'all' ? 'All organisations' : snapshot.scope.org_name}
          {' · '}
          Generated {fmtDate(snapshot.generated_at)}
        </div>
      </section>

      {/* --- KPI tiles --- */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Headline numbers
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Kpi label="Enterprises (total)"  value={summary.enterprises_total.toString()} />
          <Kpi label="New this period"     value={'+' + summary.enterprises_new_in_period} accent="success" />
          <Kpi label="M1 reports filed"    value={summary.m1_submitted_in_period.toString()} />
          <Kpi label="ESSF filed"          value={summary.essf_submitted_in_period.toString()} />
          <Kpi label="EMMP filed"          value={summary.emmp_submitted_in_period.toString()} />
          <Kpi label="Inspection visits"   value={summary.inspections_in_period.toString()} />
          <Kpi label="Planned budget"      value={fmtLSL(summary.budget_planned_lsl)} subtle />
          <Kpi label="Grant value"         value={fmtLSL(summary.budget_grant_lsl)} subtle />
        </div>
      </section>

      {/* --- Milestone matrix --- */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Milestone tracker — cumulative as of {fmtDate(snapshot.period.end)}
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">District</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-center">ESMP</th>
                <th className="p-2 text-center">M1</th>
                <th className="p-2 text-center">BP</th>
                <th className="p-2 text-center">Contracts</th>
                <th className="p-2 text-center">Bene contr.</th>
                <th className="p-2 text-center">SADP contr.</th>
                <th className="p-2 text-center">Borehole</th>
                <th className="p-2 text-center">Budget xfer</th>
                <th className="p-2 text-center">Supervision</th>
                <th className="p-2 text-center">Procurement</th>
              </tr>
            </thead>
            <tbody>
              {milestone_matrix.map((r) => (
                <tr key={r.district_id}
                    className="border-t transition-colors duration-150 hover:bg-muted/30">
                  <td className="p-2 font-medium">{r.district}</td>
                  <td className="p-2 text-right tabular-nums">{r.total}</td>
                  <MCell n={r.esmp_done} d={r.total} />
                  <MCell n={r.m1_done} d={r.total} />
                  <MCell n={r.bp_done} d={r.total} />
                  <MCell n={r.contracts_done} d={r.total} />
                  <MCell n={r.bene_contrib_done} d={r.total} />
                  <MCell n={r.sadp_contrib_done} d={r.total} />
                  <MCell n={r.borehole_done} d={r.total} />
                  <MCell n={r.budget_xfer_done} d={r.total} />
                  <MCell n={r.supervision_done} d={r.total} />
                  <MCell n={r.procurement_done} d={r.total} />
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/20 text-[11px]">
              <tr>
                <td className="p-2 font-semibold">All districts</td>
                <td className="p-2 text-right tabular-nums font-semibold">{grandTotal}</td>
                <td className="p-2 text-center tabular-nums">{totalDone('esmp_done')} ({fmtPct(totalDone('esmp_done'), grandTotal)})</td>
                <td className="p-2 text-center tabular-nums">{totalDone('m1_done')} ({fmtPct(totalDone('m1_done'), grandTotal)})</td>
                <td className="p-2 text-center tabular-nums">{totalDone('bp_done')} ({fmtPct(totalDone('bp_done'), grandTotal)})</td>
                <td className="p-2 text-center tabular-nums">{totalDone('contracts_done')} ({fmtPct(totalDone('contracts_done'), grandTotal)})</td>
                <td className="p-2 text-center tabular-nums">{totalDone('bene_contrib_done')} ({fmtPct(totalDone('bene_contrib_done'), grandTotal)})</td>
                <td className="p-2 text-center tabular-nums">{totalDone('sadp_contrib_done')} ({fmtPct(totalDone('sadp_contrib_done'), grandTotal)})</td>
                <td className="p-2 text-center tabular-nums">{totalDone('borehole_done')} ({fmtPct(totalDone('borehole_done'), grandTotal)})</td>
                <td className="p-2 text-center tabular-nums">{totalDone('budget_xfer_done')} ({fmtPct(totalDone('budget_xfer_done'), grandTotal)})</td>
                <td className="p-2 text-center tabular-nums">{totalDone('supervision_done')} ({fmtPct(totalDone('supervision_done'), grandTotal)})</td>
                <td className="p-2 text-center tabular-nums">{totalDone('procurement_done')} ({fmtPct(totalDone('procurement_done'), grandTotal)})</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* --- ESMP compliance + Borehole + M1 financials, three columns --- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">ESMP compliance</h3>
          <Row k="ESSF filed"     v={esmp_compliance.essf_filed} />
          <Row k="ESSF approved"  v={esmp_compliance.essf_approved} />
          <Row k="EMMP filed"     v={esmp_compliance.emmp_filed} />
          <Row k="EMMP approved"  v={esmp_compliance.emmp_approved} />
          <Row k="Inspections"    v={esmp_compliance.inspections} />
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Borehole supervision (in period)</h3>
          <Row k="Drilling permit"          v={borehole_progress.drilling_permit} />
          <Row k="Borehole drilling"        v={borehole_progress.borehole_drilling} />
          <Row k="Borehole casing"          v={borehole_progress.borehole_casing} />
          <Row k="Yield / pumping test"     v={borehole_progress.borehole_yield_test} />
          <Row k="Drilling report"          v={borehole_progress.borehole_drilling_report} />
          <Row k="Water use permit"         v={borehole_progress.water_use_permit} />
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Milestone 1 financials</h3>
          <Row k="M1 reports filed"    v={m1_financials.m1_count} />
          <Row k="Total planned"       v={fmtLSL(m1_financials.total_planned_lsl)} />
          <Row k="Total incurred"      v={fmtLSL(m1_financials.total_incurred_lsl)} />
          <Row k="Cashbook total"      v={fmtLSL(m1_financials.cashbook_total_lsl)} />
        </div>
      </section>

      {/* --- New enterprises --- */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          New enterprises in period ({new_enterprises.length})
        </h2>
        {new_enterprises.length === 0 ? (
          <p className="text-sm text-muted-foreground">None created in this period.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Org</th>
                  <th className="text-left p-2">District</th>
                  <th className="text-left p-2">Resource centre</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Budget (LSL)</th>
                  <th className="text-left p-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {new_enterprises.slice(0, 25).map((e) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="p-2 font-medium">{e.name ?? '—'}</td>
                    <td className="p-2">{e.org_code ?? '—'}</td>
                    <td className="p-2">{e.district ?? '—'}</td>
                    <td className="p-2">{e.resource_center ?? '—'}</td>
                    <td className="p-2">{e.enterprise_type ?? '—'}</td>
                    <td className="p-2 text-right tabular-nums">{e.budget_lsl ? e.budget_lsl.toLocaleString() : '—'}</td>
                    <td className="p-2">{fmtDate(e.created_at)}</td>
                  </tr>
                ))}
                {new_enterprises.length > 25 && (
                  <tr><td colSpan={7} className="p-2 text-center text-muted-foreground italic">
                    …and {new_enterprises.length - 25} more (see appendix / Excel export).
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="text-[11px] text-muted-foreground border-t pt-3">
        Snapshot covers {totalEnt} enterprises in scope. Appendix has {appendix.length} rows
        available in the Excel export.
      </section>
    </div>
  );
}

function Kpi({ label, value, accent, subtle }: {
  label: string; value: string; accent?: 'success'; subtle?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-3 transition-shadow hover:shadow-sm',
      accent === 'success' && 'border-success/30 bg-tint-success/40',
      subtle && 'bg-muted/20',
    )}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function MCell({ n, d }: { n: number; d: number }) {
  const tone =
    d === 0           ? 'bg-muted/30 text-muted-foreground' :
    n === 0           ? 'bg-muted/20 text-muted-foreground' :
    n === d           ? 'bg-success/15 text-success' :
    n / d >= 0.5      ? 'bg-tint-success/50' :
                        'bg-tint-warning/40';
  return (
    <td className="p-1 text-center">
      <span className={cn('inline-block min-w-[44px] px-1 py-0.5 rounded text-[11px] tabular-nums', tone)}>
        {n} / {d}
      </span>
    </td>
  );
}

function Row({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium tabular-nums">{v}</span>
    </div>
  );
}
