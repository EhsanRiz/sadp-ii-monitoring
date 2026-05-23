/**
 * React Query hooks for the geo + enterprise-type catalogs.
 * RLS scopes geo tables to the caller's organization (Super Admin sees all).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  CommunityCouncilRow,
  DistrictRow,
  EnterpriseTypeRow,
  OrganizationRow,
  ResourceCenterRow,
  RoundRow,
  VillageRow,
} from '@/types/database';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async (): Promise<OrganizationRow[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useRounds() {
  return useQuery({
    queryKey: ['rounds'],
    queryFn: async (): Promise<RoundRow[]> => {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useDistricts(organizationId?: string | null) {
  return useQuery({
    queryKey: ['districts', organizationId ?? 'all'],
    queryFn: async (): Promise<DistrictRow[]> => {
      let q = supabase.from('districts').select('*').order('name', { ascending: true });
      if (organizationId) q = q.eq('organization_id', organizationId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useCommunityCouncils(districtId?: string | null) {
  return useQuery({
    queryKey: ['community_councils', districtId ?? 'all'],
    queryFn: async (): Promise<CommunityCouncilRow[]> => {
      let q = supabase
        .from('community_councils')
        .select('*')
        .order('name', { ascending: true });
      if (districtId) q = q.eq('district_id', districtId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!districtId || districtId === undefined,
    staleTime: 60_000,
  });
}

export function useResourceCenters(districtId?: string | null) {
  return useQuery({
    queryKey: ['resource_centers', districtId ?? 'all'],
    queryFn: async (): Promise<ResourceCenterRow[]> => {
      let q = supabase
        .from('resource_centers')
        .select('*')
        .order('name', { ascending: true });
      if (districtId) q = q.eq('district_id', districtId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!districtId || districtId === undefined,
    staleTime: 60_000,
  });
}

export function useVillages(districtId?: string | null) {
  return useQuery({
    queryKey: ['villages', districtId ?? 'all'],
    queryFn: async (): Promise<VillageRow[]> => {
      let q = supabase.from('villages').select('*').order('name', { ascending: true });
      if (districtId) q = q.eq('district_id', districtId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!districtId || districtId === undefined,
    staleTime: 60_000,
  });
}

export function useEnterpriseTypes() {
  return useQuery({
    queryKey: ['enterprise_types'],
    queryFn: async (): Promise<EnterpriseTypeRow[]> => {
      const { data, error } = await supabase
        .from('enterprise_types')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 60_000,
  });
}
