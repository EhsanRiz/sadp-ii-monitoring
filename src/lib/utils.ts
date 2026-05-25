import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn-standard className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format an LSL (Lesotho Loti) amount as the Annex V/A cover-page prints it:
 *   M{:,.2f}   — e.g. M500,000.00
 */
export function formatLSL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '';
  return `M${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format an LSL amount for the paper-form cover page:
 *   "LSL 500 000.00" — LSL prefix, non-breaking space as thousand separator,
 *   period decimal. Matches the canonical Annex V/A printed format.
 */
export function formatLSLCoverPage(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '';
  // Use 'fr-FR' which renders with space thousand separators and comma decimal,
  // then swap the comma back to a period to match the sample.
  const formatted = n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace(',', '.');
  return `LSL ${formatted}`;
}

/**
 * Format an ISO date string as dd/mm/yyyy (Annex V/A cover-page format).
 * Returns '' for null/empty input.
 */
export function formatDateDMY(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
