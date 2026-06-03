/**
 * Excel export for a PeriodReportSnapshot.
 * One workbook with sheets: Summary, Matrix, NewEnterprises, M1Financials, Appendix.
 */
import * as XLSX from 'xlsx';
import type { PeriodReportSnapshot } from '@/lib/reports';
import { periodLabel, type ReportKind } from '@/lib/reports';

export function downloadReportExcel(snap: PeriodReportSnapshot, kind: ReportKind) {
  const label = periodLabel(kind, snap.period);
  const wb = XLSX.utils.book_new();

  const summary = [
    ['SADP-II Monitoring — Period Report'],
    ['Period',  `${snap.period.start} to ${snap.period.end} (${label})`],
    ['Scope',   snap.scope.kind === 'all' ? 'All organisations' : snap.scope.org_name],
    ['Generated', snap.generated_at],
    [],
    ['Metric', 'Value'],
    ['Enterprises total',        snap.summary.enterprises_total],
    ['New this period',          snap.summary.enterprises_new_in_period],
    ['M1 reports filed',         snap.summary.m1_submitted_in_period],
    ['ESSF filed',               snap.summary.essf_submitted_in_period],
    ['EMMP filed',               snap.summary.emmp_submitted_in_period],
    ['Inspections',              snap.summary.inspections_in_period],
    ['Planned budget (LSL)',     snap.summary.budget_planned_lsl],
    ['Grant value (LSL)',        snap.summary.budget_grant_lsl],
    [],
    ['ESMP Compliance'],
    ['ESSF filed',     snap.esmp_compliance.essf_filed],
    ['ESSF approved',  snap.esmp_compliance.essf_approved],
    ['EMMP filed',     snap.esmp_compliance.emmp_filed],
    ['EMMP approved',  snap.esmp_compliance.emmp_approved],
    ['Inspections',    snap.esmp_compliance.inspections],
    [],
    ['Borehole Supervision (in period)'],
    ['Drilling permit',          snap.borehole_progress.drilling_permit],
    ['Borehole drilling',        snap.borehole_progress.borehole_drilling],
    ['Borehole casing',          snap.borehole_progress.borehole_casing],
    ['Yield / pumping test',     snap.borehole_progress.borehole_yield_test],
    ['Drilling report',          snap.borehole_progress.borehole_drilling_report],
    ['Water use permit',         snap.borehole_progress.water_use_permit],
    [],
    ['Milestone 1 Financials'],
    ['M1 reports filed',         snap.m1_financials.m1_count],
    ['Total planned (LSL)',      snap.m1_financials.total_planned_lsl],
    ['Total incurred (LSL)',     snap.m1_financials.total_incurred_lsl],
    ['Cashbook total (LSL)',     snap.m1_financials.cashbook_total_lsl],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  // Milestone matrix
  const matrixHeader = ['District','Total','ESMP','M1','BP','Contracts','Beneficiary contrib.','SADP contrib.','Borehole','Budget xfer','Supervision','Procurement'];
  const matrixRows = snap.milestone_matrix.map(r => [
    r.district, r.total, r.esmp_done, r.m1_done, r.bp_done, r.contracts_done,
    r.bene_contrib_done, r.sadp_contrib_done, r.borehole_done,
    r.budget_xfer_done, r.supervision_done, r.procurement_done,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([matrixHeader, ...matrixRows]), 'Matrix');

  // New enterprises in period
  const neHeader = ['Name','Project title','Org','District','Resource centre','Type','Budget (LSL)','Created at'];
  const neRows = snap.new_enterprises.map(e => [
    e.name ?? '', e.project_title ?? '', e.org_code ?? '', e.district ?? '',
    e.resource_center ?? '', e.enterprise_type ?? '', e.budget_lsl, e.created_at,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([neHeader, ...neRows]), 'NewEnterprises');

  // Appendix: full enterprise list in scope
  const apHeader = ['Name','Project title','Org','District','Resource centre','Type','Budget (LSL)','ESMP','M1','BP'];
  const apRows = snap.appendix.map(r => [
    r.name ?? '', r.project_title ?? '', r.org_code ?? '', r.district ?? '',
    r.resource_center ?? '', r.enterprise_type ?? '', r.budget_lsl,
    r.esmp ?? '', r.m1 ?? '', r.bp ?? '',
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([apHeader, ...apRows]), 'Appendix');

  const filename = `SADP-II ${label.replace(/[^A-Za-z0-9 _-]/g,'')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
