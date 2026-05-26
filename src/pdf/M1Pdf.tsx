/**
 * Combined Milestone 1 (M1) report PDF.
 *
 * Phase 1 scope: Cover page (reused from CoverPagePdfPage) + Narrative
 * Progress Report (7 sections from m1NarrativeSchema).
 *
 * Phase 2 (in progress): Cashbook page is live; Financial Report and Bank
 * Reconciliation will follow.
 * Phase 3 will append: Supporting documents (embedded by reference) +
 * ESSF + EMMP + Inspection compendium.
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { CoverPagePdfPage } from '@/pdf/CoverPagePdf';
import { M1_NARRATIVE_SECTIONS, type M1NarrativeResponses } from '@/forms/m1NarrativeSchema';
import {
  CASHBOOK_COLUMNS,
  computeBudgetCodeSpend,
  computeCashbookTotals,
  computeRunningBalances,
  type M1CashbookEntry,
  type M1CashbookResponses,
} from '@/forms/m1CashbookSchema';
import {
  M1_FR_CATEGORIES,
  M1_FR_COLUMNS,
  computeFinancialSplit,
  computeFinancialDifference,
  computeFinancialTotals,
  type M1FinancialReportResponses,
  type M1FRLineItem,
} from '@/forms/m1FinancialReportSchema';
import {
  computeBRAll,
  type M1BankReconciliationResponses,
} from '@/forms/m1BankReconciliationSchema';
import type { EnterpriseRow } from '@/types/database';
import { formatDateDMY } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 44,
    paddingHorizontal: 44,
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    lineHeight: 1.55,
  },
  topRule: {
    fontSize: 8,
    color: '#666',
    borderBottom: '1pt solid #bbb',
    paddingBottom: 4,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  partTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  sectionNumber: {
    fontSize: 10.5,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#222',
    textAlign: 'justify',
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#888',
    marginBottom: 6,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 44,
    fontSize: 8,
    color: '#666',
  },
  meta: {
    fontSize: 8.5,
    color: '#666',
    marginBottom: 16,
  },
  // ---------- Cashbook (landscape) ----------
  cashPage: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 32,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    lineHeight: 1.35,
  },
  cashHeaderStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1pt solid #006838',
    paddingBottom: 4,
    marginBottom: 8,
  },
  cashHeaderTitle: { fontSize: 11, fontWeight: 'bold', color: '#006838' },
  cashHeaderMeta: { fontSize: 8, color: '#666' },
  cashSubtitle: { fontSize: 9.5, color: '#444', marginBottom: 8 },
  cashOpeningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 9,
  },
  cashOpeningLabel: { fontWeight: 'bold' },
  cashTable: {
    borderTop: '0.5pt solid #999',
    borderLeft: '0.5pt solid #999',
  },
  cashRow: { flexDirection: 'row' },
  cashHeaderCell: {
    backgroundColor: '#2b2b2b',
    color: 'white',
    fontWeight: 'bold',
    padding: 4,
    borderRight: '0.5pt solid #999',
    borderBottom: '0.5pt solid #999',
    fontSize: 7.5,
    textTransform: 'uppercase',
  },
  cashCell: {
    padding: 4,
    borderRight: '0.5pt solid #999',
    borderBottom: '0.5pt solid #999',
    fontSize: 8,
  },
  cashCellRight: { textAlign: 'right' },
  cashZebra: { backgroundColor: '#f6f6f6' },
  cashTotalsRow: {
    flexDirection: 'row',
    backgroundColor: '#dceedb',
    fontWeight: 'bold',
  },
  cashTotalsCell: {
    padding: 5,
    borderRight: '0.5pt solid #999',
    borderBottom: '0.5pt solid #999',
    fontSize: 8.5,
  },
  cashByCodeTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  cashByCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '0.5pt solid #ddd',
    paddingVertical: 2,
    fontSize: 8.5,
  },
  // ---------- Financial Report (landscape, very dense) ----------
  frPage: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 24,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    lineHeight: 1.3,
  },
  frHeaderStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1pt solid #006838',
    paddingBottom: 4,
    marginBottom: 6,
  },
  frHeaderTitle: { fontSize: 11, fontWeight: 'bold', color: '#006838' },
  frHeaderMeta: { fontSize: 7.5, color: '#666' },
  frMetaGrid: { flexDirection: 'row', marginBottom: 8, fontSize: 8 },
  frMetaItem: { width: '25%' },
  frTable: {
    borderTop: '0.5pt solid #999',
    borderLeft: '0.5pt solid #999',
  },
  frRow: { flexDirection: 'row' },
  frHeaderCell: {
    backgroundColor: '#2b2b2b',
    color: 'white',
    fontWeight: 'bold',
    padding: 3,
    borderRight: '0.5pt solid #999',
    borderBottom: '0.5pt solid #999',
    fontSize: 6.5,
    textTransform: 'uppercase',
  },
  frGroupRow: {
    backgroundColor: '#dceedb',
    fontWeight: 'bold',
    padding: 4,
    borderRight: '0.5pt solid #999',
    borderBottom: '0.5pt solid #999',
    fontSize: 8,
    color: '#003d20',
  },
  frCell: {
    padding: 3,
    borderRight: '0.5pt solid #999',
    borderBottom: '0.5pt solid #999',
    fontSize: 7.5,
  },
  frCellRight: { textAlign: 'right' },
  frTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#eaeaea',
    fontWeight: 'bold',
  },
  // ---------- Bank Reconciliation (portrait, fixed-field) ----------
  brPage: {
    paddingTop: 40,
    paddingBottom: 44,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  brTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  brHeaderRow: { flexDirection: 'row', marginBottom: 10, fontSize: 9 },
  brHeaderCell: { width: '50%' },
  brSection: {
    borderTop: '0.5pt solid #666',
    borderLeft: '0.5pt solid #666',
    borderRight: '0.5pt solid #666',
    marginBottom: 8,
  },
  brSectionTitle: {
    backgroundColor: '#eaeaea',
    fontWeight: 'bold',
    padding: 4,
    fontSize: 9.5,
    borderBottom: '0.5pt solid #666',
  },
  brLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: '0.5pt solid #ccc',
    fontSize: 9.5,
  },
  brLineLabel: { flex: 1 },
  brLineValue: { width: 110, textAlign: 'right' },
  brLineBold: { fontWeight: 'bold' },
  brLineComputed: { backgroundColor: '#f6f6f6' },
  brUnexplainedBox: {
    marginTop: 8,
    border: '1pt solid #006838',
    padding: 8,
    backgroundColor: '#dceedb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brUnexplainedBoxBad: {
    border: '1pt solid #c54040',
    backgroundColor: '#fdecec',
  },
  brUnexplainedLabel: { fontSize: 10, fontWeight: 'bold' },
  brUnexplainedValue: { fontSize: 13, fontWeight: 'bold' },
  brSig: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  brSigBox: { width: '48%' },
  brSigLine: { borderBottom: '0.7pt solid #222', height: 18, marginBottom: 2 },
  brSigLabel: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
});

interface M1PdfDocumentProps {
  enterprise: EnterpriseRow;
  districtName: string;
  resourceCenterName: string;
  narrative: M1NarrativeResponses | null;
  cashbook: M1CashbookResponses | null;
  financialReport: M1FinancialReportResponses | null;
  bankReconciliation: M1BankReconciliationResponses | null;
  reportDate: string | null;
  m1PeriodStart: string | null;
  m1PeriodEnd: string | null;
}

export function M1PdfDocument(props: M1PdfDocumentProps) {
  const { enterprise: e, narrative, cashbook, financialReport, bankReconciliation, reportDate, m1PeriodStart, m1PeriodEnd } = props;
  const narrativeData = narrative ?? {};
  const cashbookData = cashbook ?? {};
  const frData = financialReport ?? {};
  const brData = bankReconciliation ?? {};
  const hasFR = (frData.items?.length ?? 0) > 0;
  const hasBR =
    brData.matching_grant_beneficiary_contribution !== undefined ||
    brData.total_grant_funds_from_sadp_pmu !== undefined ||
    brData.total_eligible_expenditure !== undefined ||
    brData.balance_per_bank_statement !== undefined;

  const metaLine = [
    m1PeriodStart && m1PeriodEnd
      ? `Reporting period: ${formatDateDMY(m1PeriodStart)} – ${formatDateDMY(m1PeriodEnd)}`
      : null,
    reportDate ? `Report date: ${formatDateDMY(reportDate)}` : null,
  ]
    .filter(Boolean)
    .join('   ·   ');

  return (
    <Document title={`M1 Report — ${e.beneficiary_short_name}`}>
      {/* Page 1 — Cover page (Annex V/A) reused verbatim */}
      <CoverPagePdfPage
        enterprise={e}
        districtName={props.districtName}
        resourceCenterName={props.resourceCenterName}
      />

      {/* Pages 2+ — II Narrative Progress Report */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.topRule}>Milestone 1 Progress Report</Text>
        <Text style={styles.partTitle}>II. NARRATIVE PROGRESS REPORT</Text>
        {metaLine && <Text style={styles.meta}>{metaLine}</Text>}

        {M1_NARRATIVE_SECTIONS.map((section) => {
          const body = (narrativeData[section.id] ?? '').trim();
          return (
            <View key={section.id} wrap={true}>
              <Text style={styles.sectionNumber}>
                {section.number} <Text style={styles.sectionTitle}>{section.title}</Text>
              </Text>
              {body ? (
                <Text style={styles.body}>{body}</Text>
              ) : (
                <Text style={styles.emptyBody}>— Not filled —</Text>
              )}
            </View>
          );
        })}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>

      {/* Cashbook page — only render if there's anything to show */}
      {(cashbookData.entries?.length ?? 0) > 0 && (
        <CashbookPage
          beneficiary={e.beneficiary_short_name}
          reportDate={reportDate}
          m1PeriodStart={m1PeriodStart}
          m1PeriodEnd={m1PeriodEnd}
          cashbook={cashbookData}
        />
      )}

      {/* Financial Report page — only render if at least one line item */}
      {hasFR && (
        <FinancialReportPage
          beneficiary={e.beneficiary_short_name}
          reportDate={reportDate}
          m1PeriodStart={m1PeriodStart}
          m1PeriodEnd={m1PeriodEnd}
          fr={frData}
        />
      )}

      {/* Bank Reconciliation page — render if any of the top fields filled */}
      {hasBR && (
        <BankReconciliationPage
          beneficiary={e.beneficiary_short_name}
          m1PeriodStart={m1PeriodStart}
          m1PeriodEnd={m1PeriodEnd}
          br={brData}
        />
      )}
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Cashbook page (landscape) — separate component so the props are explicit
// and the column header strip can use {fixed} to repeat on page breaks.
// ---------------------------------------------------------------------------
function CashbookPage({
  beneficiary,
  reportDate,
  m1PeriodStart,
  m1PeriodEnd,
  cashbook,
}: {
  beneficiary: string;
  reportDate: string | null;
  m1PeriodStart: string | null;
  m1PeriodEnd: string | null;
  cashbook: M1CashbookResponses;
}) {
  const opening = cashbook.opening_balance ?? 0;
  const entries: M1CashbookEntry[] = cashbook.entries ?? [];
  const balances = computeRunningBalances(entries, opening);
  const totals = computeCashbookTotals(entries, opening);
  const byCode = computeBudgetCodeSpend(entries);

  // Sort entries by date ascending for the printed view (matches the
  // running-balance computation order).
  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return 0;
  });

  const periodLine =
    m1PeriodStart && m1PeriodEnd
      ? `Period ${formatDateDMY(m1PeriodStart)} - ${formatDateDMY(m1PeriodEnd)}`
      : reportDate
        ? `Report date ${formatDateDMY(reportDate)}`
        : '';

  return (
    <Page size="A4" orientation="landscape" style={styles.cashPage}>
      <View style={styles.cashHeaderStrip} fixed>
        <Text style={styles.cashHeaderTitle}>M1 Cashbook — {beneficiary}</Text>
        <Text style={styles.cashHeaderMeta}>{periodLine}</Text>
      </View>

      <Text style={styles.cashSubtitle}>
        Single-entry cash ledger for the Milestone 1 period. Running Balance is computed
        from the Opening Balance + Σ Credits − Σ Debits sorted by date.
      </Text>

      <View style={styles.cashOpeningRow}>
        <Text>
          <Text style={styles.cashOpeningLabel}>Opening balance: </Text>
          M{formatM(opening)}
          {cashbook.opening_balance_date ? `   (as of ${formatDateDMY(cashbook.opening_balance_date)})` : ''}
        </Text>
        <Text>
          <Text style={styles.cashOpeningLabel}>Closing balance: </Text>
          M{formatM(totals.closingBalance)}
        </Text>
      </View>

      <View style={styles.cashTable}>
        {/* Repeating column header on every page */}
        <View style={styles.cashRow} fixed>
          {CASHBOOK_COLUMNS.map((c) => (
            <Text
              key={c.id}
              style={[
                styles.cashHeaderCell,
                { width: c.width },
                c.align === 'right' ? styles.cashCellRight : {},
              ]}
            >
              {c.label}
            </Text>
          ))}
        </View>

        {sorted.map((e, i) => {
          const balance = balances.get(e.id) ?? 0;
          const zebra = i % 2 === 1 ? styles.cashZebra : {};
          return (
            <View key={e.id} style={[styles.cashRow, zebra]} wrap={false}>
              <Text style={[styles.cashCell, { width: CASHBOOK_COLUMNS[0].width }]}>{formatDateDMY(e.date)}</Text>
              <Text style={[styles.cashCell, { width: CASHBOOK_COLUMNS[1].width }]}>{e.item}</Text>
              <Text style={[styles.cashCell, { width: CASHBOOK_COLUMNS[2].width }]}>{e.budget_code}</Text>
              <Text style={[styles.cashCell, { width: CASHBOOK_COLUMNS[3].width }]}>{e.supplier}</Text>
              <Text style={[styles.cashCell, { width: CASHBOOK_COLUMNS[4].width }]}>{e.description}</Text>
              <Text style={[styles.cashCell, styles.cashCellRight, { width: CASHBOOK_COLUMNS[5].width }]}>
                {e.credit ? formatM(e.credit) : ''}
              </Text>
              <Text style={[styles.cashCell, styles.cashCellRight, { width: CASHBOOK_COLUMNS[6].width }]}>
                {e.debit ? formatM(e.debit) : ''}
              </Text>
              <Text style={[styles.cashCell, styles.cashCellRight, { width: CASHBOOK_COLUMNS[7].width }]}>
                {formatM(balance)}
              </Text>
            </View>
          );
        })}

        {/* Totals row */}
        <View style={styles.cashTotalsRow}>
          <Text style={[styles.cashTotalsCell, { width: '70%', textAlign: 'right' }]}>Totals:</Text>
          <Text style={[styles.cashTotalsCell, styles.cashCellRight, { width: CASHBOOK_COLUMNS[5].width }]}>
            {formatM(totals.totalCredits)}
          </Text>
          <Text style={[styles.cashTotalsCell, styles.cashCellRight, { width: CASHBOOK_COLUMNS[6].width }]}>
            {formatM(totals.totalDebits)}
          </Text>
          <Text style={[styles.cashTotalsCell, styles.cashCellRight, { width: CASHBOOK_COLUMNS[7].width }]}>
            {formatM(totals.closingBalance)}
          </Text>
        </View>
      </View>

      {/* Per-budget-code spend breakdown */}
      {byCode.length > 0 && (
        <>
          <Text style={styles.cashByCodeTitle}>Spend by budget code</Text>
          {byCode.map((b) => (
            <View key={b.code} style={styles.cashByCodeRow}>
              <Text>{b.code}</Text>
              <Text>M{formatM(b.spent)}</Text>
            </View>
          ))}
        </>
      )}

      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        fixed
      />
    </Page>
  );
}

function formatM(n: number | undefined | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Financial Report page (landscape) — categorised line items with auto
// 20/20/60 source-of-funds split. Reuses computeFinancialSplit /
// computeFinancialDifference / computeFinancialTotals so the printed PDF
// can never disagree with the form's totals.
// ---------------------------------------------------------------------------
function FinancialReportPage({
  beneficiary,
  reportDate,
  m1PeriodStart,
  m1PeriodEnd,
  fr,
}: {
  beneficiary: string;
  reportDate: string | null;
  m1PeriodStart: string | null;
  m1PeriodEnd: string | null;
  fr: M1FinancialReportResponses;
}) {
  const items: M1FRLineItem[] = fr.items ?? [];
  const totals = computeFinancialTotals(items);

  // Group line items by category id, preserving the canonical order.
  const grouped = M1_FR_CATEGORIES.map((cat) => ({
    cat,
    rows: items.filter((it) => it.category === cat.id),
  }));

  const periodLine =
    fr.reporting_period_start && fr.reporting_period_end
      ? `${formatDateDMY(fr.reporting_period_start)} – ${formatDateDMY(fr.reporting_period_end)}`
      : m1PeriodStart && m1PeriodEnd
        ? `${formatDateDMY(m1PeriodStart)} – ${formatDateDMY(m1PeriodEnd)}`
        : '';

  return (
    <Page size="A4" orientation="landscape" style={styles.frPage}>
      <View style={styles.frHeaderStrip} fixed>
        <Text style={styles.frHeaderTitle}>Financial Report — {beneficiary}</Text>
        <Text style={styles.frHeaderMeta}>
          Reporting period: {periodLine || '—'}
          {fr.reporting_date || reportDate
            ? `   ·   Reporting date: ${formatDateDMY(fr.reporting_date ?? reportDate ?? '') || '—'}`
            : ''}
        </Text>
      </View>

      <View style={styles.frMetaGrid}>
        <Text style={styles.frMetaItem}>
          <Text style={{ fontWeight: 'bold' }}>Report number: </Text>
          {fr.report_number ?? '—'}
        </Text>
        <Text style={styles.frMetaItem}>
          <Text style={{ fontWeight: 'bold' }}>Remitting period: </Text>
          {fr.remitting_period ?? '—'}
        </Text>
      </View>

      <View style={styles.frTable}>
        <View style={styles.frRow} fixed>
          {M1_FR_COLUMNS.map((c) => (
            <Text
              key={c.id}
              style={[
                styles.frHeaderCell,
                { width: c.width },
                c.align === 'right' ? styles.frCellRight : {},
              ]}
            >
              {c.label}
            </Text>
          ))}
        </View>

        {grouped.map(({ cat, rows }) => {
          if (rows.length === 0) return null;
          return (
            <View key={cat.id}>
              <View wrap={false}>
                <Text style={styles.frGroupRow}>
                  {cat.id}.  {cat.label}
                </Text>
              </View>
              {rows.map((it) => {
                const split = computeFinancialSplit(it.incurred);
                const diff = computeFinancialDifference(it);
                return (
                  <View key={it.id} style={styles.frRow} wrap={false}>
                    <Text style={[styles.frCell, { width: '6%' }]}>{it.category}</Text>
                    <Text style={[styles.frCell, { width: '18%' }]}>{it.label || '—'}</Text>
                    <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
                      {formatM(it.total_planned)}
                    </Text>
                    <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
                      {formatM(it.incurred)}
                    </Text>
                    <Text style={[styles.frCell, { width: '9%' }]}>
                      {it.date_of_receipts ? formatDateDMY(it.date_of_receipts) : ''}
                    </Text>
                    <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
                      {formatM(split.beneficiary)}
                    </Text>
                    <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
                      {formatM(split.ifad)}
                    </Text>
                    <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
                      {formatM(split.grant_ida)}
                    </Text>
                    <Text style={[styles.frCell, styles.frCellRight, { width: '9%' }]}>
                      {formatM(diff)}
                    </Text>
                    <Text style={[styles.frCell, { width: '8%' }]}>{it.notes || ''}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Footer totals */}
        <View style={[styles.frRow, styles.frTotalRow]} wrap={false}>
          <Text style={[styles.frCell, { width: '24%' }]}>Total Costs</Text>
          <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
            {formatM(totals.totalPlanned)}
          </Text>
          <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
            {formatM(totals.totalIncurred)}
          </Text>
          <Text style={[styles.frCell, { width: '9%' }]} />
          <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
            {formatM(totals.beneficiary)}
          </Text>
          <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
            {formatM(totals.ifad)}
          </Text>
          <Text style={[styles.frCell, styles.frCellRight, { width: '10%' }]}>
            {formatM(totals.grant_ida)}
          </Text>
          <Text style={[styles.frCell, styles.frCellRight, { width: '9%' }]}>
            {formatM(totals.totalDifference)}
          </Text>
          <Text style={[styles.frCell, { width: '8%' }]} />
        </View>
      </View>

      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        fixed
      />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Bank Reconciliation page (portrait) — fixed-field form with live-computed
// totals. Mirrors the canonical "Reconciliation of Grant Bank Statement"
// printed layout exactly. Uses computeBRAll for every derived number.
// ---------------------------------------------------------------------------
function BankReconciliationPage({
  beneficiary,
  m1PeriodStart,
  m1PeriodEnd,
  br,
}: {
  beneficiary: string;
  m1PeriodStart: string | null;
  m1PeriodEnd: string | null;
  br: M1BankReconciliationResponses;
}) {
  const c = computeBRAll(br);
  const periodStart = br.period_start ?? m1PeriodStart;
  const periodEnd = br.period_end ?? m1PeriodEnd;
  const periodLine =
    periodStart && periodEnd
      ? `${formatDateDMY(periodStart)} to ${formatDateDMY(periodEnd)}`
      : '—';

  return (
    <Page size="A4" style={styles.brPage}>
      <Text style={styles.brTitle}>RECONCILIATION OF GRANT BANK STATEMENT</Text>

      <View style={styles.brHeaderRow}>
        <Text style={styles.brHeaderCell}>
          <Text style={{ fontWeight: 'bold' }}>Beneficiary: </Text>
          {beneficiary}
        </Text>
        <Text style={styles.brHeaderCell}>
          <Text style={{ fontWeight: 'bold' }}>Milestone: </Text>
          {br.milestone_number ?? 1}
          {'      '}
          <Text style={{ fontWeight: 'bold' }}>Period: </Text>
          {periodLine}
        </Text>
      </View>

      <View style={styles.brSection}>
        <Text style={styles.brSectionTitle}>Funds in vs. eligible expenditure</Text>
        <BRLine label="Matching grant beneficiary contribution" value={br.matching_grant_beneficiary_contribution} />
        <BRLine label="Total grant funds from SADP PMU" value={br.total_grant_funds_from_sadp_pmu} />
        <BRLine label="Subtotal" value={c.subtotal} computed bold />
        <BRLine label="Less: Total eligible expenditure for grant financing" value={br.total_eligible_expenditure} />
        <BRLine
          label="Net surplus / (deficit) of funds received from eligible expenditure"
          value={c.netSurplus}
          computed
          bold
        />
      </View>

      <View style={styles.brSection}>
        <Text style={styles.brSectionTitle}>
          Bank statement {br.amount_held_attached ? '(attached)' : ''}
        </Text>
        <BRLine label="Balance per bank statement" value={br.balance_per_bank_statement} />
        <BRLine label="Difference (balance − net surplus)" value={c.difference} computed bold />
      </View>

      <View style={styles.brSection}>
        <Text style={styles.brSectionTitle}>Explanation of difference</Text>
        <BRLine label="Opening balance" value={br.opening_balance} />
        <BRLine label="Own deposit" value={br.own_deposit} />
        <BRLine label="Interest received" value={br.interest_received} />
        <BRLine label="Total receipts" value={br.total_receipts} />
        <BRLine label="Less: Bank charges" value={br.bank_charges} />
        <BRLine label="Total explained differences" value={c.totalExplained} computed bold />
      </View>

      <View style={[styles.brUnexplainedBox, c.reconciled ? {} : styles.brUnexplainedBoxBad]}>
        <Text style={styles.brUnexplainedLabel}>
          Unexplained differences{' '}
          <Text style={{ fontWeight: 'normal', fontSize: 8 }}>(to be reimbursed to PMU)</Text>
        </Text>
        <Text style={styles.brUnexplainedValue}>M{formatM(c.unexplained)}</Text>
      </View>

      <View style={styles.brSig}>
        <View style={styles.brSigBox}>
          <View style={styles.brSigLine}>
            {br.project_leader_name ? (
              <Text style={{ fontSize: 9, fontStyle: 'italic' }}>{br.project_leader_name}</Text>
            ) : null}
          </View>
          <Text style={styles.brSigLabel}>Project Leader (Principal Applicant)</Text>
        </View>
        <View style={styles.brSigBox}>
          <View style={styles.brSigLine}>
            {br.project_leader_signed_date ? (
              <Text style={{ fontSize: 9, fontStyle: 'italic' }}>
                {formatDateDMY(br.project_leader_signed_date) || br.project_leader_signed_date}
              </Text>
            ) : null}
          </View>
          <Text style={styles.brSigLabel}>Date</Text>
        </View>
      </View>

      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        fixed
      />
    </Page>
  );
}

function BRLine({
  label,
  value,
  computed,
  bold,
}: {
  label: string;
  value: number | undefined | null;
  computed?: boolean;
  bold?: boolean;
}) {
  return (
    <View style={[styles.brLine, computed ? styles.brLineComputed : {}]}>
      <Text style={[styles.brLineLabel, bold ? styles.brLineBold : {}]}>{label}</Text>
      <Text style={[styles.brLineValue, bold ? styles.brLineBold : {}]}>
        M{formatM(value ?? 0)}
      </Text>
    </View>
  );
}
