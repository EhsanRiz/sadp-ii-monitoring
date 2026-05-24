/**
 * Full ESMP report PDF — combines (1) cover page, (2) ESSF sections 1-3
 * (Site Sensitivity, Completeness, Environmental & Social Checklist) and (3)
 * the type-specific EMMP table in landscape, with a header strip that
 * repeats on every EMMP page.
 *
 * Format mirrors the canonical scanned/Word template (sample: Thaba Lifika
 * ESMP, 23 Sep 2025) so an approved app-generated ESMP can be filed
 * interchangeably with paper submissions.
 *
 * Pre-conditions enforced upstream (EsmpPdfRoute):
 *   - essf_submissions row exists with status='approved'
 *   - emmp_submissions row exists with status='approved' (or the enterprise
 *     type has no template, in which case we show a placeholder note)
 */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  ESSF_SITE_SENSITIVITY,
  ESSF_COMPLETENESS,
  ESSF_CHECKLIST,
  type EssfResponses,
} from '@/forms/essfSchema';
import type { EmmpSchema } from '@/components/forms/EmmpFormRenderer';
import type { EnterpriseRow } from '@/types/database';
import { formatDateDMY } from '@/lib/utils';

const COLORS = {
  border: '#999',
  borderLight: '#bbb',
  headerBg: '#eaeaea',
  headerBgDark: '#2b2b2b',
  brandGreen: '#006838',
  zebra: '#f6f6f6',
  muted: '#666',
};

const styles = StyleSheet.create({
  // ----- shared -----
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    lineHeight: 1.35,
  },
  pageLandscape: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: 'Helvetica',
    lineHeight: 1.3,
  },
  topRule: {
    fontSize: 8,
    color: COLORS.muted,
    borderBottom: `1pt solid ${COLORS.borderLight}`,
    paddingBottom: 4,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 16,
    right: 36,
    fontSize: 8,
    color: COLORS.muted,
  },
  // ----- cover -----
  kingdomTitle: { fontSize: 11, textAlign: 'center', marginTop: 18 },
  formTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  formForLine: { fontSize: 10, textAlign: 'center' },
  formSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 24,
  },
  coverKv: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  coverKvLabel: { width: '40%', fontWeight: 'bold' },
  coverKvValue: { width: '60%' },
  // ----- ESSF sections -----
  sectionH1: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 6,
  },
  sectionIntro: {
    fontSize: 9,
    color: '#222',
    marginBottom: 8,
    lineHeight: 1.5,
  },
  // Section 1 table — site sensitivity
  s1Table: { borderTop: `0.5pt solid ${COLORS.border}`, borderLeft: `0.5pt solid ${COLORS.border}` },
  s1Row: { flexDirection: 'row' },
  s1HeaderCell: {
    backgroundColor: COLORS.headerBg,
    fontWeight: 'bold',
    padding: 4,
    borderRight: `0.5pt solid ${COLORS.border}`,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontSize: 8,
  },
  s1Cell: {
    padding: 4,
    borderRight: `0.5pt solid ${COLORS.border}`,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontSize: 8,
  },
  s1ColIssue: { width: '20%' },
  s1ColRating: { width: '23%' },
  s1ColSelected: { width: '11%', textAlign: 'center', fontWeight: 'bold' },
  // Section 2 / 3 question tables
  qTable: { borderTop: `0.5pt solid ${COLORS.border}`, borderLeft: `0.5pt solid ${COLORS.border}` },
  qRow: { flexDirection: 'row' },
  qHeader: {
    backgroundColor: COLORS.headerBg,
    fontWeight: 'bold',
    padding: 4,
    borderRight: `0.5pt solid ${COLORS.border}`,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontSize: 8,
  },
  qCell: {
    padding: 4,
    borderRight: `0.5pt solid ${COLORS.border}`,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontSize: 8,
  },
  qNum: { width: '6%', textAlign: 'center' },
  qItem: { width: '64%' },
  qYN: { width: '7%', textAlign: 'center' },
  qNA: { width: '8%', textAlign: 'center' },
  qGuide: { width: '23%', fontStyle: 'italic', color: '#333' },
  // 24-q checklist
  groupHeader: {
    flexDirection: 'row',
    backgroundColor: '#d9d9d9',
    padding: 5,
    borderRight: `0.5pt solid ${COLORS.border}`,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontWeight: 'bold',
    fontSize: 8.5,
  },
  groupFooter: {
    padding: 5,
    borderRight: `0.5pt solid ${COLORS.border}`,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontStyle: 'italic',
    fontSize: 7.5,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  // ----- EMMP landscape -----
  emmpHeaderStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1pt solid ${COLORS.brandGreen}`,
    paddingBottom: 4,
    marginBottom: 6,
  },
  emmpHeaderTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.brandGreen,
  },
  emmpHeaderMeta: {
    fontSize: 7.5,
    color: COLORS.muted,
  },
  emmpTable: {
    borderTop: `0.5pt solid ${COLORS.border}`,
    borderLeft: `0.5pt solid ${COLORS.border}`,
  },
  emmpRow: { flexDirection: 'row' },
  emmpColPhase:      { width: '12%' },
  emmpColImpacts:    { width: '17%' },
  emmpColMitigations:{ width: '23%' },
  emmpColMonitoring: { width: '17%' },
  emmpColPerson1:    { width: '11%' },
  emmpColPerson2:    { width: '11%' },
  emmpColTimeframe:  { width: '9%' },
  emmpHeaderCell: {
    backgroundColor: COLORS.headerBgDark,
    color: 'white',
    fontWeight: 'bold',
    padding: 4,
    borderRight: `0.5pt solid ${COLORS.border}`,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontSize: 7,
    textTransform: 'uppercase',
  },
  emmpPhaseHeader: {
    backgroundColor: '#dceedb',
    color: '#003d20',
    fontWeight: 'bold',
    padding: 6,
    borderRight: `0.5pt solid ${COLORS.border}`,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontSize: 9,
  },
  emmpCell: {
    padding: 4,
    borderRight: `0.5pt solid ${COLORS.border}`,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontSize: 7.5,
  },
  emmpItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  emmpItemMark: {
    width: 9,
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.brandGreen,
  },
  emmpItemLabel: {
    flex: 1,
    fontSize: 7.5,
  },
  // empty-state for missing forms
  emptyNote: {
    padding: 18,
    backgroundColor: '#fafafa',
    border: `0.5pt solid ${COLORS.borderLight}`,
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 8,
  },
});

interface EsmpPdfDocumentProps {
  enterprise: EnterpriseRow;
  districtName: string;
  enterpriseTypeName: string;
  essf: EssfResponses | null;
  essfApprovedAt: string | null;
  emmpTemplate: EmmpSchema | null;
  emmpTemplateVersion: string | null;
  emmpResponses: Record<string, unknown> | null;
  emmpApprovedAt: string | null;
  /** Caller supplies a date string — usually the latest of essfApprovedAt / today. */
  reportDate: string;
}

export function EsmpPdfDocument(props: EsmpPdfDocumentProps) {
  const {
    enterprise: e,
    districtName,
    enterpriseTypeName,
    essf,
    emmpTemplate,
    emmpTemplateVersion,
    emmpResponses,
    reportDate,
  } = props;

  const header = essf?.header ?? {};
  // Cover-page field fallbacks pull from the enterprise row when ESSF header is blank.
  const subProjectRep = header.sub_project_representative || e.principal_applicant_name || '—';
  const subProjectName = header.sub_project_name || e.applicant_organisation_name || e.beneficiary_short_name;
  const subProjectAddress = header.sub_project_address || e.location_detail || '—';
  const extRep = header.extension_team_representative || '—';
  const extAddress = header.extension_team_address || '—';

  const emmpTitleLine = emmpTemplate
    ? `ESMP – ${enterpriseTypeName.toUpperCase()}${emmpTemplateVersion ? ` (${emmpTemplateVersion})` : ''}`
    : `ESMP – ${enterpriseTypeName.toUpperCase()}`;
  const emmpHeaderDate = formatDateDMY(reportDate) || reportDate;

  return (
    <Document title={`ESMP — ${e.beneficiary_short_name}`}>
      {/* ============================ Cover page ============================ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.topRule}>Environmental and Social Screening Form</Text>

        <Text style={styles.kingdomTitle}>THE KINGDOM OF LESOTHO</Text>
        <Text style={styles.formTitle}>ENVIRONMENTAL AND SOCIAL SCREENING FORM</Text>
        <Text style={styles.formForLine}>FOR</Text>
        <Text style={styles.formSubtitle}>
          SCREENING OF POTENTIAL ENVIRONMENTAL AND SOCIAL IMPACTS OF{'\n'}
          THE SMALLHOLDER AGRICULTURAL DEVELOPMENT PROJECT
        </Text>

        <View style={styles.coverKv}>
          <Text style={styles.coverKvLabel}>District:</Text>
          <Text style={styles.coverKvValue}>{districtName}</Text>
        </View>
        <View style={styles.coverKv}>
          <Text style={styles.coverKvLabel}>Round of Funding:</Text>
          <Text style={styles.coverKvValue}>{e.round_id}</Text>
        </View>
        <View style={styles.coverKv}>
          <Text style={styles.coverKvLabel}>Date:</Text>
          <Text style={styles.coverKvValue}>{formatDateDMY(reportDate) || reportDate}</Text>
        </View>

        <View style={{ height: 14 }} />

        <View style={styles.coverKv}>
          <Text style={styles.coverKvLabel}>Name of Sub-project Representative:</Text>
          <Text style={styles.coverKvValue}>{subProjectRep}</Text>
        </View>
        <View style={styles.coverKv}>
          <Text style={styles.coverKvLabel}>Sub-project Name:</Text>
          <Text style={styles.coverKvValue}>{subProjectName}</Text>
        </View>
        <View style={styles.coverKv}>
          <Text style={styles.coverKvLabel}>Sub-project Address:</Text>
          <Text style={styles.coverKvValue}>{subProjectAddress}{'\n'}{districtName}</Text>
        </View>

        <View style={{ height: 14 }} />

        <View style={styles.coverKv}>
          <Text style={styles.coverKvLabel}>Name of Extension Team Representative:</Text>
          <Text style={styles.coverKvValue}>{extRep}</Text>
        </View>
        <View style={styles.coverKv}>
          <Text style={styles.coverKvLabel}>Address:</Text>
          <Text style={styles.coverKvValue}>{extAddress}{'\n'}{districtName}</Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page | ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>

      {/* ============================ ESSF Section 1.0 ============================ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.topRule}>Environmental and Social Screening Form</Text>
        <Text style={styles.sectionH1}>1.0  SITE SELECTION:</Text>
        <Text style={styles.sectionIntro}>
          When considering the location of a sub-project, rate the sensitivity of the
          proposed site in the following table according to the given criteria. Higher
          ratings do not necessarily mean that a site is unsuitable. They do indicate a
          real risk of causing undesirable adverse environmental and social effects, and
          that more substantial environmental and/or social planning may be required to
          adequately avoid, mitigate or manage potential effects.
        </Text>

        <Text style={{ fontSize: 8.5, fontWeight: 'bold', textAlign: 'center', marginBottom: 3 }}>
          Site Sensitivity
        </Text>

        <View style={styles.s1Table}>
          <View style={styles.s1Row}>
            <Text style={[styles.s1HeaderCell, styles.s1ColIssue]}>Issues</Text>
            <Text style={[styles.s1HeaderCell, styles.s1ColRating]}>Low</Text>
            <Text style={[styles.s1HeaderCell, styles.s1ColRating]}>Medium</Text>
            <Text style={[styles.s1HeaderCell, styles.s1ColRating]}>High</Text>
            <Text style={[styles.s1HeaderCell, styles.s1ColSelected]}>Rating</Text>
          </View>
          {ESSF_SITE_SENSITIVITY.issues.map((issue) => {
            const selected = essf?.site_sensitivity?.[issue.id];
            return (
              <View key={issue.id} style={styles.s1Row} wrap={false}>
                <Text style={[styles.s1Cell, styles.s1ColIssue, { fontWeight: 'bold' }]}>
                  {issue.label}
                </Text>
                <Text style={[styles.s1Cell, styles.s1ColRating, selected === 'low' ? cellSelected : {}]}>
                  {issue.descriptors.low}
                </Text>
                <Text style={[styles.s1Cell, styles.s1ColRating, selected === 'medium' ? cellSelected : {}]}>
                  {issue.descriptors.medium}
                </Text>
                <Text style={[styles.s1Cell, styles.s1ColRating, selected === 'high' ? cellSelected : {}]}>
                  {issue.descriptors.high}
                </Text>
                <Text style={[styles.s1Cell, styles.s1ColSelected]}>
                  {selected ? cap(selected) : '—'}
                </Text>
              </View>
            );
          })}
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page | ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>

      {/* ============================ ESSF Section 2.0 ============================ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.topRule}>Environmental and Social Screening Form</Text>
        <Text style={styles.sectionH1}>2.0  COMPLETENESS OF SUB-PROJECTS APPLICATION:</Text>
        <Text style={styles.sectionIntro}>
          Does the sub-project application document contain, as appropriate, the following information?
        </Text>

        <View style={styles.qTable}>
          <View style={styles.qRow}>
            <Text style={[styles.qHeader, { width: '70%' }]}>Item</Text>
            <Text style={[styles.qHeader, styles.qYN]}>Yes</Text>
            <Text style={[styles.qHeader, styles.qYN]}>No</Text>
            <Text style={[styles.qHeader, styles.qNA, { width: '16%' }]}>N/A</Text>
          </View>
          {ESSF_COMPLETENESS.questions.map((q) => {
            const v = essf?.completeness?.[q.id];
            return (
              <View key={q.id} style={styles.qRow} wrap={false}>
                <Text style={[styles.qCell, { width: '70%' }]}>{q.label}</Text>
                <Text style={[styles.qCell, styles.qYN]}>{v === 'yes' ? '✓' : ''}</Text>
                <Text style={[styles.qCell, styles.qYN]}>{v === 'no' ? '✓' : ''}</Text>
                <Text style={[styles.qCell, styles.qNA, { width: '16%' }]}>{v === 'n_a' ? '✓' : ''}</Text>
              </View>
            );
          })}
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page | ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>

      {/* ============================ ESSF Section 3.0 ============================ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.topRule}>Environmental and Social Screening Form</Text>
        <Text style={styles.sectionH1}>3.0  ENVIRONMENTAL AND SOCIAL CHECKLIST</Text>

        <View style={styles.qTable}>
          <View style={styles.qRow}>
            <Text style={[styles.qHeader, styles.qNum]}>#</Text>
            <Text style={[styles.qHeader, styles.qItem]}>Will the sub-project:</Text>
            <Text style={[styles.qHeader, styles.qYN]}>Yes</Text>
            <Text style={[styles.qHeader, styles.qYN]}>No</Text>
            <Text style={[styles.qHeader, styles.qGuide]}>ESMF Guidance</Text>
          </View>
          {ESSF_CHECKLIST.groups.map((group) => {
            const rows: React.ReactNode[] = [];
            // Group header row spanning all columns
            rows.push(
              <View key={`g-${group.id}`} style={styles.groupHeader} wrap={false}>
                <Text>{group.id}.  {group.title}</Text>
              </View>,
            );
            group.questions.forEach((q, i) => {
              const v = essf?.checklist?.[q.id];
              const guidance = (q as { guidance?: string }).guidance ?? '';
              rows.push(
                <View key={q.id} style={styles.qRow} wrap={false}>
                  <Text style={[styles.qCell, styles.qNum]}>{i + 1}</Text>
                  <Text style={[styles.qCell, styles.qItem]}>{q.label}</Text>
                  <Text style={[styles.qCell, styles.qYN]}>{v === 'yes' ? '✓' : ''}</Text>
                  <Text style={[styles.qCell, styles.qYN]}>{v === 'no' ? '✓' : ''}</Text>
                  <Text style={[styles.qCell, styles.qGuide]}>{guidance}</Text>
                </View>,
              );
            });
            rows.push(
              <View key={`f-${group.id}`} style={styles.groupFooter} wrap={false}>
                <Text>{group.footer}</Text>
              </View>,
            );
            return rows;
          })}
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page | ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>

      {/* ============================ EMMP (landscape) ============================ */}
      <Page size="A4" orientation="landscape" style={styles.pageLandscape}>
        {/* Repeats on every EMMP page via fixed prop */}
        <View style={styles.emmpHeaderStrip} fixed>
          <Text style={styles.emmpHeaderTitle}>{emmpTitleLine}</Text>
          <Text style={styles.emmpHeaderMeta}>{emmpHeaderDate}</Text>
        </View>

        <Text style={{ fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
          {enterpriseTypeName.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 }}>
          ENVIRONMENTAL MANAGEMENT AND MONITORING PLAN
        </Text>
        <Text style={{ fontSize: 7.5, fontStyle: 'italic', textAlign: 'center', marginBottom: 8, color: COLORS.muted }}>
          (Instructions: Check applicable box/es & input specs on space provided. Attach supplementary information where deemed necessary)
        </Text>

        {/* Cover info strip */}
        <View style={{ flexDirection: 'row', marginBottom: 8, fontSize: 8.5 }}>
          <Text style={{ width: '50%' }}>
            <Text style={{ fontWeight: 'bold' }}>Sub-project Name:</Text> {subProjectName}
          </Text>
          <Text style={{ width: '25%' }}>
            <Text style={{ fontWeight: 'bold' }}>District:</Text> {districtName}
          </Text>
          <Text style={{ width: '25%' }}>
            <Text style={{ fontWeight: 'bold' }}>Date:</Text> {emmpHeaderDate}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 10, fontSize: 8.5 }}>
          <Text>
            <Text style={{ fontWeight: 'bold' }}>Round of Funding:</Text> {e.round_id}
          </Text>
        </View>

        {emmpTemplate ? (
          <View style={styles.emmpTable}>
            {/* Repeating column header on every page */}
            <View style={styles.emmpRow} fixed>
              <Text style={[styles.emmpHeaderCell, styles.emmpColPhase]}>Project Phase / Activities</Text>
              <Text style={[styles.emmpHeaderCell, styles.emmpColImpacts]}>Possible Environmental Impacts</Text>
              <Text style={[styles.emmpHeaderCell, styles.emmpColMitigations]}>Mitigating Measures</Text>
              <Text style={[styles.emmpHeaderCell, styles.emmpColMonitoring]}>Monitoring Parameters</Text>
              <Text style={[styles.emmpHeaderCell, styles.emmpColPerson1]}>Person Responsible to Implement</Text>
              <Text style={[styles.emmpHeaderCell, styles.emmpColPerson2]}>Person Responsible for Monitoring</Text>
              <Text style={[styles.emmpHeaderCell, styles.emmpColTimeframe]}>Time Frame</Text>
            </View>

            {emmpTemplate.sections.map((section) => (
              <View key={section.id}>
                {/* Phase header row */}
                <View wrap={false}>
                  <Text style={styles.emmpPhaseHeader}>{section.title}</Text>
                </View>
                {section.rows.map((row, idx) => {
                  const r = emmpResponses ?? {};
                  const impactList = renderItems(row.impacts, row.id, 'i', r);
                  const mitigList = renderItems(row.mitigations, row.id, 'm', r);
                  const monList = renderItems(row.monitoring, row.id, 'n', r);
                  const personImpl =
                    (r[`${row.id}.person_implement`] as string | undefined) ??
                    row.default_person_implement ??
                    '';
                  const personMon =
                    (r[`${row.id}.person_monitor`] as string | undefined) ??
                    row.default_person_monitor ??
                    '';
                  const timeframe =
                    (r[`${row.id}.timeframe`] as string | undefined) ??
                    row.default_timeframe ??
                    '';
                  const zebra = idx % 2 === 1 ? { backgroundColor: COLORS.zebra } : {};
                  return (
                    <View key={row.id} style={[styles.emmpRow, zebra]} wrap={false}>
                      <Text style={[styles.emmpCell, styles.emmpColPhase, { fontWeight: 'bold' }]}>
                        {row.activity}
                      </Text>
                      <View style={[styles.emmpCell, styles.emmpColImpacts]}>{impactList}</View>
                      <View style={[styles.emmpCell, styles.emmpColMitigations]}>{mitigList}</View>
                      <View style={[styles.emmpCell, styles.emmpColMonitoring]}>{monList}</View>
                      <Text style={[styles.emmpCell, styles.emmpColPerson1]}>{personImpl}</Text>
                      <Text style={[styles.emmpCell, styles.emmpColPerson2]}>{personMon}</Text>
                      <Text style={[styles.emmpCell, styles.emmpColTimeframe]}>{timeframe}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyNote}>
            No in-app EMMP template is available for this enterprise type yet. The legacy
            scanned EMMP on file should be filed alongside this ESSF.
          </Text>
        )}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page | ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

// --------------------------- helpers ---------------------------
const cellSelected = {
  backgroundColor: '#dceedb',
  fontWeight: 'bold' as const,
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Render impact / mitigation / monitoring items with a ✓ in front of selected
 * ones, dash for the rest. Matches the "M ..." style from the canonical doc.
 */
function renderItems(
  items: Array<{ id: string; label: string }>,
  rowId: string,
  prefix: 'i' | 'm' | 'n',
  responses: Record<string, unknown>,
): React.ReactNode {
  if (!items || items.length === 0) {
    return <Text style={{ fontStyle: 'italic', color: '#999', fontSize: 7 }}>—</Text>;
  }
  return items.map((item, i) => {
    const key = `${rowId}.${prefix}${i}`;
    const checked = responses[key] === true;
    return (
      <View key={item.id} style={styles.emmpItemRow}>
        <Text style={styles.emmpItemMark}>{checked ? '✓' : '·'}</Text>
        <Text style={[styles.emmpItemLabel, checked ? { fontWeight: 'bold' } : { color: '#333' }]}>
          {item.label}
        </Text>
      </View>
    );
  });
}
