/**
 * AutoPrefetch — silently fetch the must-have queries on every
 * authenticated session so the React Query persister fills IDB BEFORE the
 * user goes offline.
 *
 * Without this, a field staffer who logs in online but never visits the
 * Dashboard or Enterprises list, then goes offline, sees "TypeError:
 * Failed to fetch" because nothing was cached. With this, the navigation
 * shell + the unfiltered enterprise list + lifecycle data + catalogs are
 * always available offline as long as the user has been online at least
 * once in the last 24h (the persister's gcTime).
 *
 * Mounted as a child of AppShell (rendered only on authenticated routes,
 * so we don't fire the queries for logged-out visitors).
 *
 * Each call is just a useQuery — React Query dedupes against any other
 * useQuery on the same key (e.g. the Dashboard's own useEnterpriseLifecycle
 * call), so there's no double-fetch.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEnterprises, useEnterpriseLifecycle } from '@/lib/enterprises';
import { useDistricts, useEnterpriseTypes, useOrganizations } from '@/lib/catalogs';
import { useOnlineStatus } from '@/lib/online-status';
import { precacheCatalogs } from '@/lib/precache';

export function AutoPrefetch() {
  // These hooks all read with `enabled: !!something` defaults that are
  // effectively true here (no required arguments). They fire on mount when
  // online and skip silently when offline (React Query just leaves the
  // request queued). When the network comes back, the queries fire on the
  // next render and the persister catches up.
  useEnterprises({});
  useEnterpriseLifecycle();
  useOrganizations();
  useDistricts();
  useEnterpriseTypes();

  // Also explicitly nudge the catalog prefetch on every online transition
  // so that an offline → online recovery refreshes the catalogs without
  // requiring a page reload. Otherwise React Query would only refetch
  // when something observed the query.
  const qc = useQueryClient();
  const online = useOnlineStatus();
  useEffect(() => {
    if (online === 'online') {
      void precacheCatalogs(qc);
    }
  }, [online, qc]);

  return null;
}
