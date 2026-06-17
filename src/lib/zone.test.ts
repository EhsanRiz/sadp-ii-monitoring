import { describe, it, expect } from 'vitest';
import { zoneLabel, isCoverPageReady } from './enterprises';
import { zoneKey } from './precache';
import type { EnterpriseRow } from '@/types/database';

describe('zoneLabel', () => {
  it('labels numbered Maseru zones', () => {
    expect(zoneLabel(1)).toBe('Zone 1');
    expect(zoneLabel(8)).toBe('Zone 8');
  });
  it('treats null/undefined as Unzoned', () => {
    expect(zoneLabel(null)).toBe('Unzoned');
    expect(zoneLabel(undefined)).toBe('Unzoned');
  });
});

describe('zoneKey', () => {
  it('maps a zone number to its registry key', () => {
    expect(zoneKey(3)).toBe('3');
  });
  it('maps null to "unzoned"', () => {
    expect(zoneKey(null)).toBe('unzoned');
    expect(zoneKey(undefined)).toBe('unzoned');
  });
});

describe('isCoverPageReady', () => {
  const base: Partial<EnterpriseRow> = {
    project_title: 'T',
    registration_number: 'R1',
    period_start: '2026-01-01',
    period_end: '2026-12-31',
    total_project_cost_lsl: 100,
    total_grant_lsl: 80,
    principal_applicant_name: 'Jane',
    community_council_id: 'cc',
    resource_center_id: 'rc',
  };

  it('is true when every cover-page field is present', () => {
    expect(isCoverPageReady(base as EnterpriseRow)).toBe(true);
  });

  it('is false when a required field is missing', () => {
    expect(isCoverPageReady({ ...base, registration_number: null } as EnterpriseRow)).toBe(false);
    expect(isCoverPageReady({ ...base, resource_center_id: null } as EnterpriseRow)).toBe(false);
  });

  it('treats a zero amount as present (not missing)', () => {
    expect(isCoverPageReady({ ...base, total_grant_lsl: 0 } as EnterpriseRow)).toBe(true);
  });
});
