/**
 * "Take this enterprise offline" button.
 *
 * Thin wrapper around `precacheEnterprise()` from src/lib/precache.ts —
 * the actual fetching logic lives there so the per-RC bulk-cache button
 * (PrecacheRcButton) shares the same code path. Marks the enterprise
 * in localStorage on success so the Enterprises list can show a "📡"
 * offline-ready dot on cached rows.
 *
 * For the bulk-cache use case (Pilot RC field day → 12 enterprises in
 * one tap), use the PrecacheRcButton rendered above the Enterprises list
 * when an RC filter is active.
 *
 * Does NOT pre-cache PDFs or photo Blobs — those are online-only by
 * design (see Phase 5 in PROGRESS.md).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { precacheCatalogs, precacheEnterprise } from '@/lib/precache';

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

  async function run() {
    setState('fetching');
    try {
      // Catalogs are shared across enterprises; fire them in parallel with
      // the enterprise-specific jobs.
      await Promise.all([
        precacheCatalogs(qc),
        precacheEnterprise(qc, { enterpriseId, enterpriseTypeId, districtId }),
      ]);
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

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={run}
      disabled={state === 'fetching'}
      title="Pre-fetch everything needed to view + edit this enterprise without a network connection."
    >
      {state === 'fetching' ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Caching for offline…
        </>
      ) : state === 'done' ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
          Cached for offline
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
