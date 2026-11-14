import { describe, it, expect } from 'vitest';
import {
  LIFECYCLE_STAGES,
  STAGE_META,
  stageLabel,
  stageOrder,
  stageOrDefault,
} from './stage';

describe('lifecycle stage', () => {
  it('runs M1 -> M2 -> Graduated in journey order', () => {
    expect(LIFECYCLE_STAGES).toEqual(['m1', 'm2', 'graduated']);
    expect(stageOrder('m1')).toBeLessThan(stageOrder('m2'));
    expect(stageOrder('m2')).toBeLessThan(stageOrder('graduated'));
  });

  it('gives short labels and an em-dash for nothing', () => {
    expect(stageLabel('m1')).toBe('M1');
    expect(stageLabel('m2')).toBe('M2');
    expect(stageLabel('graduated')).toBe('Graduated');
    expect(stageLabel(null)).toBe('—');
    expect(stageLabel(undefined)).toBe('—');
  });

  it('has complete metadata for every stage', () => {
    for (const s of LIFECYCLE_STAGES) {
      const m = STAGE_META[s];
      expect(m.id).toBe(s);
      expect(m.label).toBeTruthy();
      expect(m.full).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(['neutral', 'primary', 'success']).toContain(m.tone);
    }
  });

  it('defaults a missing/unknown stage to m1 (pre-migration cache guard)', () => {
    expect(stageOrDefault(null)).toBe('m1');
    expect(stageOrDefault(undefined)).toBe('m1');
    expect(stageOrDefault('m2')).toBe('m2');
    // @ts-expect-error — exercising the runtime guard against a bad value
    expect(stageOrDefault('nonsense')).toBe('m1');
  });
});
