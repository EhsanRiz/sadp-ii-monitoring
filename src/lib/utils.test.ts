import { describe, it, expect } from 'vitest';
import { formatLSL, formatLSLCoverPage, formatDateDMY } from './utils';

describe('formatLSL', () => {
  it('formats numbers with the M prefix and 2dp', () => {
    expect(formatLSL(500000)).toBe('M500,000.00');
    expect(formatLSL(0)).toBe('M0.00');
    expect(formatLSL('1234.5')).toBe('M1,234.50');
  });

  it('returns empty string for blank / invalid input', () => {
    expect(formatLSL(null)).toBe('');
    expect(formatLSL(undefined)).toBe('');
    expect(formatLSL('')).toBe('');
    expect(formatLSL('not-a-number')).toBe('');
  });
});

describe('formatLSLCoverPage', () => {
  it('uses LSL prefix with space separators and period decimal', () => {
    // fr-FR uses a narrow no-break space (U+202F) as the thousands separator;
    // normalize all whitespace to a plain space for a readable assertion.
    expect(formatLSLCoverPage(500000).replace(/\s/g, ' ')).toBe('LSL 500 000.00');
  });
  it('returns empty string for blank input', () => {
    expect(formatLSLCoverPage(null)).toBe('');
  });
});

describe('formatDateDMY', () => {
  it('formats an ISO date as dd/mm/yyyy (UTC)', () => {
    expect(formatDateDMY('2026-06-17')).toBe('17/06/2026');
    expect(formatDateDMY('2026-01-05T00:00:00Z')).toBe('05/01/2026');
  });
  it('returns empty string for null / invalid input', () => {
    expect(formatDateDMY(null)).toBe('');
    expect(formatDateDMY('')).toBe('');
    expect(formatDateDMY('garbage')).toBe('');
  });
});
