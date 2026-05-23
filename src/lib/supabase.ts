import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't throw — let the login page show a friendlier error.
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in real values.',
  );
}

/**
 * Typed Supabase client. Generate types after running migrations:
 *   supabase gen types typescript --linked > src/types/database.ts
 *
 * The placeholder in src/types/database.ts is sufficient to compile until
 * you've linked a real project.
 */
export const supabase = createClient<Database>(url ?? 'http://localhost:54321', anonKey ?? 'placeholder-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
