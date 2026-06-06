// IMPORTANT: import order matters. `./lib/initial-url` snapshots the URL hash
// synchronously at module-load time. It must run BEFORE `./lib/supabase` is
// loaded (transitively via auth.tsx) so we capture `#access_token=...&type=invite`
// before supabase-js's `detectSessionInUrl: true` clears the hash.
import './lib/initial-url';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './lib/auth';
import { initOnlineStatus } from './lib/online-status';
import { queryPersister } from './lib/query-persister';
import './index.css';

// Phase 1 of the offline stack — boot the connection probe immediately so the
// OfflineBadge in AppShell shows accurate state on first render.
initOnlineStatus();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Field staff are often offline. Trade some freshness for usability:
      // serve cached data first, refetch in background.
      staleTime: 30_000,
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
