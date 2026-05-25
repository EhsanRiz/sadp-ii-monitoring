# SADP-II Monitoring — New-machine bootstrap

Step-by-step to get from a fresh macOS install to a running local dev
environment, with the ability to push changes that auto-deploy to
https://sadp-ii-monitoring.onrender.com.

Estimated time end-to-end: ~15 minutes if you already have a GitHub
login and Supabase access; ~30 minutes from a fully clean machine.

If you're not on macOS, the same steps work on Linux — swap Homebrew
for your distro's package manager. Windows: WSL2 strongly recommended.

---

## 1. Prerequisites (one-time per machine)

Open Terminal and run:

```bash
# Homebrew — package manager. Skip if already installed.
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Git + Node 20+ (Render uses 26 in CI but 20+ is fine for local dev)
brew install git node@20

# Make node@20 the default `node` / `npm` if Homebrew didn't link it
brew link --overwrite node@20

# Verify
git --version       # any recent version
node --version      # v20.x or newer
npm --version       # any recent version
```

If you use **Cursor** or **VS Code**, install those too (one-time):

```bash
brew install --cask cursor       # or: brew install --cask visual-studio-code
```

---

## 2. Authenticate to GitHub

If `git` isn't already authenticated for `EhsanRiz`:

```bash
# easiest: install GitHub CLI and log in interactively
brew install gh
gh auth login
# follow prompts: GitHub.com → HTTPS → Login with web browser
```

This stores credentials in macOS Keychain and `git push` just works.

> The personal-access-token in the previous session's shell history
> should be **revoked** on https://github.com/settings/tokens before
> anything else — it was used in `git push` commands in the chat log.
> If you want to mint a new PAT instead of using `gh`, scope it to
> just `repo` and add `-X --no-include-email` so it never logs.

---

## 3. Clone the repo

```bash
# Pick wherever you keep code — example: ~/Code
mkdir -p ~/Code && cd ~/Code

git clone https://github.com/EhsanRiz/sadp-ii-monitoring.git
cd sadp-ii-monitoring
```

> **Don't put this inside iCloud Drive or Google Drive.** iCloud locks
> `.git/index.lock` mid-write and you'll get phantom "another git
> process is running" errors. Keep the repo in a normal local folder
> like `~/Code/` or `~/Documents/Claude/Projects/` (the iCloud
> Documents folder works on most setups, but pure local is safest).

---

## 4. Configure Supabase env vars

```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and fill in:

```ini
VITE_SUPABASE_URL=https://urvecgqgxjwlznltjeap.supabase.co
VITE_SUPABASE_ANON_KEY=<paste anon key here>
```

To get the anon key:

1. Go to https://supabase.com/dashboard/project/urvecgqgxjwlznltjeap/settings/api
2. Under "Project API keys" copy the value labelled `anon` `public`
3. Paste it as the `VITE_SUPABASE_ANON_KEY` value in `.env.local`

> The anon key is safe to ship to the browser — RLS policies enforce
> auth on the database side. Just don't commit `.env.local` (it's
> already in `.gitignore`).

---

## 5. Install dependencies and verify

```bash
npm install                # ~1-2 min on first run

# Sanity: build the same way Render does
npx tsc -b                 # type check (project mode — stricter than `tsc --noEmit`)
npm run build              # full prod build (Vite + workbox PWA)

# Run locally
npm run dev                # http://localhost:5173
```

Sign in at http://localhost:5173 with your normal `sehsan.rizvi@gmail.com`
super-admin credentials. You should land on the Dashboard and see both
4D and RSDA sections with all 164 enterprises.

---

## 6. Daily workflow

```bash
git pull                                # grab anything from Render-side commits
# … edit code …
npx tsc -b && npm run build             # ALWAYS run these before pushing
git add -A
git commit -m "feat: …"
git push                                # Render auto-redeploys main in ~2 min
```

> **Critical:** Render runs `tsc -b`, not `tsc --noEmit`. The two
> behave differently — `tsc --noEmit` will pass on errors that
> `tsc -b` catches. Always run `npx tsc -b` locally before pushing
> or your deploy will fail.

Watch deploy logs at https://dashboard.render.com → `sadp-ii-monitoring`.

---

## 7. (Optional) Wire up Claude Code with the project's MCP servers

The project uses Supabase MCP for migrations + advisor checks. To
re-connect on the new machine, install Claude Code and add the
Supabase MCP:

```bash
# Install Claude Code (if not already)
brew install --cask claude

# Then in any Claude Code session:
#   /mcp add supabase --url <stdio command for the supabase-mcp server>
# See: https://docs.claude.com/en/docs/claude-code/mcp
```

In the MCP config, register the Supabase project ref:
**`urvecgqgxjwlznltjeap`**

For non-MCP Supabase access, install the CLI:

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref urvecgqgxjwlznltjeap
```

---

## 8. (Optional) Connect cloud folders for source docs

If you want to read/write the OneDrive + Google Drive folders Claude
was working with (ESMP forms, Milestone budgets, SADP II planning),
sign into the cloud apps and add them via Finder:

- **OneDrive (4D Climate Solutions)** — `4D Climate Solutions - SADP II/` (contains `ESMP forms/` and `Milestone Budget Documents (1)/`)
- **Google Drive** — `My Drive/SADP II/`

Then in a Cowork / Claude session on the new machine, grant access by
folder selection or path:

```
/Users/<your-username>/Library/CloudStorage/OneDrive-SharedLibraries-4DClimateSolutions/4D Climate Solutions - SADP II/ESMP forms
/Users/<your-username>/Library/CloudStorage/OneDrive-SharedLibraries-4DClimateSolutions/4D Climate Solutions - SADP II/Milestone Budget Documents (1)
/Users/<your-username>/Library/CloudStorage/GoogleDrive-sehsan.rizvi@gmail.com/My Drive/SADP II
```

Substitute the actual username.

---

## 9. Onboarding Claude to the project context

Once you're set up, the fastest way to get a fresh Claude session
caught up is to point it at the existing handoff doc:

> "Read PROGRESS.md in this repo and continue from where the last
> session left off. We're paused on the Milestone 1 module waiting for
> Narrative Report / Cashbook / Financial Report / Bank Reconciliation
> samples. The most recent visible-to-the-user changes are the
> dashboard rebuild, the 5-dot progress indicators, and the
> `/enterprises/:id/esmp.pdf` route."

Claude will read [PROGRESS.md](./PROGRESS.md), absorb the architecture
decisions and conventions, and pick up coherently. No need to
re-explain Quithing spelling, the 3-table ESMP design, or any of the
other decisions.

---

## 10. Common pitfalls (read these once)

| Symptom | Cause | Fix |
|---|---|---|
| `tsc --noEmit` passes locally but Render build fails | Render uses `tsc -b` which is stricter | Always run `npx tsc -b` before pushing |
| `fatal: Unable to create '.git/index.lock'` | Repo is inside iCloud / Google Drive sync folder | Move the working copy to a plain local folder |
| `Cannot find module @rollup/rollup-*` after `npm install` | npm optional-deps bug | `rm -rf node_modules package-lock.json && npm install` |
| Vite build fails on workbox precache size | Bundle > 5 MiB | `vite.config.ts` has `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` — bump if needed |
| Supabase queries return empty unsigned-in | RLS — you're not authenticated | Sign in at the login page; super-admin sees everything cross-org |
| Render deploy stuck | Manual redeploy from dashboard | https://dashboard.render.com → `sadp-ii-monitoring` → "Manual Deploy" |

---

## 11. Quick reference

| | |
|---|---|
| Live app | https://sadp-ii-monitoring.onrender.com |
| Repo | https://github.com/EhsanRiz/sadp-ii-monitoring |
| Supabase project ref | `urvecgqgxjwlznltjeap` |
| Supabase dashboard | https://supabase.com/dashboard/project/urvecgqgxjwlznltjeap |
| Render dashboard | https://dashboard.render.com |
| Progress doc | [PROGRESS.md](./PROGRESS.md) |
| Design doc | [docs/PHASE_1_DESIGN.md](./docs/PHASE_1_DESIGN.md) |
| Local dev URL | http://localhost:5173 |
