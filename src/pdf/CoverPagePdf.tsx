/**
 * Milestone 1 cover-page PDF — renders Annex V/A "I. PROJECT SUMMERY FORM"
 * exactly as field staff fill it on paper, hydrated from an `enterprises` row.
 *
 * Field mapping documented in reference_documents/Annex_VA_Cover_Page_fields.md.
 *
 * Pre-condition (enforced upstream by `isCoverPageReady`):
 *   - project_title, registration_number, period_start, period_end,
 *     total_project_cost_lsl, total_grant_lsl, principal_applicant_name,
 *     community_council_id, resource_center_id all present.
 *
 * Currency format: M{:,.2f}. Dates: dd/mm/yyyy.
 */
import { Document, Page, StyleSheet, Text, View, Image } from '@react-pdf/renderer';
import type { EnterpriseRow } from '@/types/database';
import { formatDateDMY, formatLSL } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  annexLabel: { fontSize: 9, fontStyle: 'italic', textAlign: 'right', marginBottom: 6 },
  title: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  subtitle: { fontSize: 10, textAlign: 'center', marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#eaeaea',
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1pt solid #999',
    paddingVertical: 4,
  },
  rowLabel: { width: '40%', fontWeight: 'bold' },
  rowValue: { width: '60%' },
  annotation: { fontStyle: 'italic', fontSize: 8, color: '#555' },
  sigGrid: { flexDirection: 'row', marginTop: 12, gap: 16 },
  sigBox: { flex: 1, border: '1pt solid #999', padding: 8, minHeight: 90 },
  sigLabel: { fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  sigImg: { width: 120, height: 50, objectFit: 'contain', marginVertical: 4 },
  sigName: { fontSize: 9 },
  officeUse: {
    marginTop: 18,
    border: '1pt solid #000',
    padding: 8,
  },
  officeUseTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
});

interface Props {
  enterprise: EnterpriseRow;
  districtName: string;
  resourceCenterName: string;
}

export function CoverPagePdfDocument({ enterprise: e, districtName, resourceCenterName }: Props) {
  const locationLine = [e.location_detail, resourceCenterName].filter(Boolean).join(' — ');
  const periodLine = `${formatDateDMY(e.period_start)} – ${formatDateDMY(e.period_end)}`;

  return (
    <Document title={`Cover page — ${e.beneficiary_short_name}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.annexLabel}>Annex V/A: Applicant&apos;s Progress report Forms</Text>
        <Text style={styles.title}>I. PROJECT SUMMERY FORM</Text>
        <Text style={styles.subtitle}>(Cover Page)</Text>

        <View style={styles.sectionTitle}>
          <Text>Project</Text>
        </View>
        <KV label="Project Title" annotation="(as in the contract)" value={e.project_title} />
        <KV label="Project Registration Number" value={e.registration_number} />
        <KV label="District" value={districtName} />
        <KV label="Location" value={locationLine} />
        <KV
          label="Period covered by the Report"
          annotation="(d/mm/yy – dd/mm/yy)"
          value={periodLine}
        />
        <KV label="Total Project Cost" annotation="(as in the contract)" value={formatLSL(e.total_project_cost_lsl)} />
        <KV label="Total Grant" value={formatLSL(e.total_grant_lsl)} />
        <KV label="Current Grant Payment" value={formatLSL(e.current_grant_payment_lsl)} />

        <View style={styles.sectionTitle}>
          <Text>Applicant</Text>
        </View>
        <KV label="Applicant Organisation" value={e.applicant_organisation_name} />
        <KV label="Principal Applicant" value={e.principal_applicant_name} />
        <KV label="Service Provider" value={e.service_provider_name} />

        <View style={styles.sigGrid}>
          <View style={styles.sigBox}>
            <Text style={styles.sigLabel}>Signature of Principal Applicant</Text>
            {e.principal_applicant_signature_url && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={e.principal_applicant_signature_url} style={styles.sigImg} />
            )}
            <Text style={styles.sigName}>{e.principal_applicant_name ?? ''}</Text>
            <Text style={styles.sigName}>Date: {formatDateDMY(e.principal_applicant_signed_date)}</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigLabel}>Signature of Service Provider</Text>
            {e.service_provider_signature_url && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={e.service_provider_signature_url} style={styles.sigImg} />
            )}
            <Text style={styles.sigName}>{e.service_provider_name ?? ''}</Text>
            <Text style={styles.sigName}>Date: {formatDateDMY(e.service_provider_signed_date)}</Text>
          </View>
        </View>

        <View style={styles.officeUse}>
          <Text style={styles.officeUseTitle}>(ONLY FOR OFFICE USE)</Text>
          <KV
            label="Received by the CGP Secretariat on date"
            annotation="(dd/mm/yy)"
            value={formatDateDMY(e.cgp_received_date)}
          />
          <KV label="Name of CGP Officer" value={e.cgp_officer_name} />
          {e.cgp_officer_signature_url && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={e.cgp_officer_signature_url} style={styles.sigImg} />
          )}
        </View>
      </Page>
    </Document>
  );
}

function KV({
  label,
  value,
  annotation,
}: {
  label: string;
  value?: string | null;
  annotation?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text>
          {label}
          {annotation ? ` ` : ''}
          {annotation ? <Text style={styles.annotation}>{annotation}</Text> : null}
        </Text>
      </View>
      <View style={styles.rowValue}>
        <Text>{value ?? ''}</Text>
      </View>
    </View>
  );
}
