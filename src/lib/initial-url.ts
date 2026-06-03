/**
 * Snapshot the URL hash + path at module load time.
 *
 * Why this exists:
 * --------------------------------------------------------------------------
 * Supabase's auth client (`createClient` with `detectSessionInUrl: true`)
 * auto-parses `#access_token=...&type=invite|recovery` on page load, sets
 * the session via `setSession`, then clears the hash from the URL via
 * `history.replaceState`. All of that runs in a microtask scheduled by the
 * client constructor.
 *
 * By the time React mounts and our routes start rendering, the hash is
 * GONE — so a route guard that wants to behave differently for an invitee
 * landing for the first time can't tell from `window.location` alone.
 *
 * This module's top-level `const` runs SYNCHRONOUSLY when the module is
 * imported. As long as it's imported BEFORE `@/lib/supabase` (which it is
 * in `main.tsx`), the snapshot captures the original hash before
 * supabase-js gets a chance to strip it.
 */

const rawHash = typeof window !== 'undefined' ? window.location.hash : '';

/** The hash exactly as it appeared on first load (may be empty). */
export const INITIAL_URL_HASH = rawHash;

/**
 * Auth link type extracted from the initial URL hash, if any.
 *
 *   - 'invite'   → user clicked an "accept invitation" email link
 *   - 'recovery' → user clicked a "reset password" email link
 *   - null       → ordinary navigation
 *
 * The hash format is `#access_token=...&...&type=invite&...` per Supabase
 * convention.
 */
export const INITIAL_URL_TYPE: 'invite' | 'recovery' | null = (() => {
  if (rawHash.includes('type=invite')) return 'invite';
  if (rawHash.includes('type=recovery')) return 'recovery';
  return null;
})();
