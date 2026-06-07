/**
 * "Take this enterprise offline" button.
 *
 * Eagerly fetches everything needed to view and edit the enterprise
 * without a network:
 *
 *   - The enterprise row itself
 *   - ESSF / EMMP / Inspection visits / M1 submission
 *   - M1 supporting documents metadata
 *   - The EMMP template for this enterprise's type
 *   - The catalogs (districts / community councils / resource centers /
 *     villages / enterprise types / organizations) — these are small and
 *     shared, so caching once benefits every enterprise
 *
 * Each fetch goes through React Query, so it lands in the same IDB-backed
 * cache that powers the rest of the app. After this runs, the user can
 * lose connection and still navigate to every tab on this enterprise.
 *
 * NOTE: this does NOT pre-cache PDFs or supporting-doc Blobs — those are
 * online-only by design (see Phase 5 in PROGRESS.md).
 */
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCacheStateFor, setCacheStateRows } from '@/lib/offline-db';

interface Props {
  enterpriseId: string;
  enterpriseTypeId: number | null;
  districtId: string | null;
}

export function PrecacheEnterpriseButton({
  enterpriseId,
  enterpriseTypeId,
  districtId,
}: Props) {
  const qc = useQueryClient();
  const [state, setState] = useState<'idle' | 'fetching' | 'done' | 'error'>('idle');
  const [lastCachedAt, setLastCachedAt] = useState<string | null>(null);

  // On mount, check if this enterprise has been auto-cached already so the
  // button shows the right label without the user having to click first.
  useEffect(() => {
    let cancelled = false;
    void getCacheStateFor(enterpriseId).then((row) => {
      if (!cancelled && row) setLastCachedAt(row.cached_at);
    });
    return () => { cancelled = true; };
  }, [enterpriseId]);

  async function run() {
    setState('fetching');
    try {
      // Catalogs — small + shared. Always prefetch.
      const catalogJobs: Array<Promise<unknown>> = [
        qc.prefetchQuery({
          queryKey: ['organizations'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('organizations')
              .select('*')
              .order('code');
            if (error) throw error;
            return data ?? [];
          },
        }),
        qc.prefetchQuery({
          queryKey: ['districts'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('districts')
              .select('*')
              .order('name');
            if (error) throw error;
            return data ?? [];
          },
        }),
        qc.prefetchQuery({
          queryKey: ['enterprise-types'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('enterprise_types')
              .select('*')
              .order('name');
            if (error) throw error;
            return data ?? [];
          },
        }),
      ];

      // Geo lookups scoped to the enterprise's district — cheap and useful.
      if (districtId) {
        catalogJobs.push(
          qc.prefetchQuery({
            queryKey: ['community-councils', districtId],
            queryFn: async () => {
              const { data, error } = await supabase
                .from('community_councils')
                .select('*')
                .eq('district_id', districtId)
                .order('name');
              if (error) throw error;
              return data ?? [];
            },
          }),
          qc.prefetchQuery({
            queryKey: ['resource-centers', districtId],
            queryFn: async () => {
              const { data, error } = await supabase
                .from('resource_centers')
                .select('*')
                .eq('district_id', districtId)
                .order('name');
              if (error) throw error;
              return data ?? [];
            },
          }),
        );
      }

      // Enterprise-specific submissions and metadata.
      const enterpriseJobs: Array<Promise<unknown>> = [
        qc.prefetchQuery({
          queryKey: ['enterprise', enterpriseId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('enterprises')
              .select('*')
              .eq('id', enterpriseId)
              .single();
            if (error) throw error;
            return data;
          },
        }),
        qc.prefetchQuery({
          queryKey: ['essf', enterpriseId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('essf_submissions')
              .select('*')
              .eq('enterprise_id', enterpriseId)
              .maybeSingle();
            if (error) throw error;
            return data;
          },
        }),
        qc.prefetchQuery({
          queryKey: ['emmp', enterpriseId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('emmp_submissions')
              .select('*')
              .eq('enterprise_id', enterpriseId)
              .maybeSingle();
            if (error) throw error;
            return data;
          },
        }),
        qc.prefetchQuery({
          queryKey: ['inspection-visits', enterpriseId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('inspection_visits')
              .select('*')
              .eq('enterprise_id', enterpriseId)
              .order('visit_date', { ascending: false });
            if (error) throw error;
            return data ?? [];
          },
        }),
        qc.prefetchQuery({
          queryKey: ['m1', enterpriseId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('m1_submissions')
              .select('*')
              .eq('enterprise_id', enterpriseId)
              .maybeSingle();
            if (error) throw error;
            return data;
          },
        }),
        qc.prefetchQuery({
          queryKey: ['m1-supporting-docs', enterpriseId],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('m1_supporting_documents')
              .select('*')
              .eq('enterprise_id', enterpriseId)
              .order('uploaded_at', { ascending: false });
            if (error) throw error;
            return data ?? [];
          },
        }),
        qc.prefetchQuery({
          queryKey: ['enterprise-timeline', enterpriseId],
          queryFn: async () => {
            // enterprise_timeline view isn't in the generated Database types
            // yet; cast through `as unknown as ...` like useEnterpriseTimeline does.
            const { data, error } = await (
              supabase as unknown as {
                from: (table: string) => {
                  select: (cols: string) => {
                    eq: (col: string, val: string) => {
                      order: (
                        col: string,
                        opts: { ascending: boolean; nullsFirst?: boolean },
                      ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
                    };
                  };
                };
              }
            )
              .from('enterprise_timeline')
              .select('*')
              .eq('enterprise_id', enterpriseId)
              .order('occurred_at', { ascending: false, nullsFirst: false });
            if (error) throw error;
            return data ?? [];
          },
        }),
      ];

      // EMMP template for this enterprise's type — needed to render the form.
      if (enterpriseTypeId != null) {
        enterpriseJobs.push(
          qc.prefetchQuery({
            queryKey: ['emmp-template-for-type', enterpriseTypeId],
            queryFn: async () => {
              const { data, error } = await supabase
                .from('emmp_templates')
                .select('id, title, version, schema')
                .contains('enterprise_type_ids', [enterpriseTypeId])
                .maybeSingle();
              if (error) throw error;
              return data;
            },
          }),
        );
      }

      await Promise.all([...catalogJobs, ...enterpriseJobs]);
      // Persist that this enterprise is cached so the button + list badge
      // show the right state on next page load.
      const cached_at = new Date().toISOString();
      await setCacheStateRows([{ enterprise_id: enterpriseId, cached_at, source_updated_at: null }]);
      setLastCachedAt(cached_at);
      setState('done');
      toast.success('Ready for offline', {
        description:
          'All forms and reference data for this enterprise are cached. You can lose connection and keep working.',
      });
    } catch (e) {
      setState('error');
      toast.error('Could not pre-cache', {
        description: e instanceof Error ? e.message : 'unknown error',
      });
    }
  }

  const isCached = state === 'done' || !!lastCachedAt;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={run}
      disabled={state === 'fetching'}
      title={isCached
        ? `Refresh the offline copy of this enterprise. Last cached: ${lastCachedAt ? new Date(lastCachedAt).toLocaleString() : 'just now'}.`
        : 'Pre-fetch everything needed to view + edit this enterprise without a network connection.'
      }
    >
      {state === 'fetching' ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Caching…
        </>
      ) : isCached ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
          <span>Offline ready</span>
          <span className="ml-2 text-[10px] opacity-70 hidden sm:inline">
            · {lastCachedAt ? relTimeShort(lastCachedAt) : 'just now'} · Refresh
          </span>
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Take offline
        </>
      )}
    </Button>
  );
}

function relTimeShort(iso: string): string {
  const dMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (dMin < 1)   return 'just now';
  if (dMin < 60)  return `${dMin}m ago`;
  const dH = Math.floor(dMin / 60);
  if (dH < 24)    return `${dH}h ago`;
  const dD = Math.floor(dH / 24);
  return `${dD}d ago`;
}
