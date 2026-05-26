/**
 * M1 Financial Report — categorised line items with source-of-funds split.
 *
 * Stored on m1_submissions.financial_report as:
 *   {
 *     report_number?: number,
 *     reporting_period_start?: string (ISO),
 *     reporting_period_end?: string (ISO),
 *     remitting_period?: string,
 *     reporting_date?: string (ISO),
 *     items: M1FRLineItem[],
 *   }
 *
 * Categories are fixed (the SADP-II financial report template hard-codes them);
 * the user adds line items under any category. Each line item carries Total
 * Planned, Incurred, Date of Receipts, and a free-text Notes column. The
 * Beneficiary 20% / IFAD 20% / Grant-IDA 60% source-of-funds split is
 * AUTO-COMPUTED from Incurred — never stored, never user-editable. This
 * matches the printed form where those columns are derived for every row
 * including subtotal rows.
 *
 * Per-row Difference = Total Planned − Incurred (positive = under budget).
 *
 * Footer totals: sum of Total Planned, sum of Incurred, plus the three
 * source-of-funds totals — all computed.
 */

export const M1_FR_SCHEMA_VERSION = 1;

export interface M1FRCategory {
  id: string;
  /** Display label without the leading id prefix, e.g. "Equipment, supplies, material". */
  label: string;
  /** Optional grouping for the printed form (matches the canonical template). */
  group: 'I' | 'II' | 'III';
}

/**
 * The eight fixed categories that anchor the financial report. Order matches
 * the canonical printed form (Annex V/A "FORMART FOR FINANCIAL REPORTS").
 */
export const M1_FR_CATEGORIES: M1FRCategory[] = [
  { id: 'I-A', label: 'Project Implementation Costs — Equipment, supplies, material', group: 'I' },
  { id: 'I-B', label: 'Inputs', group: 'I' },
  { id: 'I-C', label: 'Labour', group: 'I' },
  { id: 'I-D', label: 'Transportation', group: 'I' },
  { id: 'I-E', label: 'Travel for Applicants', group: 'I' },
  { id: 'I-F', label: 'Others', group: 'I' },
  { id: 'II',  label: 'Technical Assistance', group: 'II' },
  { id: 'III', label: 'Technology Transfer', group: 'III' },
];

export interface M1FRLineItem {
  id: string;             // stable id for React keys
  category: string;       // matches M1FRCategory.id (free-text-tolerant — old data won't break if a category is renamed)
  label: string;          // e.g. "Borehole drilling"
  total_planned: number;  // LSL
  incurred: number;       // LSL — drives the 20/20/60 split
  date_of_receipts: string; // ISO yyyy-mm-dd (or '')
  notes: string;
}

export interface M1FinancialReportResponses {
  report_number?: number;
  reporting_period_start?: string;
  reporting_period_end?: string;
  remitting_period?: string;
  reporting_date?: string;
  items?: M1FRLineItem[];
}

/** Source-of-funds split: 20% beneficiary, 20% IFAD matching, 60% Grant IDA. */
export const M1_FR_SPLIT = {
  beneficiary_pct: 0.20,
  ifad_pct: 0.20,
  grant_ida_pct: 0.60,
} as const;

export interface M1FRSplit {
  beneficiary: number;
  ifad: number;
  grant_ida: number;
}

export function computeFinancialSplit(incurred: number): M1FRSplit {
  const n = Number(incurred) || 0;
  return {
    beneficiary: n * M1_FR_SPLIT.beneficiary_pct,
    ifad: n * M1_FR_SPLIT.ifad_pct,
    grant_ida: n * M1_FR_SPLIT.grant_ida_pct,
  };
}

/** Difference column: positive means under-budget (Planned > Incurred). */
export function computeFinancialDifference(item: Pick<M1FRLineItem, 'total_planned' | 'incurred'>): number {
  return (Number(item.total_planned) || 0) - (Number(item.incurred) || 0);
}

export interface M1FRTotals {
  totalPlanned: number;
  totalIncurred: number;
  beneficiary: number;
  ifad: number;
  grant_ida: number;
  totalDifference: number;
}

export function computeFinancialTotals(items: M1FRLineItem[]): M1FRTotals {
  const totalPlanned = items.reduce((s, it) => s + (Number(it.total_planned) || 0), 0);
  const totalIncurred = items.reduce((s, it) => s + (Number(it.incurred) || 0), 0);
  return {
    totalPlanned,
    totalIncurred,
    beneficiary: totalIncurred * M1_FR_SPLIT.beneficiary_pct,
    ifad: totalIncurred * M1_FR_SPLIT.ifad_pct,
    grant_ida: totalIncurred * M1_FR_SPLIT.grant_ida_pct,
    totalDifference: totalPlanned - totalIncurred,
  };
}

/** Build a fresh blank line item. Caller provides the id (crypto.randomUUID). */
export function blankFRItem(id: string, category = 'I-A'): M1FRLineItem {
  return {
    id,
    category,
    label: '',
    total_planned: 0,
    incurred: 0,
    date_of_receipts: '',
    notes: '',
  };
}

/** Column definitions for the form and the PDF table. Single source of truth. */
export const M1_FR_COLUMNS = [
  { id: 'category',       label: 'No',                   width: '6%',  align: 'left'  as const },
  { id: 'label',          label: 'Approved Budget Item', width: '18%', align: 'left'  as const },
  { id: 'total_planned',  label: 'Planned (M)',          width: '10%', align: 'right' as const },
  { id: 'incurred',       label: 'Incurred (M)',         width: '10%', align: 'right' as const },
  { id: 'date_of_receipts', label: 'Date of receipts',   width: '9%',  align: 'left'  as const },
  { id: 'beneficiary',    label: 'Beneficiary 20% (M)',  width: '10%', align: 'right' as const },
  { id: 'ifad',           label: 'IFAD 20% (M)',         width: '10%', align: 'right' as const },
  { id: 'grant_ida',      label: 'Grant IDA 60% (M)',    width: '10%', align: 'right' as const },
  { id: 'difference',     label: 'Difference (M)',       width: '9%',  align: 'right' as const },
  { id: 'notes',          label: 'Notes',                width: '8%',  align: 'left'  as const },
] as const;
