// IMPORTANT: import order matters. `./lib/initial-url` snapshots the URL hash
// synchronously at module-load time. It must run BEFORE `./lib/supabase` is
// loaded (transitively via auth.tsx) so we capture `#access_token=...&type=invite`
// before supabase-js's `detectSessionInUrl: true` clears the hash.
import './lib/initial-url';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appRouter } from './App';
import { AuthProvider } from './lib/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initOnlineStatus } from './lib/online-status';
import { queryPersister } from './lib/query-persister';
import { initReplay } from './lib/offline-replay';
import { initPwa } from './lib/pwa';
import './index.css';

// Register the service worker + update prompt (polls for new deploys so field
// tablets actually receive fixes; prompts to reload instead of auto-reloading).
initPwa();

// Phase 1 of the offline stack — boot the connection probe immediately so the
// OfflineBadge in AppShell shows accurate state on first render.
initOnlineStatus();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Field staff are often offline. Trade some freshness for usability:
      // serve cached data first, refetch in background.
      staleTime: 30_000,
      // Run queries even when the browser thinks it's offline. With the
      // default 'online' mode, a query with no cached data is PAUSED forever
      // when offline (fetchStatus: 'paused') — which showed up in the field as
      // an endless "Loading…" on any enterprise/page that hadn't been
      // pre-cached. 'offlineFirst' instead runs the queryFn: persisted/cached
      // data renders immediately, and an uncached query fails fast (network
      // error) so pages can show the friendly <OfflineErrorState/> ("Not
      // loaded offline yet") instead of spinning indefinitely.
      networkMode: 'offlineFirst',
      // Phase 2: keep cached data in-memory for 24h so the user can revisit
      // an enterprise after lunch without re-fetching. IDB persistence (below)
      // covers cold-start / page-reload after the in-memory cache is GC'd.
      gcTime: 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      // Hook every query into the IDB-backed persister. Successful queries
      // are written to IDB when they settle; on a fresh page load, the
      // persister hydrates them back in. The result: previously-fetched
      // reads survive page refreshes AND offline restarts.
      persister: queryPersister,
    },
  },
});

// Phase 3 — boot the offline-queue replay engine. It listens for online
// transitions and drains the queue, dispatching each entry to the matching
// save handler. Wires the QueryClient so successful replays can invalidate
// the relevant caches.
initReplay(queryClient);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Catch any uncaught render error so the whole PWA never white-screens on
        a field device. Sits outside the providers so it survives even an auth/
        query-provider failure. */}
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* AuthProvider wraps RouterProvider so React Query + useAuth are
            available inside route elements. The data router (createBrowserRouter)
            replaces the older BrowserRouter + Routes pair so we can use the
            stable `useBlocker` hook for unsaved-changes guards. */}
        <AuthProvider>
          <RouterProvider router={appRouter} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
