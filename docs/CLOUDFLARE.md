# Hosting on Cloudflare Pages

The app is a static Vite + React PWA that talks to Supabase. The frontend host
is independent of Supabase, so moving from Render to **Cloudflare Pages** only
changes who serves the HTML/JS — no backend changes.

This repo already contains the two config bits the move needs:

- `public/_redirects` — SPA fallback (`/* /index.html 200`) so deep links and
  refresh work. Served to `dist/_redirects` at build.
- `.node-version` (`22`) — pins the Node version Cloudflare builds with, matching CI.
- `wrangler.jsonc` — for a Cloudflare **Workers** project (where the deploy step
  runs `wrangler deploy`), this ships `dist/` as **static assets** with SPA
  routing. Without it, `wrangler deploy` tries to auto-configure the Vite plugin,
  which requires Vite ≥ 6 (this app is on Vite 5) and the deploy fails. If you
  instead use a classic **Pages** project (build command + output dir, no deploy
  command), `wrangler.jsonc` is simply ignored.

Everything below is done once in the Cloudflare dashboard + your DNS. None of it
needs a code change.

## 1. Create the Pages project

Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** →
pick `EhsanRiz/sadp-ii-monitoring`, branch `main`.

Build settings:

| Setting | Value |
|---|---|
| Framework preset | None (or Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `22` (picked up from `.node-version`) |

## 2. Environment variables

Add these under **Settings → Environment variables** (Production), using the
same values your Render deploy uses — they are the Supabase **publishable**
(client) values, safe to expose in the bundle:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do **not** put any service-role / secret key here. Trigger a deploy after saving.

## 3. Custom domain (this is what protects the tablets)

Field tablets have the PWA installed at a URL. Keep that URL stable by serving it
from Cloudflare:

1. Pages project → **Custom domains → Set up a domain** → enter your domain
   (e.g. `sadp.4dcs.example`).
2. Point its DNS at Cloudflare as instructed (a CNAME to the `*.pages.dev`
   target, or move the zone's nameservers to Cloudflare if the domain isn't
   there yet). Cloudflare issues the HTTPS certificate automatically.
3. Once the custom domain resolves to the Pages deploy, the tablets keep working
   with **no reinstall** — same URL, new host.

> If staff currently open the raw `onrender.com` URL instead of a custom domain,
> moving hosts changes the URL and tablets would need the app re-added once. Set
> up the custom domain first to avoid that.

## 4. Cut over

1. Confirm the Cloudflare deploy works on the `*.pages.dev` preview URL (sign in,
   open an enterprise, go offline/online).
2. Point the custom domain at Cloudflare (step 3).
3. Tablets: once online, the PWA's reload prompt picks up the new build. Staff
   tap **Reload** once. (First load after cutover must be online.)
4. Optionally keep Render running a few days as a fallback, then disable its
   auto-deploy so only Cloudflare builds from `main`.

## Notes

- Supabase Edge Functions, Storage, and the database are unaffected — they stay
  on Supabase.
- The service worker and offline queue behave the same on Cloudflare; the build
  output is identical.
- `_redirects` is applied only on Cloudflare Pages; Render ignores it.
