import { describe, it, expect } from 'vitest';
import {
  parseStageFinances,
  stageFinanceOrEmpty,
  farmerVariance,
  pctDepleted,
  hasAnyFinance,
  formatLsl,
  emptyStageFinance,
} from './stage-finances';

describe('stage finances parsing', () => {
  it('parses a well-formed jsonb map', () => {
    const map = parseStageFinances({
      m1: { farmer_contract_lsl: 100000, farmer_contributed_lsl: 40000, ba_status: 'approved' },
      m2: { funds_allocated_lsl: 160000, report_status: 'pending' },
    });
    expect(map.m1?.farmer_contract_lsl).toBe(100000);
    expect(map.m1?.ba_status).toBe('approved');
    expect(map.m2?.funds_allocated_lsl).toBe(160000);
  });

  it('coerces numeric strings and rejects junk', () => {
    const map = parseStageFinances({ m1: { farmer_contract_lsl: '100000', sadp_contributed_lsl: 'oops', ba_status: 'bogus' } });
    expect(map.m1?.farmer_contract_lsl).toBe(100000);
    expect(map.m1?.sadp_contributed_lsl).toBeNull();
    expect(map.m1?.ba_status).toBeNull();
  });

  it('is safe on null / non-object input', () => {
    expect(parseStageFinances(null)).toEqual({});
    expect(parseStageFinances(undefined)).toEqual({});
    expect(parseStageFinances('nope' as unknown as never)).toEqual({});
    expect(stageFinanceOrEmpty({}, 'm1')).toEqual(emptyStageFinance());
  });
});

describe('stage finance math', () => {
  it('farmerVariance = contract - contributed (missing contributed = 0)', () => {
    expect(farmerVariance({ ...emptyStageFinance(), farmer_contract_lsl: 100000, farmer_contributed_lsl: 40000 })).toBe(60000);
    expect(farmerVariance({ ...emptyStageFinance(), farmer_contract_lsl: 100000 })).toBe(100000);
    expect(farmerVariance({ ...emptyStageFinance(), farmer_contributed_lsl: 40000 })).toBeNull();
  });

  it('pctDepleted rounds depleted/allocated, guards zero', () => {
    expect(pctDepleted({ ...emptyStageFinance(), funds_allocated_lsl: 160000, funds_depleted_lsl: 100000 })).toBe(63);
    expect(pctDepleted({ ...emptyStageFinance(), funds_allocated_lsl: 0, funds_depleted_lsl: 100 })).toBeNull();
    expect(pctDepleted({ ...emptyStageFinance(), funds_depleted_lsl: 100 })).toBeNull();
  });

  it('hasAnyFinance detects empty vs filled records', () => {
    expect(hasAnyFinance(emptyStageFinance())).toBe(false);
    expect(hasAnyFinance({ ...emptyStageFinance(), farmer_contract_lsl: 1 })).toBe(true);
    expect(hasAnyFinance({ ...emptyStageFinance(), ba_status: 'submitted' })).toBe(true);
  });

  it('formatLsl renders Maloti with grouping', () => {
    expect(formatLsl(100000)).toBe('M100,000');
    expect(formatLsl(0)).toBe('M0');
    expect(formatLsl(null)).toBe('—');
  });
});
