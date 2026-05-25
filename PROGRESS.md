# SADP-II Monitoring — Progress Snapshot

Last updated: 2026-05-24 · HEAD: `8f2aec7`

A handoff document so the project can be picked up from another machine without
re-explaining context. Read this top-to-bottom; everything you need to resume
is here or one link away.

---

## 1. Quick orientation

| | |
|---|---|
| **Live app** | https://sadp-ii-monitoring.onrender.com (auto-deploys from `main`) |
| **GitHub repo** | https://github.com/EhsanRiz/sadp-ii-monitoring |
| **Supabase project** | ref `urvecgqgxjwlznltjeap` |
| **Project home (iCloud)** | `~/Documents/Claude/Projects/SADP Monitoring/` |
| **Owner** | Ehsan Rizvi · 4D Climate Solutions · super admin of the app |
| **Hosting** | Render Static Site, auto-redeploys on push to `main` |
| **Stack** | Vite + React 18 + TypeScript + Tailwind + shadcn/ui PWA, backed by Supabase (Postgres + Auth + Storage + Edge Functions + RLS) |

---

## 2. What's live (Phase 1 + Phase 2)

### Phase 1 — foundation ✅
- Schema (migrations `010` – `140`): organizations, rounds, user_profiles,
  districts, community_councils, resource_centers, villages,
  enterprise_types, enterprises, audit_log, storage buckets,
  advisor security/perf fixes.
- Auth + RLS with JWT custom claims via `custom_access_token_hook`
  (`organization_id`, `user_role`). RBAC: `super_admin` /
  `team_leader` / `me_officer` / `field_supervisor`. Non-admin users
  scoped to their own org.
- Admin pages: Organizations, Users (invite via edge function),
  Districts, Community Councils, Resource Centers, Enterprise Types.
- Enterprise list / detail / new pages with district + RC + type filters.
- Cover-page PDF (Annex V/A "I. PROJECT SUMMERY FORM") via
  `@react-pdf/renderer` at `/enterprises/:id/cover-page.pdf` — gated by
  `isCoverPageReady()`.
- Audit-log trigger on `enterprises` (server-recorded, read-only from client).
- 164 4D enterprises imported with progress on 5 dimensions
  (cover-page, ESMP, business plan, M1 report, drilling).

### Phase 2 — ESMP digital forms ✅
- 3-table architecture (not a unified model — explicit user decision):
  - `essf_submissions` — Environmental & Social Screening Form, one per
    enterprise.
  - `emmp_templates` + `emmp_submissions` — 12 EMMP templates seeded
    (jsonb schemas in DB), one submission per enterprise.
  - `inspection_visits` — universal 21-aspect compliance checklist,
    many per enterprise.
- ESSF + Inspection schemas in TypeScript (`src/forms/`); EMMP schemas in DB.
- React Query hooks in `src/lib/esmp.ts` with `canSubmit` / `canApprove` /
  `canApproveSubmission` (the last enforces no-self-approval; super admin exempt).
- Form renderers in `src/components/forms/`: `EssfFormRenderer`,
  `EmmpFormRenderer`, `InspectionFormRenderer`. All use the colored
  `StatusPill` primitive.
- Edit pages: `EssfEditPage`, `EmmpEditPage`, `InspectionEditPage` with
  Save / Submit / Approve gated by role. Toast notifications on
  save/submit/approve.
- `enterprise_esmp_status` view computes overall status (`not_started` /
  `in_progress` / `complete`) — surfaced on the ESMP tab.
- `enterprise_m1_ready` view rolls up cover-page + ESSF + EMMP into a
  single boolean for M1 readiness.
- Enterprise detail ESMP tab restructured: ESSF / EMMP / Inspection
  visits as separate cards with colored left borders by status, plus a
  collapsible legacy scanned-PDF upload.

### UX polish pass ✅
- Semantic color tokens: `success` / `warning` / `info` + tint backgrounds,
  defined as CSS vars in `src/index.css` and Tailwind classes — shared
  across all status surfaces.
- Sonner toaster wired at app root for save / submit / approve feedback.
- Recharts added for dashboard data viz.
- New primitives: `Skeleton`, `EmptyState`, `StatusPill`, plus
  `src/lib/enterprise-icons.ts` (21 enterprise types → lucide icon + tint).
- Dashboard rebuilt: stat cards with colored icon tiles + mini progress bars,
  donut chart of enterprises by type, horizontal "M1 readiness pipeline"
  bar, stacked district-readiness chart when scope spans multiple districts.
- Enterprise list: card-grid / table view toggle (persisted in
  localStorage), per-enterprise type icon, **5 colored dots** + count
  showing progress across 5 dimensions (changed from a 5-segment colored
  stripe — that was visually noisy when many cards shared the same state).
- Enterprise detail: type icon in header, "Progress at a glance" card
  on the Progress tab with colored bars per dimension.

### ESMP report PDF ✅
- Route: `/enterprises/:id/esmp.pdf` (gated on ESSF existing).
- Renderer: `src/pdf/EsmpPdf.tsx` using `@react-pdf/renderer`.
- Format matches the Thaba Lifika sample (see
  `reference_documents/ESMP_MAQALIKA_AGRIFARM_sample.pdf`):
  - Cover page (district, round, date, sub-project rep, name + address,
    extension team rep + address).
  - ESSF section 1 (site sensitivity, with selected descriptor highlighted).
  - ESSF section 2 (completeness, Y/N/NA ticks).
  - ESSF section 3 (24-q checklist + right-hand ESMF Guidance column —
    canonical guidance text was seeded into `essfSchema.ts`).
  - EMMP landscape page with repeating header strip and 7-column header
    on every page break; selected impacts/mitigations/monitoring items
    get a ✓ bullet, unselected get a faint ·, person/timeframe columns
    pull from filled values with template defaults as fallback.
- Button "ESMP report" appears on enterprise detail header next to
  "Cover-page PDF".

---

## 3. Recent commits (most recent first)

```
8f2aec7  feat: full ESMP report PDF + dots-style progress on list
77d12ef  ux: colorful, interactive polish across the app
fb43c01  fix: TS build error in database.ts (stray brace) + 3 follow-ons
3809ec6  phase-2 session B: ESMP forms in-app (ESSF, EMMP, inspection visits)
fd0616b  Phase 2 foundation: ESMP form tables + 12 EMMP templates seeded
fee07b2  supabase: storage buckets + advisor security/perf fixes (already live)
```

---

## 4. Architecture decisions (locked-in)

| | |
|---|---|
| **3 separate ESMP tables** | NOT a unified table with a `kind` discriminator. `essf_submissions`, `emmp_*`, `inspection_visits`. Decided to keep each form's queries simple and let each evolve independently. |
| **ESSF + Inspection in code, EMMP in DB** | ESSF + Inspection schemas are universal — TypeScript. EMMP varies per enterprise type (12 templates) — jsonb in `emmp_templates`. |
| **No self-approval** | M&E Officer + Team Leader + Super Admin can approve, but not their own submission (Super Admin exempt from the self-check). Enforced in `canApproveSubmission` and surfaced as a disabled "Approve" button. |
| **Computed status, not stored** | Overall ESMP state lives in `enterprise_esmp_status` view, not a column. Avoids drift; always reflects the underlying submissions. |
| **Security-invoker views** | All views use `security_invoker = on` to respect RLS. Don't use `SECURITY DEFINER` unless absolutely necessary; advisors will flag it. |
| **Field supervisors fill compliance** | Service Providers do NOT interact with the app. Field Supervisors fill the inspection checklist on visits. |
| **Hybrid annex strategy for M1** | Business plan source per enterprise: `uploaded` (legacy approved BP PDF on file → Annex I/II embedded by reference) vs `in_app` (BP filled digitally → Annex I/II auto-generated from structured data). Lets us transition off paper without forcing re-keying for 164 existing enterprises. |

---

## 5. Conventions

- **"Quithing"** spelling locked (not "Quthing").
- **Districts**: 4D → Maseru, Berea, Thaba Tseka. RSDA → Mafeteng, Mohale's Hoek, Quithing, Qacha's Nek.
- **iCloud, not Google Drive** — project lives at `~/Documents/Claude/Projects/SADP Monitoring/`. Don't sync to or work from Google Drive.
- **Auto-execute via MCP** when possible — Supabase MCP for `execute_sql` / `apply_migration` / `deploy_edge_function` / `get_advisors`. Don't hand SQL back to the user to paste unless the operation specifically can't be done via MCP.
- **Brand palette**: primary `#006838` (dark green), accent `#8DC63F` (lime), plus semantic `success` / `warning` / `info` / `destructive` and tints.

---

## 6. Paused / awaiting input

### Milestone 1 module (paused)
- One sample received: `AILAM MILESTONE 1 BUDGET.pdf` — page 1 is the
  Budget Allocation table (Suppliers × Budget item × budgeted /
  quoted / variance / proposed / proposed-supplier / comments) with
  Beneficiary + SP + PFO signature blocks; pages 2-6 are attached
  supplier quotations; page 7 is Annex I (Project Budget from the
  business plan); page 8 is Annex II (Procurement Plan).
- Decision: **wait for the rest of the M1 doc samples** (Narrative
  Progress Report, Cashbook, Financial Report, Bank Reconciliation,
  Bank statements/payments) before designing the M1 schema and forms.
  Designing all at once avoids two rounds of migration.
- M1 module will bring the business plan along with it as a prerequisite
  (needed for Annex I + II in the Budget PDF, and for any
  budget-vs-actual computation downstream).
- Source folder of submitted M1 budgets (just connected):
  `OneDrive-SharedLibraries-4DClimateSolutions/4D Climate Solutions - SADP II/Milestone Budget Documents (1)/`
  — organized by district → SP → enterprise. Already 50+ enterprises
  with submitted budget PDFs.

### Open UI verification (waiting on user testing)
- Walk through Hansen (or any enterprise with both ESSF + EMMP filled)
  on `https://sadp-ii-monitoring.onrender.com` and compare the
  generated ESMP report against `reference_documents/ESMP_MAQALIKA_AGRIFARM_sample.pdf`.
  Likely small format tweaks: column widths, font sizes, phase header
  color, exact ✓/· rendering, footer text inside the checklist table.
- Verify the 5-dot progress strip on the enterprise list reads cleanly
  across the 164 enterprises (the prior 5-segment stripe version was
  noisy).

---

## 7. Continuing from another machine

```bash
# 1. clone
git clone https://github.com/EhsanRiz/sadp-ii-monitoring.git
cd sadp-ii-monitoring

# 2. env (copy .env.example then fill in the Supabase URL + anon key)
cp .env.example .env.local
# VITE_SUPABASE_URL=https://urvecgqgxjwlznltjeap.supabase.co
# VITE_SUPABASE_ANON_KEY=<get from Supabase dashboard > Project Settings > API>

# 3. install + run
npm install
npm run dev       # local dev at http://localhost:5173

# 4. verify before pushing
npx tsc -b        # type check (this is what Render runs; tsc --noEmit is laxer)
npm run build     # full prod build (vite + workbox)

# 5. push — Render auto-deploys
git push origin main
```

For Supabase migrations, the Supabase MCP is already connected on this
machine — use `apply_migration` for DDL and `execute_sql` for SELECT/DML.
Project ref: `urvecgqgxjwlznltjeap`.

---

## 8. Useful paths

```
src/
  pages/
    DashboardPage.tsx                       # rebuilt with charts
    enterprises/
      EnterprisesListPage.tsx               # card/table toggle + 5 dots
      EnterpriseDetailPage.tsx              # ESMP tab + Progress tab + icon header
      EssfEditPage.tsx
      EmmpEditPage.tsx
      InspectionEditPage.tsx
      CoverPagePdfRoute.tsx                 # Phase 1
      EsmpPdfRoute.tsx                      # Phase 2
    admin/                                  # super-admin-only pages
  components/
    forms/EssfFormRenderer.tsx
    forms/EmmpFormRenderer.tsx
    forms/InspectionFormRenderer.tsx
    StatusBadge.tsx                         # icon-prefixed colored badge
    ui/status-pill.tsx                      # colored pill button (forms)
    ui/skeleton.tsx
    ui/empty-state.tsx
  lib/
    auth.ts
    enterprises.ts
    esmp.ts                                 # React Query hooks + role helpers
    enterprise-icons.ts                     # 21 type → icon + tint
    catalogs.ts
  forms/
    essfSchema.ts                           # ESSF (with ESMF Guidance column)
    inspectionSchema.ts                     # 21-aspect inspection
  pdf/
    CoverPagePdf.tsx                        # Phase 1
    EsmpPdf.tsx                             # Phase 2

supabase/
  migrations/                               # 010 … 152
  seeds/
    140_seed_rsda_districts.sql
    160_emmp_templates.sql                  # 12 EMMP templates
  functions/invite-user/                    # deployed edge function

docs/
  PHASE_1_DESIGN.md
  PHASE_1_QUICKSTART.md
PROGRESS.md                                 # this file
```

---

## 9. Things to remember

- **Don't trust local `tsc --noEmit`** — Render runs `tsc -b` (project mode)
  which is stricter. Run `npx tsc -b` locally before pushing or you'll
  catch errors only after Render rejects the deploy.
- **iCloud locks the project folder's `.git`** — work-around: rsync the
  project to `/tmp/sadp-icloud/` for git operations, keep file edits in
  the iCloud path so they sync to other machines.
- **PWA workbox precache ceiling** is now `5 MiB` (was the 2 MiB default).
  Bundle is ~2.1 MB so this is a buffer.
- **GitHub PAT** used for pushes on this machine should be rotated when
  picking up on another — it's been used in shell commands here and
  should be revoked + reissued for security hygiene.
