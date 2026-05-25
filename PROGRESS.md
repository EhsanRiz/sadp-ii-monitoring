# SADP-II Monitoring — Progress Snapshot

Last updated: 2026-05-25 (end of session) · HEAD: `1640494`

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
| **Project home (iCloud)** | `~/Documents/Claude/Projects/SADP II/` |
| **Owner** | Ehsan Rizvi · 4D Climate Solutions · super admin of the app |
| **Hosting** | Render Static Site, auto-redeploys on push to `main` |
| **Stack** | Vite + React 18 + TypeScript + Tailwind + shadcn/ui PWA, backed by Supabase (Postgres + Auth + Storage + Edge Functions + RLS) |

---

## 2. What's live

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
  `isCoverPageReady()`. Now also reused as page 1 of `m1.pdf`.
- Audit-log trigger on `enterprises` (server-recorded, read-only from client).
- 164 4D enterprises imported with progress on 5 dimensions
  (cover-page, ESMP, business plan, M1 report, drilling).

### Phase 2 — ESMP digital forms ✅
- 3-table architecture (not a unified model — explicit user decision):
  `essf_submissions`, `emmp_templates` + `emmp_submissions`,
  `inspection_visits`. ESSF + Inspection schemas in TypeScript;
  EMMP schemas in DB (12 templates seeded).
- React Query hooks in `src/lib/esmp.ts` with `canSubmit` / `canApprove` /
  `canApproveSubmission` / `canReopen` (no-self-approval enforced;
  super admin exempt).
- Form renderers in `src/components/forms/`: `EssfFormRenderer`,
  `EmmpFormRenderer`, `InspectionFormRenderer`. Colored `StatusPill` primitive.
- Edit pages: `EssfEditPage`, `EmmpEditPage`, `InspectionEditPage` with
  Save / Submit / Approve / **Reopen-for-editing** gated by role.
- `enterprise_esmp_status` view → status pill on the ESMP tab.
- `enterprise_m1_ready` view rolls up cover-page + ESSF + EMMP for M1
  readiness.
- ESSF and EMMP edit pages have **Print / PDF** buttons (open `esmp.pdf`)
  and **Reopen-for-editing** action when status='approved'. Trail card
  shows "Reopened for editing — previously approved on …" when
  `status=='draft' && approved_at != null`.

### ESMP report PDF ✅ (with checkbox-style EMMP)
- Route: `/enterprises/:id/esmp.pdf` (gated on ESSF existing).
- Renderer: `src/pdf/EsmpPdf.tsx` using `@react-pdf/renderer`.
- Format matches the Thaba Lifika sample
  (`reference_documents/ESMP_MAQALIKA_AGRIFARM_sample.pdf`):
  - Cover page (district, round, date, sub-project rep, name + address,
    extension team rep + address).
  - ESSF section 1 (site sensitivity, with selected descriptor highlighted).
  - ESSF section 2 (completeness, Y/N/NA ticks — rendered as SVG `<Check />`
    because the default Helvetica font in `@react-pdf/renderer` doesn't
    include U+2713).
  - ESSF section 3 (24-q checklist + ESMF Guidance column).
  - **Certification block** at end of section 3.0: body text + SIGNATURES
    with two signature lines (Extension Team Rep + Sub-project Rep, each
    with a Date column). Populates names/dates from `essf.signed.*` when
    captured; otherwise blank lines for physical sign-off.
  - EMMP landscape page with repeating header strip.
  - **EMMP items render as checkboxes** (☑ when ticked, ☐ when not) via
    a small `<CheckBox />` SVG component — printed-form style.
  - **NOT APPLICABLE auto-fill** on empty trailing-3-column cells
    (Person to Implement / Person to Monitor / Time Frame). Per-cell
    check: shows italic muted "NOT APPLICABLE" when the cell is blank.
    Item-list columns (impacts/mitigations/monitoring) ALWAYS render so
    the printed PDF stays self-documenting.
  - **EMMP signature block** at end (matches reference page 10): 2×2 grid
    — Beneficiary + Extension Agent on top row; PFO + Service Provider
    on bottom row. Beneficiary line pre-fills the applicant org name.

### PDF auto-extraction (ESSF + EMMP from a scanned PDF) ✅
- New module: lets a field supervisor drop a scanned ESMP PDF into the
  Legacy PDF section, click **Extract responses**, and get pre-filled
  draft ESSF + EMMP submissions to review.
- Edge function: `extract-esmp-pdf-v4` (deployed; older slugs `-v1/-v2/-v3`
  exist but only `-v4` is current; see §6 for the "stuck-slug" deploy
  bug). Sends the PDF to Claude Sonnet 4.5 with the ESSF schema + the
  EMMP template for the enterprise type and asks for strict JSON.
  Returns:
    - `essf.header / site_sensitivity / completeness / checklist`
    - `emmp.checks` array of **item ids verbatim from the schema**
      (e.g. `1.1.r5.m2`) plus `<row.id>.person_implement /
      person_monitor / timeframe` text fields
    - `notes[]` with confidence flags per field
- Writes draft `essf_submissions` + `emmp_submissions` rows stamped with
  `imported_from_pdf_path` / `imported_at` / `import_notes`. Refuses to
  overwrite an approved submission (409 → UI shows "Reopen first"
  with deep links).
- UI:
  - "Extract responses" button on the Legacy PDF section, disabled when
    EITHER ESSF or EMMP is approved (with an inline reopen guide).
  - On `EssfEditPage` / `EmmpEditPage`: amber **"Auto-imported from PDF —
    please review before submitting"** banner when
    `imported_from_pdf_path` is set; lists Claude's confidence notes.
- **Anthropic API key** is stored as a Supabase secret named
  `ANTHROPIC_API_KEY`. Set already as of 2026-05-25; rotate if needed.

### UX polish pass ✅
- Semantic color tokens: `success` / `warning` / `info` + tint backgrounds.
- Sonner toaster wired at app root for save / submit / approve feedback.
- Recharts for dashboard.
- Primitives: `Skeleton`, `EmptyState`, `StatusPill`, plus
  `src/lib/enterprise-icons.ts` (21 enterprise types → lucide icon + tint).
- Dashboard rebuilt: stat cards, donut chart of enterprises by type,
  horizontal "M1 readiness pipeline" bar, stacked district-readiness chart.
- Enterprise list: card-grid / table view toggle (persisted), per-enterprise
  type icon, **5 colored dots** showing progress across 5 dimensions.
- Enterprise detail: type icon in header, "Progress at a glance" card.
- **Legacy PDF section cleaned up**: dropdown for "Update legacy status"
  removed (was a Phase-1 holdover that contradicted the computed view).
  File card now shows constructed display name + size + upload date.
- **Back-to-ESMP navigation**: "Back to enterprise" links on ESSF / EMMP
  / M1 edit pages return to the ESMP tab via `?tab=esmp` query param.
- New row on Vegetable Production EMMP template: **3.4 Climate Change**
  with sensible Lesotho-highlands defaults (migration `161`).

### Phase 3 (in-flight) — Milestone 1 module 🚧
**Phase 1 of M1 is live** (commit `1640494`). The full M1 module is
phased into three commits, all designed against the same schema:

- **Migration `180`** (applied 2026-05-25) creates `m1_submissions` (one
  per enterprise, 4 jsonb columns: `narrative` / `cashbook` /
  `financial_report` / `bank_reconciliation`), `m1_supporting_documents`
  (many per submission, kind enum), `m1-supporting-docs` storage bucket,
  and `enterprise_m1_status` view. RLS + audit triggers wired same as
  ESSF/EMMP. Schema is **complete** — Phase 2 and Phase 3 add UI only,
  no further migrations.

**Phase 1 ✅ — Narrative + scaffold:**
- `M1EditPage` at `/enterprises/:id/m1` with tabs: **Narrative** (active),
  **Cashbook / Financial Report / Bank Reconciliation / Supporting Docs**
  (placeholders).
- 7-section narrative form (`src/forms/m1NarrativeSchema.ts` — sections
  identical across every sampled OneDrive M1 report). Progress strip
  shows "N / 7 sections filled".
- React Query hooks in `src/lib/m1.ts` mirror `lib/esmp` exactly:
  `useM1Submission`, `useSaveM1Draft`, `useTransitionM1`, plus
  `canSubmitM1` / `canApproveM1` / `canApproveM1Submission` / `canReopenM1`.
- M1 PDF at `/enterprises/:id/m1.pdf`: Cover page (reuses
  `CoverPagePdfPage` — no duplication) + Narrative pages.
- Status card on the enterprise ESMP tab between Inspection visits and
  Legacy PDF — shows badge + dates + Open M1 / Start M1 + M1 report
  PDF link.
- Save / Submit / Approve / Reopen-for-editing flow + Print/PDF button.

**Phase 2 ⏳ — pending build:**
- Cashbook form (line-item editor): Date / Item / Budget code / Supplier
  / Description / Credit / Debit. Accum + Balance + Budget Balance
  **auto-computed** (user decision).
- Financial Report form: categorised line items (A. Project Implementation
  Costs / B. Inputs / C. Labour / D. Transportation / E. Travel / F. Other
  / II. Technical Assistance / III. Technology Transfer) with auto
  20% / 20% / 60% Beneficiary / IFAD / Grant-IDA source-of-funds split.
- Bank Reconciliation form: fixed-field. Net Surplus / Difference /
  Unexplained Differences auto-computed — last one must reach 0.
- Extend `M1Pdf.tsx` to include those three sections after the narrative.

**Phase 3 ⏳ — pending build:**
- Supporting documents uploader: multi-file, kind-tagged (bank_statement
  / transaction_history / invoice / receipt / audit_trail / contract /
  other). Storage bucket and `m1_supporting_documents` table are
  already in place.
- `extract-m1-pdf` edge function: same pattern as `extract-esmp-pdf-v4`.
  Reads uploaded scanned M1 PDF, sends to Claude, writes draft for the 4
  M1 forms. Supporting docs themselves aren't extracted — they stay as
  PDF attachments tagged by kind.
- Embed supporting docs by reference at the back of `m1.pdf`, then a
  compendium of ESSF + EMMP + most-recent Inspection.

**Business plan**: deferred (per current decision). M1 works standalone
without a separate BP module.

---

## 3. Recent commits (most recent first)

```
1640494  feat(m1): Phase 1 — Narrative form + M1 page scaffold + M1 PDF
41c5b0e  ux: simplify Legacy PDF section + return to ESMP tab from sub-form pages
0bc8070  fix: align EMMP key scheme across form, PDF, edge function (+ broken review links)
4992d7a  fix(extract): surface real edge function errors + guard against approved 409
3a0fae7  fix(ui): show file card with name/size/upload-date for legacy ESMP PDF
8b05223  fix(extract): teach prompt that ticks live OUTSIDE the box gutter
15c9e35  feat: auto-extract ESMP responses from uploaded PDFs (Claude-powered)
8449ef7  fix(pdf): NOT APPLICABLE belongs in trailing 3 cols, not item lists
a1a5d18  feat(esmp): 3.4 Climate Change row, NOT APPLICABLE fallback, checkbox items, EMMP page Print/Reopen + EMMP signatures
637a5c9  feat(essf): Print/PDF button + Reopen-for-editing on approved ESSFs
ade22a4  fix(pdf): ✓ ticks in ESSF sections 2 + 3 + add Certification block
259e92f  docs: add SETUP.md — new-machine bootstrap walkthrough
b3aa447  docs: add PROGRESS.md handoff snapshot
8f2aec7  feat: full ESMP report PDF + dots-style progress on list
77d12ef  ux: colorful, interactive polish across the app
```

---

## 4. Architecture decisions (locked-in)

| | |
|---|---|
| **3 separate ESMP tables** | NOT a unified table with a `kind` discriminator. `essf_submissions`, `emmp_*`, `inspection_visits`. Each form's queries stay simple. |
| **ESSF + Inspection in code, EMMP in DB** | ESSF + Inspection schemas are universal — TypeScript. EMMP varies per enterprise type (12 templates) — jsonb in `emmp_templates`. |
| **No self-approval** | Same set for ESSF/EMMP/Inspection/M1: super_admin can self-approve, others can't. Reopen-for-editing has the same role set as approve. |
| **Computed status, not stored** | `enterprise_esmp_status` + `enterprise_m1_status` views reflect underlying submissions. Manual status dropdowns were removed. |
| **Security-invoker views** | All views use `security_invoker = on` to respect RLS. |
| **Field supervisors fill compliance** | Service Providers do NOT interact with the app. Field Supervisors fill the inspection checklist on visits. |
| **Hybrid annex strategy for M1** | Originally: BP-uploaded vs BP-in-app for Annex I/II. Current: BP module **deferred** since the M1 samples we have don't embed Annex I/II inline. |
| **EMMP item.id is the canonical response key** | Form, PDF, and edge function all read/write `responses[item.id]` (e.g. `1.1.r5.m2`). Earlier versions used positional `${rowId}.${prefix}${i}` and drifted out of sync with the schema's 1-indexed ids. **Don't reintroduce positional keys.** |
| **PDF auto-extraction is review-only** | The extract edge function ALWAYS writes `status='draft'` and stamps `imported_from_pdf_path`. The UI shows a mandatory review banner. Never bypass human review of extracted data. |
| **Edge function "stuck slug" workaround** | The Supabase deploy API has a bug where re-deploys to a slug whose first version was partial/broken get internal-server-error forever. Workaround: deploy under a fresh `-vN` slug and update the frontend hook to invoke the new slug. See §6. |
| **Original filename not preserved for ESMP PDFs** | `esmp-pdfs/{enterprise_id}.pdf` for stable URLs. The file card constructs a display name from the beneficiary. For M1 supporting docs, original filename IS preserved on `m1_supporting_documents.original_filename`. |

---

## 5. Conventions

- **"Quithing"** spelling locked (not "Quthing").
- **Districts**: 4D → Maseru, Berea, Thaba Tseka. RSDA → Mafeteng, Mohale's Hoek, Quithing, Qacha's Nek.
- **iCloud**, not Google Drive. Repo lives at `~/Documents/Claude/Projects/SADP II/`.
  **`.git` workaround**: iCloud Drive holds the `.git` index.lock open and
  blocks git ops. On this machine the working copy of `.git` lives at
  `/tmp/sadp-icloud/`; source files are mirrored back into the iCloud
  folder via rsync. See §7 for the bootstrap.
- **Auto-execute via MCP** when possible — Supabase MCP for
  `execute_sql` / `apply_migration` / `deploy_edge_function` / `get_logs` /
  `get_advisors`.
- **Brand palette**: primary `#006838` (dark green), accent `#8DC63F`
  (lime), plus semantic `success` / `warning` / `info` / `destructive`.
- **Render uses `tsc -b`** (project mode), NOT `tsc --noEmit`. Always
  run `npx tsc -b` locally before pushing or the deploy will fail.

---

## 6. Edge function deploy quirk — important

Supabase's MCP `deploy_edge_function` has a bug: once a function slug
has any version that failed mid-deploy (or even sometimes for unclear
reasons after the first successful version), **every subsequent deploy
to that slug fails with "Function deploy failed due to an internal
error"** indefinitely. The Supabase API treats the slot as poisoned.

**Workaround**: deploy under a fresh slug suffix (`-v2`, `-v3`, `-v4`…)
and update the frontend hook to invoke the new slug. Earlier slugs stay
deployed (and may still work — they just can't be updated). This is why
the active extraction function is `extract-esmp-pdf-v4` and not the
plainer `extract-esmp-pdf`.

When you add Phase 3's `extract-m1-pdf`:
1. Try `extract-m1-pdf` first.
2. If/when re-deploys start failing, bump to `extract-m1-pdf-v2` and
   update `useExtractM1Pdf` in `src/lib/m1.ts`.

---

## 7. Continuing from another machine

```bash
# 1. clone (DO NOT clone inside ~/Documents/Claude/Projects/ — iCloud
#    blocks .git operations. Use ~/Code/ or similar local path, OR mirror
#    via /tmp/ as below.)
git clone https://github.com/EhsanRiz/sadp-ii-monitoring.git ~/Code/sadp-ii-monitoring
cd ~/Code/sadp-ii-monitoring

# 2. env (copy .env.example then fill in the Supabase URL + anon key from
#    https://supabase.com/dashboard/project/urvecgqgxjwlznltjeap/settings/api )
cp .env.example .env.local
# VITE_SUPABASE_URL=https://urvecgqgxjwlznltjeap.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon key>

# 3. install + run
npm install
npm run dev       # local dev at http://localhost:5173

# 4. verify before pushing
npx tsc -b        # type check (matches Render)
npm run build     # full prod build (vite + workbox)

# 5. push — Render auto-deploys
git push origin main
```

For Supabase migrations: the Supabase MCP is the primary path. From a
Claude session, use `apply_migration` for DDL and `execute_sql` for
SELECT/DML. Project ref: `urvecgqgxjwlznltjeap`.

For auth: install `gh` and run `gh auth login` rather than pasting a PAT.
A PAT pasted in chat has appeared 12+ times in the recent session and
**should be rotated** at https://github.com/settings/tokens. The
existing `github_pat_11BTS6POQ0Donc6AHGZVF3_…` token is considered
compromised.

---

## 8. Useful paths

```
src/
  pages/
    DashboardPage.tsx
    enterprises/
      EnterprisesListPage.tsx
      EnterpriseDetailPage.tsx               # ESMP tab + M1 card + Legacy PDF + Progress + History
      EssfEditPage.tsx                       # + import banner, Print/PDF, Reopen
      EmmpEditPage.tsx                       # + import banner, Print/PDF, Reopen
      InspectionEditPage.tsx
      M1EditPage.tsx                         # Phase 1 active; Phase 2/3 tabs scaffolded
      CoverPagePdfRoute.tsx                  # /cover-page.pdf
      EsmpPdfRoute.tsx                       # /esmp.pdf
      M1PdfRoute.tsx                         # /m1.pdf
    admin/
  components/
    forms/EssfFormRenderer.tsx
    forms/EmmpFormRenderer.tsx
    forms/InspectionFormRenderer.tsx
    forms/M1NarrativeFormRenderer.tsx
    StatusBadge.tsx
    ui/status-pill.tsx
    ui/skeleton.tsx
    ui/empty-state.tsx
  lib/
    auth.ts
    enterprises.ts                            # + useUploadedEsmpPdfMeta + formatBytes
    esmp.ts                                   # ESSF/EMMP hooks + extract + role helpers
    m1.ts                                     # M1 hooks + role helpers
    enterprise-icons.ts
    catalogs.ts
  forms/
    essfSchema.ts
    inspectionSchema.ts
    m1NarrativeSchema.ts                      # 7 sections
  pdf/
    CoverPagePdf.tsx                          # exports CoverPagePdfDocument + CoverPagePdfPage
    EsmpPdf.tsx                               # + Check / CheckBox SVG components + NOT APPLICABLE + EMMP signatures
    M1Pdf.tsx                                 # cover + narrative (Phase 1)

supabase/
  migrations/                                 # 010 … 180
    161_emmp_vegetable_shednets_add_climate_change.sql
    170_esmp_pdf_import_tracking.sql          # imported_* columns on essf + emmp
    180_m1_milestone_one_module.sql           # m1_submissions, m1_supporting_documents, bucket, view
  seeds/
    140_seed_rsda_districts.sql
    160_emmp_templates.sql
  functions/
    invite-user/                              # deployed
    extract-esmp-pdf-v4/                      # deployed; v1/v2/v3 also deployed but stale (stuck-slug)

reference_documents/
  ESMP_MAQALIKA_AGRIFARM_sample.pdf
  4D_Data_Collection_Form_Milestone1.docx
  4D_Enterprise_Database_v_final_draft.xlsx
  Annex_VA_Cover_Page_fields.md

docs/
  PHASE_1_DESIGN.md
  PHASE_1_QUICKSTART.md
PROGRESS.md                                   # this file
SETUP.md                                      # new-machine bootstrap
```

---

## 9. Open follow-ups when resuming

**Security / hygiene (do first):**
- **Rotate the GitHub PAT** at https://github.com/settings/tokens. The
  `github_pat_11BTS6POQ0Donc6AHGZVF3_…` token was used in 12+ commits via
  inline-URL push in chat. Replace future-machine setup with
  `gh auth login`.

**M1 Phase 2 — pending build (next sprint):**
- `M1CashbookFormRenderer` — line-item editor with auto-computed running totals
- `M1FinancialReportFormRenderer` — categorised line items with 20/20/60 source-of-funds split
- `M1BankReconciliationFormRenderer` — fixed-field form, Unexplained-Differences must reach 0
- Extend `M1Pdf.tsx` to include those three sections

**M1 Phase 3 — pending build:**
- Supporting documents uploader (multi-file, kind-tagged) — schema + bucket already exist
- `extract-m1-pdf` edge function — same pattern as `extract-esmp-pdf-v4`
- Embed supporting docs at the back of `m1.pdf` + compendium of ESSF/EMMP/Inspection

**Testing leftovers from this session:**
- Verify the 5-dot progress strip on the enterprise list reads cleanly
  across all 164 enterprises (deferred from the last test pass).
- Spot-check ESSF/EMMP/Inspection Save/Submit/Approve gating per role.
- Walk through Lekhoakhoa or Maqalika end-to-end with v4 extraction to
  confirm the checkbox-tick reading is now reliable (last partial test
  showed person/timeframe text extracted perfectly, item ticks worked
  for most rows after the gutter-prompt fix).

**Architectural follow-ups:**
- Dashboard "ESMP completed" count still references the legacy
  `esmp_status` column on `enterprises`. If you want it to reflect the
  computed view, rewrite the dashboard query against
  `enterprise_esmp_status`.
- Consider clearing `imported_from_pdf_path` cleanup so re-extracting an
  approved-then-reopened submission doesn't carry stale extraction notes
  forward.

---

## 10. How to onboard a fresh Claude session

> "Read PROGRESS.md in this repo top-to-bottom and continue from where
> the last session left off. We're in M1 Phase 1 — schema and narrative
> form are live as of commit `1640494`. Phase 2 (cashbook, financial
> report, bank reconciliation forms) is next. The PAT used in earlier
> commits is compromised — use `gh auth login` for any pushes from this
> machine."

Claude will absorb the architecture decisions (3-table ESMP, item.id
key scheme, no-self-approval, computed status, stuck-slug edge function
workaround) and the Phase 2 plan without needing them re-explained.
