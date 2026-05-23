# SADP-II Monitoring App

Progressive Web App for **4D Climate Solutions** and **RSDA** to monitor smallholder agriculture enterprises funded under SADP-II in the Kingdom of Lesotho.

> **Status:** Phase 1 in active development. See [`docs/PHASE_1_DESIGN.md`](docs/PHASE_1_DESIGN.md) v0.4 (source of truth) and [`docs/PHASE_1_QUICKSTART.md`](docs/PHASE_1_QUICKSTART.md) (step-by-step).
>
> **Storage:** This repo lives in iCloud Drive (`~/Documents/Claude/Projects/SADP Monitoring/`). It syncs across your Macs automatically. **Don't move it back to Google Drive** — Drive's sync layer fights with git's `.git/index.lock`.

## What's in this repo

```
.
├── docs/                       ← Phase 1 design + quickstart + starter-kit README
├── reference_documents/        ← Annex V/A field reference, source Excel/Docx/PDF
├── extracted_catalog/          ← Normalized 4D geo + enterprise catalog CSVs
├── supabase/
│   ├── config.toml             ← Local Supabase config (Auth Hook enabled)
│   ├── migrations/             ← 10 SQL migrations (010 → 100)
│   ├── seeds/                  ← Idempotent SQL inserts (110, 120, 130)
│   └── functions/
│       └── invite-user/        ← Edge function for Super Admin → invite-by-email
├── scripts/
│   ├── setup_local.sh          ← One-shot: cleanup + git init + first commit
│   ├── load_4d_catalog.py      ← Loads districts/CCs/RCs/villages from CSVs
│   └── round3_import/
│       └── import.py           ← Imports 191 Round 3 enterprises from 4D Excel
├── src/                        ← Vite + React 18 + TypeScript + Tailwind + shadcn/ui
│   ├── lib/                    ← supabase client, auth provider, catalogs, utils
│   ├── components/             ← App shell, RoleGate, shadcn/ui primitives
│   ├── pages/                  ← Routes
│   ├── pdf/                    ← Milestone 1 cover-page renderer (@react-pdf/renderer)
│   └── types/database.ts       ← Supabase row types (placeholder — regenerate)
├── package.json
├── vite.config.ts              ← PWA configured here
├── tailwind.config.js / postcss.config.js
└── tsconfig*.json
```

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix primitives), React Router, React Hook Form + Zod, @tanstack/react-query
- **PDF:** `@react-pdf/renderer` (browser-side, no server dependency)
- **PWA:** `vite-plugin-pwa` (Workbox under the hood; cache-first for assets, network-first for Supabase reads)
- **Backend:** Supabase — Postgres + Auth + Storage + Edge Functions, with RLS

## First-time setup on this machine

```bash
cd "$HOME/Documents/Claude/Projects/SADP Monitoring"

# 1. One-shot cleanup + git init + first commit (idempotent)
bash scripts/setup_local.sh

# 2. Install npm deps
npm install

# 3. Configure environment
cp .env.example .env.local
# edit .env.local — fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

# 4. Spin up local Supabase (uses Docker — see docs/PHASE_1_QUICKSTART.md §3-6)
supabase start
supabase db reset             # applies migrations 010-100

# 5. Seed catalog + import Round 3
cp scripts/.env.example scripts/.env  # then edit with service-role key
python3 scripts/load_4d_catalog.py
python3 scripts/round3_import/import.py

# 6. Generate fresh TypeScript types
npm run supabase:types

# 7. Run the app
npm run dev
```

## Day-to-day on another Mac

iCloud auto-syncs everything except `node_modules/` (gitignored). On a second Mac:

```bash
cd "$HOME/Documents/Claude/Projects/SADP Monitoring"
npm install                # node_modules is per-machine — install fresh
# .env.local is gitignored — copy from your other Mac or recreate
npm run dev
```

> If a file shows up as a `.icloud` placeholder, double-click it in Finder once to force a full download.

## Build + verify

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # tsc + vite build → dist/
```

## Roles

| Role | Scope | Read enterprises | Write enterprises | Admin panel |
|---|---|:-:|:-:|:-:|
| **Super Admin** | Cross-org | ✓ | ✓ | ✓ |
| **Team Leader** | Own org | ✓ | – | – |
| **M&E Officer** | Own org | ✓ | ✓ | – |
| **Field Supervisor** | Own org | ✓ | ✓ | – |

(Full RBAC matrix in `docs/PHASE_1_DESIGN.md` §4. RLS policies are in `supabase/migrations/090_rls_policies.sql`.)

## Phase 2+

ESMP digital forms (Phase 2), full milestone monitoring (Phase 3), report generation (Phase 4), and analytics dashboards (Phase 5) are previewed in `docs/PHASE_1_DESIGN.md` §12. Phase 1 must merge and be demoed before Phase 2 starts.

## License

Internal — 4D Climate Solutions / RSDA. Not for public distribution.
