/**
 * Combined Milestone 1 (M1) report PDF.
 *
 * Phase 1 scope: Cover page (reused from CoverPagePdfPage) + Narrative
 * Progress Report (7 sections from m1NarrativeSchema).
 *
 * Phase 2 will append: Cashbook, Financial Report, Bank Reconciliation.
 * Phase 3 will append: Supporting documents (embedded by reference) +
 * ESSF + EMMP + Inspection compendium.
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { CoverPagePdfPage } from '@/pdf/CoverPagePdf';
import { M1_NARRATIVE_SECTIONS, type M1NarrativeResponses } from '@/forms/m1NarrativeSchema';
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
});

interface M1PdfDocumentProps {
  enterprise: EnterpriseRow;
  districtName: string;
  resourceCenterName: string;
  narrative: M1NarrativeResponses | null;
  reportDate: string | null;
  m1PeriodStart: string | null;
  m1PeriodEnd: string | null;
}

export function M1PdfDocument(props: M1PdfDocumentProps) {
  const { enterprise: e, narrative, reportDate, m1PeriodStart, m1PeriodEnd } = props;
  const narrativeData = narrative ?? {};

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
    </Document>
  );
}
