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
});

interface M1PdfDocumentProps {
  enterprise: EnterpriseRow;
  districtName: string;
  resourceCenterName: string;
  narrative: M1NarrativeResponses | null;
  cashbook: M1CashbookResponses | null;
  reportDate: string | null;
  m1PeriodStart: string | null;
  m1PeriodEnd: string | null;
}

export function M1PdfDocument(props: M1PdfDocumentProps) {
  const { enterprise: e, narrative, cashbook, reportDate, m1PeriodStart, m1PeriodEnd } = props;
  const narrativeData = narrative ?? {};
  const cashbookData = cashbook ?? {};

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
