# SADP-II Monitoring — Progress Snapshot

Last updated: 2026-05-27 (Enterprise lifecycle tracker live) · HEAD: `e2e1fb4`

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
  `isCoverPageReady()`. Reused as page 1 of `m1.pdf` via
  `CoverPagePdfPage` export.
  **Refactored 2026-05-25** to match the canonical paper-form layout
  (single bordered table, 4-column nested rows for District/Location
  and Total Grant/Current Grant Payment, inline italic hints in value
  cells, `LSL 500 000.00` currency format, italic signature stand-ins).
- Audit-log trigger on `enterprises` (server-recorded, read-only from client).
- 164 4D enterprises imported with progress on 5 dimensions
  (cover-page, ESMP, business plan, M1 report, drilling).

### Phase 2 — ESMP digital forms ✅
- 3-table architecture (`essf_submissions`, `emmp_templates` + `emmp_submissions`,
  `inspection_visits`). ESSF + Inspection schemas in TypeScript; EMMP schemas in
  DB (12 templates seeded — including **3.4 Climate Change** added 2026-05-25 via
  migration `161`).
- React Query hooks in `src/lib/esmp.ts` with `canSubmit` / `canApprove` /
  `canApproveSubmission` / `canReopen` (no-self-approval enforced; super admin
  exempt).
- Form renderers in `src/components/forms/`: `EssfFormRenderer`,
  `EmmpFormRenderer`, `InspectionFormRenderer`.
- Edit pages with Save / Submit / Approve / **Reopen-for-editing** gated by role.
- `enterprise_esmp_status` view → status pill on the ESMP tab.
- ESSF/EMMP edit pages have **Print / PDF** buttons (open `esmp.pdf`) and
  **Reopen-for-editing**. Trail card shows "Reopened — previously approved on …"
  when `status=='draft' && approved_at != null`.

### ESMP report PDF ✅ (checkbox-style EMMP)
- Route: `/enterprises/:id/esmp.pdf` (gated on ESSF existing).
- Renderer: `src/pdf/EsmpPdf.tsx`.
- Cover · ESSF Sec 1 (highlighted descriptor) · ESSF Sec 2 (Y/N/NA, SVG `<Check />`
  because Helvetica lacks U+2713) · ESSF Sec 3 (24-q + ESMF Guidance) ·
  **Certification block** (signatures + dates) · EMMP landscape with checkbox-
  style items, **NOT APPLICABLE** per-cell fallback in the trailing 3 columns,
  and 2×2 **signature block** at the end.

### PDF auto-extraction (ESSF + EMMP) ✅
- Field supervisor drops a scanned ESMP PDF into the Legacy section, clicks
  **Extract responses**, gets a draft to review.
- Edge function: **`extract-esmp-pdf-v4`** (active; older `-v1/-v2/-v3` stale —
  see §6 stuck-slug pattern). Sends PDF to Claude Sonnet 4.5 with ESSF schema +
  EMMP template, expects strict JSON.
- Writes draft `essf_submissions` + `emmp_submissions` stamped with
  `imported_from_pdf_path` / `imported_at` / `import_notes`. Refuses to
  overwrite an approved submission (409 → UI shows "Reopen first").
- ESSF/EMMP edit pages show an amber **"Auto-imported from PDF — please review
  before submitting"** banner with Claude's confidence notes.
- **Anthropic API key** is stored as a Supabase secret named `ANTHROPIC_API_KEY`.

### Phase 3 — Milestone 1 module 🟡 (Phases 1, 2.1, 2.2, 2.3, 3a ✅ · Phase 3b ⏳)

The full M1 schema was designed up-front in migration `180` so subsequent
phases add UI only — no further table migrations needed (except migration
`190` for the source-PDF columns, which was always anticipated for Phase 3a).

**Live tables / view (migration 180):**
- `m1_submissions` — one per enterprise. Four jsonb columns
  (`narrative` / `cashbook` / `financial_report` / `bank_reconciliation`)
  + status workflow + import tracking + source-PDF columns
  (`uploaded_pdf_path` / `uploaded_pdf_uploaded_at` from migration `190`).
- `m1_supporting_documents` — many per submission (kind enum:
  `bank_statement`, `transaction_history`, `invoice`, `receipt`,
  `audit_trail`, `contract`, `other`). Schema ready; uploader UI ships in
  Phase 3b.
- `m1-supporting-docs` storage bucket (100 MB cap after migration `200`).
- `enterprise_m1_status` view for dashboard roll-ups.

**Phase 1 ✅ — Narrative + scaffold**
- `M1EditPage` at `/enterprises/:id/m1` with tabs Narrative / Cashbook /
  Financial Report / Bank Reconciliation / Supporting Docs.
- 7-section narrative form (`m1NarrativeSchema.ts`) with progress strip.
- Hooks in `src/lib/m1.ts` mirror `lib/esmp` exactly (canSubmit/canApprove/
  canApproveSubmission/canReopen helpers).
- M1 PDF at `/enterprises/:id/m1.pdf`: Cover page (reused via
  `CoverPagePdfPage`) + Narrative pages.

**Phase 2.1 ✅ — Cashbook**
- Repeating spreadsheet-style ledger with **10 columns** matching the canonical
  paper template: Date / Item / Budget / Supplier / Description / Credit /
  Debit / Accum / Balance / Budget Balance. Item holds the budget CODE (`I-A`,
  `OTHERS`); Budget holds the budget TYPE (`MATERIAL`, `OTHERS`).
- Pure helpers shared by form + PDF: `computeRunningBalances`,
  `computeRunningAccum` (Σ debits), `computeBudgetBalances` (Planned − cumulative
  spend per budget code, blank when no Financial Report anchor), 
  `computeCashbookTotals`, `computeBudgetCodeSpend`.
- **DD/MM/YYYY date input** (`DmyDateInput` component in
  `M1CashbookFormRenderer`) replaces native `<input type="date">` so dates
  display in Lesotho format on all browsers regardless of OS locale. Underlying
  storage is still ISO yyyy-mm-dd.
- Negative running balance → destructive red. "Both credit + debit > 0"
  warning per row (likely typo flag).
- Footer Σ Credits / Σ Debits / Σ Debits (Accum total) / Closing balance.
- Per-budget-code spend breakdown card.

**Phase 2.2 ✅ — Financial Report**
- 8 fixed categories (I-A through I-F, II, III); user adds line items under
  any category.
- Per row: `total_planned`, `incurred`, `date_of_receipts`, `notes`.
- Auto-computed: Beneficiary 20% / IFAD 20% / Grant-IDA 60% (via
  `computeFinancialSplit`); Difference = Planned − Incurred (via
  `computeFinancialDifference`); footer totals (`computeFinancialTotals`).
- Negative differences highlighted destructive.
- `M1_FR_COLUMNS` shared as single source of truth between form + PDF.

**Phase 2.3 ✅ — Bank Reconciliation**
- Fixed-field form with three bordered sections + computed bottom callout.
- `computeBRAll` returns subtotal / netSurplus / difference / totalExplained /
  unexplained / reconciled (|unexplained| < 0.005).
- Bottom callout flips green/check ↔ red/alert as unexplained-differences
  approaches 0.

**Phase 3a ✅ — Source PDF + auto-extraction**
- File-card UI on the M1 tab in EnterpriseDetailPage: upload, replace, or
  **Remove** the source M1 PDF. Same Remove pattern exists for ESMP source
  PDFs (deletes file + clears `enterprises.esmp_uploaded_pdf_url`).
- Edge function: **`extract-m1-pdf-v3`** (active; `-v1` over-pulled from bank
  statements; `-v2` scoped to cashbook page only; `-v3` adds explicit
  column-to-field mapping — see §4 Architecture decisions for the mapping
  table).
- Writes draft `m1_submissions` stamped with `imported_from_pdf_path` /
  `imported_at` / `import_notes`. Refuses approved (409).
- **Discard draft** button on M1EditPage (destructive style) wipes all four
  jsonb form columns + clears `imported_from_pdf_path` / `imported_at` /
  `import_notes`, sets status='draft'. Source PDF, period dates, and
  submitted/approved timestamps are KEPT for context.
- M1EditPage shows the amber "Auto-imported from PDF — please review" banner
  matching ESSF/EMMP treatment.

**Phase 3b ⏳ — pending build:**
- Supporting documents uploader: multi-file, kind-tagged (bank_statement /
  transaction_history / invoice / receipt / audit_trail / contract / other).
  Schema + bucket already in place.
- (Optional) `extract-m1-pdf-v4` that also extracts Financial Report + Bank
  Reconciliation. Schema is in place; just needs prompt updates.
- Embed supporting docs at the back of `m1.pdf` + compendium of ESSF / EMMP
  / most-recent Inspection at the end.

**Business plan**: deferred. M1 works standalone without a separate BP module.

### Enterprise lifecycle tracker (11 milestones) ✅ — added 2026-05-27
Adopts the column structure RSDA uses on their Master Sheet so 4D + RSDA share
one tracking vocabulary. Replaces the old 5-dot progress strip + 4 stat cards.

**Schema** (migrations `210` + `211`, applied):
- `enterprises.lifecycle_status jsonb DEFAULT '{}'::jsonb` — stores only the
  9 manual values; server-side view fills in the 2 derived ones.
- `enterprise_lifecycle` view (security_invoker = on) joins
  essf/emmp/m1 submissions and returns one row per enterprise with all 11
  columns hydrated. Migration 211 moved 3 milestones (contracts_signed,
  sadp_contributed, business_plan) from DERIVED to MANUAL after they proved
  too nuanced for automatic rules.

**The 11 milestones (in column order):**

| # | Id | Source | Notes |
|---|---|---|---|
| 1 | `contracts_signed` | manual | was derived from signed dates; too coarse |
| 2 | `contract_available` | manual | did the SP file the signed contract PDF |
| 3 | `beneficiary_contributed` | manual | cash contribution received |
| 4 | `sadp_contributed` | manual | was derived from `current_grant_payment_lsl > 0`; too coarse |
| 5 | `business_plan` | manual | was derived from BP status enum; too coarse |
| 6 | `esmp` | **derived** | both ESSF + EMMP submissions are `approved` |
| 7 | `verified_borehole_site` | manual | pre-drilling site verification done |
| 8 | `budget_transfer` | manual | M1 budget approved + funds transferred |
| 9 | `supervision` | manual | drilling + site clearing supervised |
| 10 | `procurement` | manual | equipment + materials procured |
| 11 | `m1_submitted` | **derived** | `m1_submissions.status` is submitted or approved |

Values: `'yes'` / `'no'` / `'n_a'`; **NULL** means "not yet tracked"
(only valid for the 9 manual milestones — derived ones always return yes/no).

**UI surfaces** all driven off `enterprise_lifecycle` + `useEnterpriseLifecycle`:

- **Enterprise list → Table view** (toggle in top-right): 11-column matrix.
  Sticky beneficiary column for horizontal scroll. ✓ (green) / ✗ (red) /
  N/A (grey) / – (faint dash for not-tracked) with a legend strip. Card
  view still available for the icon+name visual scan.
- **Enterprise detail → Progress tab** (now the default tab — was Details):
  `EnterpriseLifecycleEditor` at the top. 9 manual rows with StatusPill
  ✓/×/N/A triplets (click an active pill to deselect). 2 derived rows
  shown read-only with ✨ "auto" badge + tooltip. Explicit "Save lifecycle"
  button to avoid 11 round-trips during editing.
- **Dashboard**: `LifecycleMatrix` replaces the old 4 stat cards.
  District-by-milestone aggregation table: rows per district + grand total,
  columns per milestone, cell value `count_yes / total` with green
  saturation scaling to completion ratio. Mirrors the "Analysed beneficiary"
  sheet RSDA showed us.

**Filter card on Enterprise list** rebuilt in two rows (commit `e2e1fb4`):
- Row 1: Search · Organisation (super-admin only) · District · Resource Center
- Row 2: Enterprise type · **Activity** (milestone) · **Status** (Yes / No /
  N/A / Not tracked / Any)
- Activity filter is client-side over the lifecycle map.
- Header count reads "X of Y shown" so filter effect is visible.

**Default tab change**: `/enterprises/:id` now lands on **Progress**, not
Details. `?tab=` URL param omits when on Progress (clean default URL).

### UX polish pass ✅
- Semantic color tokens: `success` / `warning` / `info` + tints.
- Sonner toaster wired for save / submit / approve feedback.
- Recharts for dashboard.
- Primitives: `Skeleton`, `EmptyState`, `StatusPill`.
- Dashboard: stat cards, donut chart by type, horizontal M1 readiness
  pipeline, stacked district-readiness chart.
- Enterprise list: card-grid / table toggle (persisted), per-type icon,
  5-dot progress strip.
- **Legacy PDF section cleaned up**: status dropdown removed; file card
  with name + size + upload date.
- **M1 is a top-level tab** parallel to ESMP (was nested inside ESMP
  briefly). Tab strip: Details · Progress · ESMP · Milestone 1 · History.
- **Active tab persists across refresh** via `?tab=…` URL search param +
  controlled Tabs primitive. `replace: true` so browser back goes to the
  previous *page* not the previous tab.
- Back-from-sub-form navigation: ESSF / EMMP / Inspection → ESMP tab;
  M1 edit + M1 PDF → M1 tab.

---

## 3. Recent commits (most recent first)

```
e2e1fb4  fix(lifecycle): drop RSDA-style label, switch 3 milestones to manual, rebuild filters, default tab → Progress
b35b470  feat(lifecycle): RSDA-style 11-milestone tracker
ab9f13c  docs: refresh PROGRESS.md for M1 Phases 1/2/3a + cashbook column-mapping fixes
74b499f  fix(cashbook): explicit column mapping in extraction + DD/MM/YYYY date inputs
7673419  fix(m1-extract): cashbook = supervisor's consolidated record, not bank statements
e3fe758  feat(cashbook): add Accum + Budget Balance columns to match printed template
1602730  feat(m1): Discard draft button — reset M1 back to empty after a bad extraction
7d0fd65  feat(m1): Phase 2.2 + 2.3 — Financial Report + Bank Reconciliation forms
76bda91  feat: Remove source PDF buttons (M1 + ESMP) + bump bucket size limit + better upload errors
366b5a7  feat(m1): Phase 3a — upload source PDF + auto-extract narrative & cashbook
3a3d2ba  ux: promote Milestone 1 to top-level tab + persist active tab on refresh
1640494  feat(m1): Phase 1 — Narrative form + M1 page scaffold + M1 PDF
a216142  docs: refresh PROGRESS.md for cashbook + cover-page-refactor
5290c81  feat(m1): Phase 2.1 — Cashbook form + PDF page
d3aed02  feat(pdf): refactor cover page to match canonical paper-form layout
7161534  docs: refresh PROGRESS.md for end-of-session handoff
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
```

---

## 4. Architecture decisions (locked-in)

| | |
|---|---|
| **3 separate ESMP tables** | NOT a unified `kind` table. `essf_submissions`, `emmp_*`, `inspection_visits`. |
| **4 jsonb columns on m1_submissions** | One per logical M1 form (narrative / cashbook / financial_report / bank_reconciliation). All on the same row so workflow stays atomic. |
| **No self-approval** | Same role set for ESSF/EMMP/Inspection/M1: super_admin self-approves; others can't. Reopen-for-editing = same role set as approve. |
| **Computed status, not stored** | `enterprise_esmp_status` + `enterprise_m1_status` views reflect underlying submissions. Manual status dropdowns removed. |
| **Security-invoker views** | All views use `security_invoker = on` to respect RLS. |
| **EMMP item.id is the canonical response key** | Form, PDF, and edge function all use `responses[item.id]` verbatim (`1.1.r5.m2` style). NOT positional `${rowId}.${prefix}${i}` — that drifted off-by-one. |
| **PDF auto-extraction is review-only** | The extract edge function ALWAYS writes `status='draft'` and stamps `imported_from_pdf_path`. The UI shows a mandatory review banner. Never bypass human review. |
| **Cashbook column mapping (M1)** | **PDF column → app field** — `DATE → date`, `ITEM → item (code: I-A/OTHERS)`, `BUDGET → budget_code (type: MATERIAL/OTHERS)`, `SUPPLIER → supplier (full name)`, `DESCRIPTION → description`, `CREDIT → credit`, `DEBIT → debit`. ACCUM / BALANCE / BUDGET BALANCE always recomputed downstream from helpers in `m1CashbookSchema.ts`. |
| **Cashbook = consolidated, not bank-statement granular** | The cashbook is the supervisor's consolidated record. Bank statements + receipts are SUPPORTING DOCUMENTS (Phase 3b). They must not contribute cashbook entries. Encoded explicitly in the v2/v3 extract prompt. |
| **20/20/60 source-of-funds split** | Financial Report's per-row Beneficiary/IFAD/Grant-IDA columns are computed from Incurred via `computeFinancialSplit` — never stored, never editable. |
| **Bank Reconciliation: Unexplained must reach 0** | `computeBRAll` reports `reconciled = |unexplained| < 0.005`. Form + PDF flip a green/red callout based on this. |
| **DD/MM/YYYY everywhere (Lesotho format)** | Custom `DmyDateInput` component in cashbook; ISO yyyy-mm-dd stays as the storage format. Read-only displays use `formatDateDMY`. |
| **Edge function "stuck slug" workaround** | The Supabase deploy API rejects re-deploys to a slug whose first deploy was partial/broken. Always deploy under a fresh `-vN` suffix; update the frontend hook. Current active slugs: `extract-esmp-pdf-v4`, `extract-m1-pdf-v3`. |
| **Source PDF storage paths** | ESMP: `esmp-pdfs/<enterprise_id>.pdf` (overwrites on re-upload). M1: `m1-supporting-docs/<enterprise_id>/_source.pdf`. Both private buckets, 100 MB cap. Original filenames not preserved for ESMP; preserved per-doc on M1 supporting docs. |
| **Remove source PDF ≠ wipe draft** | Removing the source PDF just deletes the file + clears the path column. The draft data extracted from it survives — that's a separate "Discard draft" action. |

---

## 5. Conventions

- **"Quithing"** spelling locked (not "Quthing").
- **Districts**: 4D → Maseru, Berea, Thaba Tseka. RSDA → Mafeteng, Mohale's Hoek, Quithing, Qacha's Nek.
- **iCloud**, not Google Drive. Repo lives at `~/Documents/Claude/Projects/SADP II/`.
  **`.git` workaround**: iCloud locks `.git/index.lock`. On this machine the
  working git tree lives at `/tmp/sadp-icloud/`; source files mirror back into
  the iCloud folder via rsync. See §7 for the bootstrap.
- **Auto-execute via MCP** when possible — Supabase MCP for `execute_sql` /
  `apply_migration` / `deploy_edge_function` / `get_logs` / `get_advisors`.
- **Brand palette**: primary `#006838`, accent `#8DC63F`, semantic `success` /
  `warning` / `info` / `destructive`.
- **Render uses `tsc -b`** (project mode), NOT `tsc --noEmit`. Always run
  `npx tsc -b` before pushing.
- **LSL currency format**: `LSL 500 000.00` (space thousands, two decimals)
  in cover page; `M{:,.2f}` in cashbook + reconciliation totals.

---

## 6. Edge function deploy quirk — important

Supabase's MCP `deploy_edge_function` has a bug: once a slug has any version
that failed mid-deploy (or sometimes after a successful first deploy too),
**every subsequent deploy to that slug fails with "Function deploy failed due
to an internal error"** indefinitely. The slot is poisoned.

**Workaround**: deploy under a fresh slug suffix (`-v2`, `-v3`, `-v4` …) and
update the frontend hook. Earlier slugs stay deployed (they still work — they
just can't be updated).

**Active slugs as of HEAD `74b499f`:**
- `invite-user` — Phase 1, never re-deployed.
- `extract-esmp-pdf-v4` — current ESSF/EMMP extractor. `-v1/-v2/-v3` stale.
- `extract-m1-pdf-v3` — current M1 extractor. `-v1` (over-pulled supporting
  docs) and `-v2` (scope fixed, column mapping unclear) stale.

When you add Phase 3b's supporting-docs extraction (or a future v4 for M1
that also covers Financial Report + Bank Reconciliation), assume the next
deploy needs a fresh suffix.

---

## 7. Continuing from another machine

```bash
# 1. Clone OUTSIDE iCloud (iCloud locks .git/index.lock). Use ~/Code/ or similar.
git clone https://github.com/EhsanRiz/sadp-ii-monitoring.git ~/Code/sadp-ii-monitoring
cd ~/Code/sadp-ii-monitoring

# 2. .env.local — anon key from Supabase Dashboard → Settings → API
cp .env.example .env.local
# VITE_SUPABASE_URL=https://urvecgqgxjwlznltjeap.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon key>

# 3. install + run
npm install
npm run dev       # http://localhost:5173

# 4. verify before pushing (Render uses tsc -b)
npx tsc -b
npm run build

# 5. push — Render auto-deploys
git push origin main
```

**For Supabase migrations**: use the Supabase MCP from a Claude session —
`apply_migration` for DDL, `execute_sql` for SELECT/DML. Project ref
`urvecgqgxjwlznltjeap`.

**For GitHub auth**: install `gh` and `gh auth login` — DO NOT paste a PAT
in chat. The `github_pat_11BTS6POQ0Donc6AHGZVF3_…` token used in 22+ commits
this session **must be rotated** at https://github.com/settings/tokens. The
token has appeared in many bash command outputs and should be considered
compromised.

---

## 8. Useful paths

```
src/
  pages/
    DashboardPage.tsx
    enterprises/
      EnterprisesListPage.tsx
      EnterpriseDetailPage.tsx               # Top-level tabs + M1 + ESMP + Legacy PDF + Source M1 PDF
      EssfEditPage.tsx                       # + import banner, Print/PDF, Reopen
      EmmpEditPage.tsx                       # + import banner, Print/PDF, Reopen
      InspectionEditPage.tsx
      M1EditPage.tsx                         # Narrative / Cashbook / Financial / Reconciliation / (Supporting Docs ⏳)
      CoverPagePdfRoute.tsx                  # /cover-page.pdf
      EsmpPdfRoute.tsx                       # /esmp.pdf
      M1PdfRoute.tsx                         # /m1.pdf
    admin/
  components/
    forms/EssfFormRenderer.tsx
    forms/EmmpFormRenderer.tsx
    forms/InspectionFormRenderer.tsx
    forms/M1NarrativeFormRenderer.tsx
    forms/M1CashbookFormRenderer.tsx         # + DmyDateInput component
    forms/M1FinancialReportFormRenderer.tsx
    forms/M1BankReconciliationFormRenderer.tsx
    enterprise/EnterpriseLifecycleEditor.tsx  # 11-milestone Progress-tab editor
    StatusBadge.tsx
    ui/status-pill.tsx · skeleton.tsx · empty-state.tsx
  lib/
    auth.ts
    enterprises.ts                            # + useUploadedEsmpPdfMeta, formatBytes
    esmp.ts                                   # ESSF/EMMP hooks + extract + role helpers
    m1.ts                                     # M1 hooks: useM1Submission, useSaveM1Draft, useTransitionM1,
                                              # useUploadM1SourcePdf, useUploadedM1PdfMeta, useRemoveM1SourcePdf,
                                              # useExtractM1Pdf, useDiscardM1Draft + role helpers
    enterprise-icons.ts
    catalogs.ts
    lifecycle.ts                              # 11-milestone definitions + aggregateLifecycle
  forms/
    essfSchema.ts
    inspectionSchema.ts
    m1NarrativeSchema.ts                      # 7 sections
    m1CashbookSchema.ts                       # 10 columns + computeRunning* helpers
    m1FinancialReportSchema.ts                # 8 categories + 20/20/60 split helpers
    m1BankReconciliationSchema.ts             # fixed-field + computeBRAll
  pdf/
    CoverPagePdf.tsx                          # exports CoverPagePdfDocument + CoverPagePdfPage
    EsmpPdf.tsx                               # + Check / CheckBox SVG + NOT APPLICABLE + EMMP signatures
    M1Pdf.tsx                                 # Cover · Narrative · Cashbook · Financial · Bank Reconciliation

supabase/
  migrations/                                 # 010 … 211
    161_emmp_vegetable_shednets_add_climate_change.sql
    170_esmp_pdf_import_tracking.sql          # imported_* columns on essf + emmp
    180_m1_milestone_one_module.sql           # m1_submissions, m1_supporting_documents, bucket, view
    190_m1_source_pdf_columns.sql             # uploaded_pdf_path + uploaded_pdf_uploaded_at on m1_submissions
    200_bump_pdf_bucket_size_limit.sql        # 50 → 100 MB on esmp-pdfs + m1-supporting-docs
    210_enterprise_lifecycle.sql              # lifecycle_status jsonb + enterprise_lifecycle view
    211_lifecycle_make_three_manual.sql       # contracts_signed/sadp_contributed/business_plan → manual
  seeds/
    140_seed_rsda_districts.sql
    160_emmp_templates.sql
  functions/
    invite-user/                              # deployed
    extract-esmp-pdf-v4/                      # deployed (current); -v1/-v2/-v3 also deployed but stale
    extract-m1-pdf-v3/                        # deployed (current); -v1/-v2 also deployed but stale

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

**Security / hygiene (do FIRST):**
- **Rotate the GitHub PAT** at https://github.com/settings/tokens. The
  `github_pat_11BTS6POQ0Donc6AHGZVF3_…` token was used in 22+ commits via
  inline-URL push and has appeared in many bash command outputs. Replace
  with `gh auth login` for future pushes.

**M1 Phase 3b — pending build:**
- Supporting documents uploader (multi-file, kind-tagged — schema +
  `m1-supporting-docs` bucket already exist). Per-doc original_filename is
  preserved (unlike the ESMP single-PDF flow).
- Embed supporting docs at the back of `m1.pdf` (by reference / thumbnails)
  + compendium of ESSF / EMMP / most-recent Inspection.

**Optional M1 follow-up:**
- `extract-m1-pdf-v4` with prompt to also extract Financial Report +
  Bank Reconciliation. Currently only narrative + cashbook are auto-imported.
- Wire `computeBudgetBalances` to the Financial Report's `total_planned` per
  budget code so the Budget Balance column in cashbook actually populates
  (currently blank by design — matches paper template).

**Testing leftovers from earlier sessions:**
- Verify the 5-dot progress strip on the enterprise list reads cleanly
  across all 164 enterprises.
- Spot-check ESSF/EMMP/Inspection Save/Submit/Approve gating per role.

**Architectural follow-ups:**
- Dashboard "ESMP completed" count still references the legacy
  `esmp_status` column on `enterprises`. If you want it computed from
  `enterprise_esmp_status` view, rewrite the dashboard query.
- "Discard draft" pattern is M1-only right now. If the user asks for the
  same on ESSF/EMMP, mirror `useDiscardM1Draft` against essf/emmp tables.
- Hansen Farming (9.9 MB PDF) upload required bucket bump to 100 MB AND
  may require bumping the project-level "Upload file size limit" in the
  Supabase dashboard (Settings → Storage). Confirm with the user.

---

## 10. How to onboard a fresh Claude session

> "Read PROGRESS.md top-to-bottom and continue from where the last session
> left off. As of commit `74b499f`, M1 Phase 1 / 2.1 / 2.2 / 2.3 / 3a are all
> live; Phase 3b (supporting documents uploader) is next. The current edge
> function slugs are `extract-esmp-pdf-v4` and `extract-m1-pdf-v3` — any
> new extractor or re-deploy needs a fresh suffix per the §6 stuck-slug
> pattern. The PAT used in earlier commits is compromised — use
> `gh auth login` for pushes from this machine."

Claude will absorb the architecture decisions (3-table ESMP, item.id key
scheme, no-self-approval, computed-status views, cashbook column mapping,
DD/MM/YYYY date inputs, stuck-slug edge function workaround) without
needing them re-explained.
