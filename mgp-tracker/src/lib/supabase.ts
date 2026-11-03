import { createClient } from '@supabase/supabase-js';

// Publishable (client-safe) values for the SADP-II Supabase project.
// Env vars override them if set on the host.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://urvecgqgxjwlznltjeap.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_522ZXWxxc_5S8jidcTT3fg_felz9GLb';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mgp-tracker-auth' },
});

export function normalizePhone(p: string): string {
  const d = (p || '').replace(/\D/g, '');
  return d.length === 8 ? `266${d}` : d;
}

export function phoneToEmail(p: string): string {
  return `${normalizePhone(p)}@tracker.4dcs.co.za`;
}

export function formatPhone(p: string): string {
  const d = p.startsWith('266') ? p.slice(3) : p;
  return d.length === 8 ? `${d.slice(0, 4)} ${d.slice(4)}` : p;
}

/** Live input mask: keeps the 8 local digits and shows them as "xxxx xxxx". */
export function maskPhone(raw: string): string {
  let d = (raw || '').replace(/\D/g, '');
  if (d.length > 8 && d.startsWith('266')) d = d.slice(3);
  d = d.slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
}
