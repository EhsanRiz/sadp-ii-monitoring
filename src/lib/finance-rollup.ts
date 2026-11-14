/**
 * Dashboard rollups for the per-stage finances (migration 340).
 * Reads the district_finance_rollup view (aggregates stage_finances across M1+M2
 * per district) and coerces the numeric/bigint columns PostgREST returns as
 * strings into real numbers.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DistrictFinanceRollup {
  district_id: string;
  district: string;
  enterprises: number;
  tracked: number;
  in_m1: number;
  in_m2: number;
  graduated: number;
  farmer_contract: number;
  farmer_contributed: number;
  yet_to_report: number;
}

const NUM_KEYS = [
  'enterprises', 'tracked', 'in_m1', 'in_m2', 'graduated',
  'farmer_contract', 'farmer_contributed', 'yet_to_report',
] as const;

export function useDistrictFinanceRollup() {
  return useQuery({
    queryKey: ['district-finance-rollup'],
    queryFn: async (): Promise<DistrictFinanceRollup[]> => {
      const { data, error } = await supabase.from('district_finance_rollup').select('*');
      if (error) throw error;
      return (data ?? []).map((raw) => {
        const r = raw as Record<string, unknown>;
        const out = { district_id: String(r.district_id), district: String(r.district) } as DistrictFinanceRollup;
        for (const k of NUM_KEYS) out[k] = Number(r[k] ?? 0);
        return out;
      });
    },
    staleTime: 60_000,
  });
}

/** Totals across all districts. */
export function sumRollup(rows: DistrictFinanceRollup[]) {
  return rows.reduce(
    (acc, r) => ({
      enterprises: acc.enterprises + r.enterprises,
      tracked: acc.tracked + r.tracked,
      in_m1: acc.in_m1 + r.in_m1,
      in_m2: acc.in_m2 + r.in_m2,
      graduated: acc.graduated + r.graduated,
      farmer_contract: acc.farmer_contract + r.farmer_contract,
      farmer_contributed: acc.farmer_contributed + r.farmer_contributed,
      yet_to_report: acc.yet_to_report + r.yet_to_report,
    }),
    { enterprises: 0, tracked: 0, in_m1: 0, in_m2: 0, graduated: 0, farmer_contract: 0, farmer_contributed: 0, yet_to_report: 0 },
  );
}
