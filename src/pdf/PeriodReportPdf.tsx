/**
 * PeriodReportPdf — print-ready PDF for a Monthly / Quarterly / Custom report.
 * Uses the same @react-pdf/renderer style + 4D brand colors as CoverPagePdf
 * and M1Pdf.
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { PeriodReportSnapshot, ReportKind } from '@/lib/reports';
import { periodLabel } from '@/lib/reports';

const BRAND_GREEN = '#006838';
const BRAND_LIME  = '#8DC63F';
const MUTED       = '#6a6a6a';
const BORDER      = '#d9dcd9';

const styles = StyleSheet.create({
  page:   { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: { borderBottomWidth: 2, borderBottomColor: BRAND_GREEN, paddingBottom: 8, marginBottom: 14 },
  brand:  { color: BRAND_GREEN, fontSize: 11, fontWeight: 700 },
  brand2: { color: BRAND_LIME, fontSize: 8, marginTop: 2, letterSpacing: 1 },
  title:  { fontSize: 18, fontWeight: 700, marginTop: 12 },
  sub:    { color: MUTED, fontSize: 9, marginTop: 2 },

  h2:     { fontSize: 11, fontWeight: 700, color: BRAND_GREEN, marginTop: 12, marginBottom: 6,
            borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 2 },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  kpiCard:{ width: '25%', padding: 4 },
  kpiBox: { border: `1pt solid ${BORDER}`, borderRadius: 4, padding: 6 },
  kpiLab: { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiVal: { fontSize: 13, fontWeight: 700, marginTop: 2 },

  table:    { borderWidth: 1, borderColor: BORDER, borderRadius: 2 },
  thRow:    { flexDirection: 'row', backgroundColor: '#f2f4f1', borderBottomWidth: 1, borderBottomColor: BORDER },
  tr:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER },
  trLast:   { flexDirection: 'row' },
  th:       { fontSize: 7, fontWeight: 700, padding: 4, textTransform: 'uppercase' },
  td:       { fontSize: 8, padding: 4 },
  tdNum:    { fontSize: 8, padding: 4, textAlign: 'right' },
  tdCenter: { fontSize: 8, padding: 4, textAlign: 'center' },

  twoCol:   { flexDirection: 'row', gap: 10 },
  card:     { flex: 1, border: `1pt solid ${BORDER}`, borderRadius: 4, padding: 8 },
  rowKV:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5, fontSize: 8 },
  k:        { color: MUTED },
  v:        { fontWeight: 700 },

  footer:   { position: 'absolute', bottom: 20, left: 36, right: 36, textAlign: 'center',
              color: MUTED, fontSize: 7 },
});

const fmtLSL = (n: number) => 'M ' + Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function PeriodReportPdf({ snapshot, kind }: { snapshot: PeriodReportSnapshot; kind: ReportKind }) {
  const { summary, milestone_matrix, esmp_compliance, borehole_progress,
          m1_financials, new_enterprises } = snapshot;
  const label = periodLabel(kind, snapshot.period);
  const scopeStr = snapshot.scope.kind === 'all' ? 'All organisations' : snapshot.scope.org_name;

  return (
    <Document title={`SADP-II ${label} report`}>
      {/* --- Page 1 — overview --- */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>SADP-II Monitoring</Text>
          <Text style={styles.brand2}>4D CLIMATE SOLUTIONS</Text>
          <Text style={styles.title}>{label} — Period Report</Text>
          <Text style={styles.sub}>
            {fmtDate(snapshot.period.start)} – {fmtDate(snapshot.period.end)}  ·  {scopeStr}
            {'  ·  Generated '}{fmtDate(snapshot.generated_at)}
          </Text>
        </View>

        <Text style={styles.h2}>Headline numbers</Text>
        <View style={styles.kpiRow}>
          <Kpi label="Enterprises (total)"   value={String(summary.enterprises_total)} />
          <Kpi label="New this period"       value={'+' + summary.enterprises_new_in_period} />
          <Kpi label="M1 reports filed"      value={String(summary.m1_submitted_in_period)} />
          <Kpi label="ESSF filed"            value={String(summary.essf_submitted_in_period)} />
          <Kpi label="EMMP filed"            value={String(summary.emmp_submitted_in_period)} />
          <Kpi label="Inspections"           value={String(summary.inspections_in_period)} />
          <Kpi label="Planned budget"        value={fmtLSL(summary.budget_planned_lsl)} />
          <Kpi label="Grant value"           value={fmtLSL(summary.budget_grant_lsl)} />
        </View>

        <Text style={styles.h2}>Milestone tracker — cumulative as of {fmtDate(snapshot.period.end)}</Text>
        <View style={styles.table}>
          <View style={styles.thRow}>
            <Text style={[styles.th, { width: '20%' }]}>District</Text>
            <Text style={[styles.th, { width: '8%', textAlign: 'right' }]}>Total</Text>
            <Text style={[styles.th, { width: '8%', textAlign: 'center' }]}>ESMP</Text>
            <Text style={[styles.th, { width: '8%', textAlign: 'center' }]}>M1</Text>
            <Text style={[styles.th, { width: '8%', textAlign: 'center' }]}>BP</Text>
            <Text style={[styles.th, { width: '10%', textAlign: 'center' }]}>Contracts</Text>
            <Text style={[styles.th, { width: '10%', textAlign: 'center' }]}>Borehole</Text>
            <Text style={[styles.th, { width: '12%', textAlign: 'center' }]}>Budget xfer</Text>
            <Text style={[styles.th, { width: '8%', textAlign: 'center' }]}>Sup.</Text>
            <Text style={[styles.th, { width: '8%', textAlign: 'center' }]}>Proc.</Text>
          </View>
          {milestone_matrix.map((r, i) => (
            <View key={r.district_id} style={i === milestone_matrix.length - 1 ? styles.trLast : styles.tr}>
              <Text style={[styles.td, { width: '20%' }]}>{r.district}</Text>
              <Text style={[styles.tdNum, { width: '8%' }]}>{r.total}</Text>
              <Text style={[styles.tdCenter, { width: '8%' }]}>{r.esmp_done}/{r.total}</Text>
              <Text style={[styles.tdCenter, { width: '8%' }]}>{r.m1_done}/{r.total}</Text>
              <Text style={[styles.tdCenter, { width: '8%' }]}>{r.bp_done}/{r.total}</Text>
              <Text style={[styles.tdCenter, { width: '10%' }]}>{r.contracts_done}/{r.total}</Text>
              <Text style={[styles.tdCenter, { width: '10%' }]}>{r.borehole_done}/{r.total}</Text>
              <Text style={[styles.tdCenter, { width: '12%' }]}>{r.budget_xfer_done}/{r.total}</Text>
              <Text style={[styles.tdCenter, { width: '8%' }]}>{r.supervision_done}/{r.total}</Text>
              <Text style={[styles.tdCenter, { width: '8%' }]}>{r.procurement_done}/{r.total}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Compliance · Borehole · Financials</Text>
        <View style={styles.twoCol}>
          <View style={styles.card}>
            <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 4 }}>ESMP compliance</Text>
            <KV k="ESSF filed"     v={esmp_compliance.essf_filed} />
            <KV k="ESSF approved"  v={esmp_compliance.essf_approved} />
            <KV k="EMMP filed"     v={esmp_compliance.emmp_filed} />
            <KV k="EMMP approved"  v={esmp_compliance.emmp_approved} />
            <KV k="Inspections"    v={esmp_compliance.inspections} />
          </View>
          <View style={styles.card}>
            <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 4 }}>Borehole (in period)</Text>
            <KV k="Drilling permit"          v={borehole_progress.drilling_permit} />
            <KV k="Borehole drilling"        v={borehole_progress.borehole_drilling} />
            <KV k="Borehole casing"          v={borehole_progress.borehole_casing} />
            <KV k="Yield / pumping test"     v={borehole_progress.borehole_yield_test} />
            <KV k="Drilling report"          v={borehole_progress.borehole_drilling_report} />
            <KV k="Water use permit"         v={borehole_progress.water_use_permit} />
          </View>
          <View style={styles.card}>
            <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 4 }}>M1 financials</Text>
            <KV k="M1 reports"     v={m1_financials.m1_count} />
            <KV k="Planned"        v={fmtLSL(m1_financials.total_planned_lsl)} />
            <KV k="Incurred"       v={fmtLSL(m1_financials.total_incurred_lsl)} />
            <KV k="Cashbook total" v={fmtLSL(m1_financials.cashbook_total_lsl)} />
          </View>
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `SADP-II Monitoring · ${label} · Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </Page>

      {/* --- Page 2 — new enterprises --- */}
      {new_enterprises.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.brand}>SADP-II Monitoring</Text>
            <Text style={styles.title}>New enterprises ({new_enterprises.length})</Text>
            <Text style={styles.sub}>{label} · {scopeStr}</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.thRow}>
              <Text style={[styles.th, { width: '28%' }]}>Name</Text>
              <Text style={[styles.th, { width: '8%' }]}>Org</Text>
              <Text style={[styles.th, { width: '16%' }]}>District</Text>
              <Text style={[styles.th, { width: '18%' }]}>RC</Text>
              <Text style={[styles.th, { width: '14%' }]}>Type</Text>
              <Text style={[styles.th, { width: '16%', textAlign: 'right' }]}>Budget (LSL)</Text>
            </View>
            {new_enterprises.map((e, i) => (
              <View key={e.id} style={i === new_enterprises.length - 1 ? styles.trLast : styles.tr}>
                <Text style={[styles.td, { width: '28%' }]}>{e.name ?? '—'}</Text>
                <Text style={[styles.td, { width: '8%' }]}>{e.org_code ?? '—'}</Text>
                <Text style={[styles.td, { width: '16%' }]}>{e.district ?? '—'}</Text>
                <Text style={[styles.td, { width: '18%' }]}>{e.resource_center ?? '—'}</Text>
                <Text style={[styles.td, { width: '14%' }]}>{e.enterprise_type ?? '—'}</Text>
                <Text style={[styles.tdNum, { width: '16%' }]}>
                  {e.budget_lsl ? e.budget_lsl.toLocaleString() : '—'}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.footer]} render={({ pageNumber, totalPages }) => (
            `SADP-II Monitoring · ${label} · Page ${pageNumber} of ${totalPages}`
          )} fixed />
        </Page>
      )}

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>SADP-II Monitoring</Text>
          <Text style={styles.title}>Sign-off</Text>
          <Text style={styles.sub}>{label} · {scopeStr}</Text>
        </View>
        <View style={{ marginTop: 30 }}>
          <Text style={{ fontSize: 9, color: MUTED, marginBottom: 18 }}>
            Prepared by the SADP-II Monitoring platform. Numbers reflect the database state at
            generation time. For source records, log into the platform and visit the enterprise
            detail pages.
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 40 }}>
            <SigBlock title="Prepared by" />
            <View style={{ width: 40 }} />
            <SigBlock title="Reviewed by" />
          </View>
        </View>
        <Text style={[styles.footer]} render={({ pageNumber, totalPages }) => (
          `SADP-II Monitoring · ${label} · Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiBox}>
        <Text style={styles.kpiLab}>{label}</Text>
        <Text style={styles.kpiVal}>{value}</Text>
      </View>
    </View>
  );
}
function KV({ k, v }: { k: string; v: string | number }) {
  return (
    <View style={styles.rowKV}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}
function SigBlock({ title }: { title: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 8, color: MUTED, marginBottom: 20 }}>{title}</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: '#9a9a9a', marginBottom: 4 }} />
      <Text style={{ fontSize: 8 }}>Name</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: '#9a9a9a', marginTop: 18, marginBottom: 4 }} />
      <Text style={{ fontSize: 8 }}>Signature & date</Text>
    </View>
  );
}
