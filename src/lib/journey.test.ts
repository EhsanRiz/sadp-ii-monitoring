import { describe, it, expect } from 'vitest';
import { deriveJourney, type JourneyStage } from './journey';

const nodeStatus = (s: JourneyStage, key: string) =>
  s.nodes.find((n) => n.key === key)!.status;

describe('deriveJourney', () => {
  it('drives the current stage from money data', () => {
    // Cornel Bright: M1, farmer fully paid, BA approved, funds in motion, report pending.
    const j = deriveJourney('m1', {
      m1: {
        farmer_contract_lsl: 100000,
        farmer_contributed_lsl: 100000,
        ba_status: 'approved',
        funds_allocated_lsl: 160000,
        funds_depleted_lsl: 100000,
        yet_to_report_lsl: 60000,
        report_status: 'pending',
      },
    });
    const m1 = j.stages.find((s) => s.stage === 'm1')!;
    expect(m1.isCurrent).toBe(true);
    expect(nodeStatus(m1, 'farmer')).toBe('done');
    expect(nodeStatus(m1, 'ba')).toBe('done');
    expect(nodeStatus(m1, 'fd')).toBe('active');
    expect(nodeStatus(m1, 'report')).toBe('pending');
    expect(j.graduated).toBe(false);
  });

  it('flags a partially-paid budget allocation', () => {
    const j = deriveJourney('m1', { m1: { ba_status: 'partially_paid' } });
    const m1 = j.stages.find((s) => s.stage === 'm1')!;
    expect(nodeStatus(m1, 'ba')).toBe('flag');
  });

  it('marks a past stage with no data as complete, future as not-started', () => {
    // Enterprise is in M2 but entered no M1 money → M1 assumed complete, M2 blank.
    const j = deriveJourney('m2', {});
    const m1 = j.stages.find((s) => s.stage === 'm1')!;
    const m2 = j.stages.find((s) => s.stage === 'm2')!;
    expect(m1.nodes.every((n) => n.status === 'done')).toBe(true);
    expect(m2.isCurrent).toBe(true);
    expect(m2.nodes.every((n) => n.status === 'pending')).toBe(true);
  });

  it('shows a partial farmer contribution as active', () => {
    const j = deriveJourney('m2', {
      m2: { farmer_contract_lsl: 100000, farmer_contributed_lsl: 80000 },
    });
    const m2 = j.stages.find((s) => s.stage === 'm2')!;
    expect(nodeStatus(m2, 'farmer')).toBe('active');
    expect(m2.nodes.find((n) => n.key === 'farmer')!.detail).toBe('M80k / M100k');
  });

  it('reports graduation when the stage is graduated', () => {
    const j = deriveJourney('graduated', {});
    expect(j.graduated).toBe(true);
    // Both M1 and M2 are in the past → all steps complete.
    for (const s of j.stages) {
      expect(s.nodes.every((n) => n.status === 'done')).toBe(true);
    }
  });

  it('is safe on null finances', () => {
    const j = deriveJourney('m1', null);
    expect(j.stages).toHaveLength(2);
    expect(j.graduated).toBe(false);
  });
});
