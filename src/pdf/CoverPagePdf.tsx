/**
 * Milestone 1 cover-page PDF — renders Annex V/A "I. PROJECT SUMMERY FORM"
 * as a single bordered paper-form table (matches the canonical printed
 * format provided 2026-05-25), hydrated from an `enterprises` row.
 *
 * Field mapping documented in reference_documents/Annex_VA_Cover_Page_fields.md.
 *
 * Pre-condition (enforced upstream by `isCoverPageReady`):
 *   - project_title, registration_number, period_start, period_end,
 *     total_project_cost_lsl, total_grant_lsl, principal_applicant_name,
 *     community_council_id, resource_center_id all present.
 *
 * Currency: LSL prefix + space thousand separator (e.g. "LSL 500 000.00").
 * Dates: dd/mm/yyyy.
 */
import { Document, Page, StyleSheet, Text, View, Image } from '@react-pdf/renderer';
import type { EnterpriseRow } from '@/types/database';
import { formatDateDMY, formatLSLCoverPage } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Layout — single bordered table mimicking the paper-form sample. Every cell
// has visible borders; the table border is built up cell-by-cell using
// borderRight + borderBottom (with the outer-most cells adding the missing
// edges). All column widths are %.
// ---------------------------------------------------------------------------

const BORDER = '0.75pt solid #000';
const LABEL_W = '24%';   // left column — field label
const HINT = { fontSize: 9, fontStyle: 'italic' as const };
const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.35,
  },

  // Header above the table
  headerLine1: {
    fontSize: 12,
    fontStyle: 'italic',
    textDecoration: 'underline',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerLine2: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 18,
  },

  // The single big bordered table
  table: {
    borderTop: BORDER,
    borderLeft: BORDER,
  },
  row: { flexDirection: 'row' },
  // Title cell — "I.PROJECT SUMMERY FORM" spanning the full width
  titleCell: {
    flex: 1,
    padding: 8,
    paddingLeft: 14,
    borderRight: BORDER,
    borderBottom: BORDER,
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Label cell (left column)
  labelCell: {
    width: LABEL_W,
    padding: 6,
    borderRight: BORDER,
    borderBottom: BORDER,
    fontWeight: 'bold',
  },
  // Value cell — fills the rest of the row
  valueCell: {
    flex: 1,
    padding: 6,
    borderRight: BORDER,
    borderBottom: BORDER,
  },
  // A value-area that itself contains a nested column layout (used for the
  // District/Location pair and the Total Grant / Current Grant Payment pair).
  splitValue: {
    flex: 1,
    flexDirection: 'row',
    borderRight: BORDER,
    borderBottom: BORDER,
  },
  // Inside splitValue: the "wide" sub-label (e.g. "(as in the contract)" with
  // the actual value below it).
  splitMain: {
    width: '40%',
    padding: 6,
    borderRight: BORDER,
    flexDirection: 'column',
  },
  splitRight: {
    flex: 1,
    flexDirection: 'column',
  },
  splitRightRow: {
    flexDirection: 'row',
    borderBottom: BORDER,
    flex: 1,
  },
  splitRightRowLast: {
    flexDirection: 'row',
    flex: 1,
  },
  splitRightLabel: {
    width: '40%',
    padding: 6,
    borderRight: BORDER,
    fontWeight: 'bold',
  },
  splitRightValue: {
    flex: 1,
    padding: 6,
  },
  // The "(ONLY FOR OFFICE USE)" centered banner row
  officeBannerCell: {
    flex: 1,
    padding: 5,
    borderRight: BORDER,
    borderBottom: BORDER,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  // Generic last-row variants drop the bottom border (the table's own border
  // closes it). We rely on each row carrying borderBottom — the FIRST row of
  // the table is the title, the LAST row is "Name and Signature of CGP
  // Officer". Easier to just keep borderBottom on every row.

  // Inline cursive name (rendered with Helvetica-Oblique). Approximates a
  // handwritten signature when the user hasn't uploaded an image.
  signatureText: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 13,
    marginBottom: 6,
  },
  signatureImg: {
    width: 90,
    height: 28,
    objectFit: 'contain',
    marginBottom: 4,
  },
  dateLine: { fontSize: 10, marginTop: 2 },

  // Small wrappers
  hint: HINT,
  valueText: { marginTop: 2 },
});

interface Props {
  enterprise: EnterpriseRow;
  districtName: string;
  resourceCenterName: string;
}

export function CoverPagePdfDocument(props: Props) {
  const { enterprise: e } = props;
  return (
    <Document title={`Cover page — ${e.beneficiary_short_name}`}>
      <CoverPagePdfPage {...props} />
    </Document>
  );
}

/**
 * Just the cover-page <Page>, without the Document wrapper. Lets M1Pdf
 * embed the same cover content as its first page without duplicating
 * the layout.
 */
export function CoverPagePdfPage({ enterprise: e, districtName, resourceCenterName }: Props) {
  const locationLine = [e.location_detail, resourceCenterName].filter(Boolean).join(' — ');
  const periodLine = `${formatDateDMY(e.period_start)}-${formatDateDMY(e.period_end)}`;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.headerLine1}>Annex V/A: Applicant&apos;s Progress report Forms</Text>
      <Text style={styles.headerLine2}>(Cover Page)</Text>

      <View style={styles.table}>
        {/* ---------- Title row ---------- */}
        <View style={styles.row}>
          <Text style={styles.titleCell}>I.PROJECT SUMMERY FORM</Text>
        </View>

        {/* ---------- Project Title ---------- */}
        <View style={styles.row}>
          <Text style={styles.labelCell}>Project Title:</Text>
          <View style={styles.valueCell}>
            <Text style={styles.hint}>(as in the contract)</Text>
            <Text style={[styles.valueText, { fontWeight: 'bold' }]}>{e.project_title ?? ''}</Text>
          </View>
        </View>

        {/* ---------- Project Registration Number | District / Location ---------- */}
        <View style={styles.row}>
          <Text style={styles.labelCell}>Project Registration{'\n'}Number:</Text>
          <View style={styles.splitValue}>
            <View style={styles.splitMain}>
              <Text style={styles.hint}>(as in the contract)</Text>
              <Text style={[styles.valueText, { fontWeight: 'bold' }]}>{e.registration_number ?? ''}</Text>
            </View>
            <View style={styles.splitRight}>
              <View style={styles.splitRightRow}>
                <Text style={styles.splitRightLabel}>District</Text>
                <Text style={[styles.splitRightValue, { fontWeight: 'bold' }]}>{districtName}</Text>
              </View>
              <View style={styles.splitRightRowLast}>
                <Text style={styles.splitRightLabel}>Location</Text>
                <Text style={[styles.splitRightValue, { fontWeight: 'bold' }]}>{locationLine}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ---------- Period covered by the Report ---------- */}
        <View style={styles.row}>
          <Text style={styles.labelCell}>Period covered by the{'\n'}Report:</Text>
          <View style={styles.valueCell}>
            <Text style={styles.hint}>(d/mm/yy-dd/mm/yy)</Text>
            <Text style={styles.valueText}>{periodLine}</Text>
          </View>
        </View>

        {/* ---------- Total Project Cost | Total Grant / Current Grant Payment ---------- */}
        <View style={styles.row}>
          <Text style={styles.labelCell}>Total Project Cost:</Text>
          <View style={styles.splitValue}>
            <View style={styles.splitMain}>
              <Text style={styles.hint}>(as in the contract)</Text>
              <Text style={[styles.valueText, { fontWeight: 'bold', marginTop: 6 }]}>
                {formatLSLCoverPage(e.total_project_cost_lsl)}
              </Text>
            </View>
            <View style={styles.splitRight}>
              <View style={styles.splitRightRow}>
                <Text style={styles.splitRightLabel}>Total Grant:</Text>
                <Text style={[styles.splitRightValue, { fontWeight: 'bold' }]}>
                  {formatLSLCoverPage(e.total_grant_lsl)}
                </Text>
              </View>
              <View style={styles.splitRightRowLast}>
                <Text style={styles.splitRightLabel}>Current Grant Payment:</Text>
                <Text style={[styles.splitRightValue, { fontWeight: 'bold' }]}>
                  {formatLSLCoverPage(e.current_grant_payment_lsl)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ---------- Applicant Organisation ---------- */}
        <View style={styles.row}>
          <Text style={styles.labelCell}>Applicant{'\n'}Organisation:</Text>
          <Text style={[styles.valueCell, { fontWeight: 'bold' }]}>{e.applicant_organisation_name ?? ''}</Text>
        </View>

        {/* ---------- Principal Applicant | Service Provider ---------- */}
        <View style={styles.row}>
          <Text style={styles.labelCell}>Principal Applicant:</Text>
          <Text style={[styles.valueCell, { fontWeight: 'bold' }]}>{(e.principal_applicant_name ?? '').toUpperCase()}</Text>
          <Text style={[styles.labelCell, { width: '20%' }]}>Service Provider:</Text>
          <Text style={[styles.valueCell, { fontWeight: 'bold' }]}>{(e.service_provider_name ?? '').toUpperCase()}</Text>
        </View>

        {/* ---------- Signatures row ---------- */}
        <View style={styles.row}>
          <Text style={styles.labelCell}>Signature of Principal{'\n'}Applicants:</Text>
          <View style={styles.valueCell}>
            {e.principal_applicant_signature_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={e.principal_applicant_signature_url} style={styles.signatureImg} />
            ) : (
              <Text style={styles.signatureText}>{cursiveSignature(e.principal_applicant_name)}</Text>
            )}
          </View>
          <Text style={[styles.labelCell, { width: '20%' }]}>Signature of Service{'\n'}Provider:</Text>
          <View style={styles.valueCell}>
            {e.service_provider_signature_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={e.service_provider_signature_url} style={styles.signatureImg} />
            ) : (
              <Text style={styles.signatureText}>{cursiveSignature(e.service_provider_name)}</Text>
            )}
          </View>
        </View>

        {/* ---------- Dates row ---------- */}
        <View style={styles.row}>
          <Text style={styles.labelCell}>
            Date:{e.principal_applicant_signed_date ? formatDateDMY(e.principal_applicant_signed_date) : ''}
          </Text>
          <View style={styles.valueCell}><Text> </Text></View>
          <Text style={[styles.labelCell, { width: '20%' }]}>
            Date:{e.service_provider_signed_date ? formatDateDMY(e.service_provider_signed_date) : ''}
          </Text>
          <View style={styles.valueCell}><Text> </Text></View>
        </View>

        {/* ---------- (ONLY FOR OFFICE USE) banner ---------- */}
        <View style={styles.row}>
          <Text style={styles.officeBannerCell}>( ONLY FOR OFFICE USE)</Text>
        </View>

        {/* ---------- Received by CGP Secretariat ---------- */}
        <View style={styles.row}>
          <Text style={[styles.labelCell, { width: '40%' }]}>
            Received by the CGP Secretariat on date:
          </Text>
          <View style={styles.valueCell}>
            <Text style={styles.hint}>(dd/mm/yy)</Text>
            <Text style={styles.valueText}>{formatDateDMY(e.cgp_received_date)}</Text>
          </View>
        </View>

        {/* ---------- Name and Signature of CGP Officer ---------- */}
        <View style={styles.row}>
          <Text style={[styles.labelCell, { width: '40%' }]}>Name and Signature of CGP Officer:</Text>
          <View style={styles.valueCell}>
            <Text>{e.cgp_officer_name ?? ''}</Text>
            {e.cgp_officer_signature_url && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={e.cgp_officer_signature_url} style={styles.signatureImg} />
            )}
          </View>
        </View>
      </View>
    </Page>
  );
}

/**
 * Approximate a hand-written signature when no image is uploaded.
 * Renders the person's first initial + last name in italic Helvetica
 * (e.g. "L. Ramone" for "Lebohang Ramone"). Matches the printed sample.
 */
function cursiveSignature(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first.charAt(0).toUpperCase()}. ${last}`;
}
