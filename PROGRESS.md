# SADP-II Monitoring — Progress Snapshot

Last updated: 2026-06-04 (Offline-first stack · Mobile responsive · Dashboard Map crash fix) · HEAD: `33e590a`

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

## 2. What changed in this push

**Offline-first data collection + Mobile responsive layout — 7 phases shipped**

The whole stack between commits `66b20ce` (Phase 1) and `33e590a` (Phase 7):
field supervisors can now Take an enterprise Offline, collect data without a
network, and have everything sync automatically when they reconnect. The app
also works on a phone now (hamburger drawer + responsive tab strips +
card-default for the enterprise list).

**Phase 1 — IndexedDB queue + online detection + OfflineBadge** (`66b20ce`, `443cc54`)
(`src/lib/offline-db.ts`, `src/lib/online-status.ts`, `src/components/OfflineBadge.tsx`,
`src/components/AppShell.tsx`, `src/main.tsx`)
- New `idb` dependency. Two object stores in `sadp_offline`: **queue** (pending
  writes) + **cache** (read-side persistence used by Phase 2).
- Online/offline detection combines navigator.onLine + window events + active
  probe to `/rest/v1/` with apikey every 30s. Probe accepts any `status < 500`
  as reachable; falls back to navigator on probe failure (catches CORS quirks).
- `OfflineBadge` in the app header. Variants: green dot (idle), amber
  "Offline · N queued", blue "Syncing N…", red "N conflicts — review →",
  red "N failed".

**Phase 2 — React Query persistence + "Take offline" button** (`62e2ab4`)
(`src/lib/query-persister.ts`, `src/components/enterprise/PrecacheEnterpriseButton.tsx`)
- `@tanstack/react-query-persist-client` wired via `experimental_createQueryPersister`.
  Every successful query result writes to the same IDB cache store. On a cold
  page load, queries hydrate from IDB instead of refetching.
- `gcTime` bumped from 5 min → 24h.
- "Take offline" button on the enterprise detail header prefetches everything
  needed to view + edit that enterprise without a network: ESSF / EMMP /
  Inspection / M1 submissions + supporting docs + EMMP template + activity
  timeline + the shared catalogs (orgs / districts / types / CCs / RCs).

**Phase 3 — Form-save mutations queue + replay** (`f05a3da`)
(`src/lib/offline-saves.ts`, `src/lib/offline-replay.ts` + refactored hooks in
`src/lib/esmp.ts`, `src/lib/m1.ts` + edit page toasts)
- `saveOrEnqueue<T>({ description, payload, doSave, applyOptimistic })` runs
  `doSave` when online. When offline, queues + applies an optimistic React
  Query cache update so the UI looks like the save landed. Returns
  `{ online: boolean }` so callsites can pick the right toast copy.
- Canonical apply helpers (`applyEssfDraft / applyEmmpDraft /
  applyInspectionDraft / applyM1Draft`) live in `offline-replay.ts` so the hook
  AND the replay engine call the SAME write logic. No drift.
- `replayQueue()` drains the queue on `online` event (and on app boot). Bounded
  retries — 5 attempts before an entry is parked as `failed`. Invalidates the
  relevant React Query keys after each successful replay so the UI auto-refreshes.
- Toasts updated across all four edit pages: `'Draft saved'` (online) vs
  `'Saved locally — will sync when online'` (offline).

**Phase 4 — Status transitions + enterprise / lifecycle / borehole edits** (`1638b6b`)
- Extended Phase 3's wrapping to every other mutation a field supervisor hits:
  `useTransitionEssf / useTransitionEmmp / useTransitionInspection /
  useTransitionM1` (Submit / Approve / Reopen),
  `useSaveEnterpriseLifecycle` (lifecycle milestones),
  and a generic `useSaveEnterprisePatch` that the cover-page editor and
  `BoreholeSupervisionForm` both use.
- New `enterprise_patch` queue type for field-agnostic enterprise UPDATEs.

**Phase 5 — Online-only gating for PDF uploads + Extract buttons** (`e004210`)
(`src/components/forms/M1SupportingDocsTab.tsx`,
`src/components/enterprise/BackfillFromBinderCard.tsx`,
`src/pages/enterprises/EnterpriseDetailPage.tsx`)
- Per architecture choice: PDF uploads (ESMP source, M1 source, supporting docs)
  and Extract responses + Backfill from binder buttons stay **online-only**.
  Multi-MB blobs + Anthropic round-trips aren't worth queueing.
- All upload `<Input type="file">` + Extract / Backfill buttons get
  `disabled={isOffline}`. `<OnlineRequiredHint feature="…">` shows under each
  gated control so the user gets a clear "needs connection" message instead
  of a button that mysteriously won't click.

**Phase 6 — Conflict detection + manual review UI** (`e004210`)
(`src/lib/offline-replay.ts`, `src/pages/SyncConflictsPage.tsx`,
`src/App.tsx`, `src/components/OfflineBadge.tsx`)
- Every save / transition / patch hook captures `source_updated_at` at enqueue
  time (read from the React Query cache via `pickUpdatedAt`).
- Before applying, the replay engine SELECTs current `updated_at` from the
  target row. If the server's is later, the entry is parked as `conflict`
  instead of clobbering — the user resolves manually.
- New `/sync-conflicts` page (linked from the OfflineBadge when conflict /
  failed / pending count > 0) lists every queued entry by status with **Use
  mine** (`resolveConflictUseMine`) / **Discard mine** (`resolveConflictDiscardMine`)
  buttons.

**Phase 7 — Mobile responsive AppShell** (`33e590a`)
(`src/components/AppShell.tsx`,
`src/pages/enterprises/EnterpriseDetailPage.tsx`,
`src/pages/enterprises/M1EditPage.tsx`,
`src/pages/enterprises/EnterprisesListPage.tsx`)
- AppShell on mobile: hamburger drawer slides over the page with a tappable
  backdrop. Top header bar holds brand + hamburger + OfflineBadge. Body
  scroll locks while open. Drawer auto-closes on route change.
- Nav items get `py-3` on mobile (44px iOS HIG tap target).
- Enterprise detail tab strip (6 tabs) and M1 edit tab strip (5 tabs)
  wrapped in `overflow-x-auto` so they scroll horizontally instead of
  wrapping ugly on a phone.
- Enterprises list defaults to **card view** on small screens (the
  11-column lifecycle matrix is unreadable at 375px). Desktop respects the
  user's last-chosen view via localStorage.

**Critical fix mid-stream — Dashboard `t.values is not a function`**
(`6dfc6a4`, `24ba572`)
The persister was JSON-serializing JS `Map` values from
`useEnterpriseLifecycle` / `useUserDisplayNames` into IDB. On hydrate the
Maps came back as plain objects, breaking `.values()` / `.get()` calls.
Fixed by:
- Returning **plain `Record<string, X>`** from both hooks at the source —
  no more Maps. All call sites updated (`Object.values()`,
  `cached?.[id]` indexing).
- IDB `DB_VERSION` bumped 1 → 2 → 3 with cache-store clears on each
  upgrade so existing browsers carrying bad cache entries get flushed
  automatically.

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
- **273 enterprises** in the DB: **164 4D** (Maseru / Berea / Thaba Tseka)
  imported May 2026 + **109 RSDA** (Mafeteng / Mohale's Hoek / Quthing /
  Qacha's Nek) imported 2026-05-27 from RSDA's Master Sheet with all 9
  manual lifecycle milestones pre-populated. See §2.5 for the RSDA load notes.

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

### Phase 3 — Milestone 1 module ✅ COMPLETE (Phases 1, 2.1, 2.2, 2.3, 3a, 3b all live)

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

**Phase 3a ✅ — Source PDF + auto-extraction (extract-m1-pdf-v4)**
- File-card UI on the M1 tab: upload, replace, or **Remove** the source PDF.
- Edge function **`extract-m1-pdf-v4`** is current (active). Slug history:
  v1 over-pulled from bank statements; v2 scoped to cashbook; v3 added column
  mapping; **v4** adds rotation-aware cashbook reading, strict no-reconstruction
  (zero entries + note if cashbook unreadable), scale-check (`prior_balance +
  credit − debit == next_balance`), AND extends to Financial Report + Bank
  Reconciliation.
- **Cashbook UX fixes (commit `414af81`)**: Date column 8→10% (was clipping
  the year — caused AVAILS extraction to look broken when actually it had
  2024 typos hidden), Credit/Debit 8→10% (was clipping 6-digit amounts).
  New `isOutOfPeriod()` helper — amber row tint + warning badge for rows
  whose date sits outside the M1 reporting period, summary banner in card
  header.
- Writes draft `m1_submissions` stamped with `imported_from_pdf_path` /
  `imported_at` / `import_notes`. Refuses approved (409).
- **Discard draft** button wipes all four jsonb columns + clears import
  stamps. Source PDF, period dates, signoff timestamps are KEPT.

**Phase 3b ✅ — Supporting docs + Compendium pages (commits `0a2037f`, `7735875`)**
- **Supporting documents uploader** on the M1 Supporting Docs tab:
  multi-file with kind tag (bank_statement / transaction_history / invoice /
  receipt / audit_trail / contract / other), batch upload (kind + notes apply
  to all files in one Add files action), per-row retag/notes/remove,
  read-only when M1 approved. Hooks: `useM1SupportingDocs` /
  `useUploadM1SupportingDoc` / `useUpdateM1SupportingDoc` /
  `useRemoveM1SupportingDoc` / `openM1SupportingDoc` (short-lived signed URL).
- **Compendium pages at the back of `m1.pdf`** (621-line addition). Four
  OPTIONAL pages, silently skipped if source data missing:
    1. Supporting Documents Index — table grouped by kind with filename /
       size / upload date / notes.
    2. ESSF compendium — one-page summary of the APPROVED ESSF:
       site-sensitivity ratings + tally, completeness Y/N/NA counts,
       checklist Y/N counts, certification signatures.
    3. EMMP compendium — template name + version + approval dates +
       response-coverage count.
    4. Inspection compendium — most-recent visit's overall compliance
       tally, per-phase C/N-C/PC/NA counts, inspector notes.

**Business plan**: deferred. Phase 3 farmer BPs were done externally; Phase 4
BP module would be a separate build later.

### M1 Binder Backfill ✅ (commits `00294f1` + binder v2 fix)
Option B from architecture decisions — for enterprises where the M1 binder
already exists with cover + ESSF + EMMP + Inspection + M1 stapled into one
PDF. Forward-going per-module flows are wasteful for legacy data.

**Entry point**: Enterprise detail → Progress tab → **"Backfill from M1
binder"** card. Upload one PDF → click "Backfill from binder" → confirm
→ calls edge function → drafts written across all 4 submission tables.

**Edge function progression**:
- **`extract-m1-binder-v1`** (initial deploy, commit `00294f1`) — cover +
  ESSF + EMMP + Inspection + M1 all in one Claude pass. 409 on any
  already-approved section. Drafts only; never auto-approves.
- **`extract-m1-binder-v2`** (current; deployed via MCP 2026-06-02) —
  fixes the Hansen FR bug: v1 returned 16 empty FR shells (Claude saw
  page 5 but didn't transcribe per-row data because the FR prompt was
  one terse line with `"label": "..."` placeholders). v2 ports the
  detailed FR prompt from `extract-m1-pdf-v4` AND adds a defensive
  post-processing filter that drops items with no label and zero money
  values. Frontend invokes `-v2` via `useBackfillM1Binder` (commit
  `86bd404`).
- Source for v2 is in Supabase only (not committed to git). To
  regenerate: take v1's source and replace the FR prompt block per the
  pattern in `extract-m1-pdf-v4`.

**Schema**: Migration `230` added `imported_from_pdf_path` / `imported_at`
/ `import_notes` to `inspection_visits` (mirroring 170 for ESSF/EMMP).

**Frontend**: `useBackfillM1Binder` hook + `BackfillBinderError` class +
`BackfillFromBinderCard` component. Per-module flows on ESMP/M1 tabs
unchanged — backfill is purely additive.

### Enterprise timeline ✅ (commit `568aad9`)
Per user directive: "history should capture what info was captured when
and by who." Replaces the audit-log-only History tab with a richer
named-event timeline aggregated from every enterprise-scoped table.

**Schema** (migration `240`, security_invoker = on):
`enterprise_timeline` view = UNION ALL across:
- `enterprises` — created
- `essf_submissions` — created / submitted / approved
- `emmp_submissions` — created / submitted / approved
- `inspection_visits` — created / submitted / approved
- `m1_submissions` — created / submitted / approved / pdf_uploaded
- `m1_supporting_documents` — uploaded

Columns: `enterprise_id, occurred_at, category, event_type, actor_id,
source_pdf_path, description`.

**Option B** from the architecture decisions — aggregate from existing
timestamp columns rather than adding DB triggers everywhere.

**Frontend**:
- `useEnterpriseTimeline` hook + `EnterpriseTimelineRow` type.
- `useUserDisplayNames` hook resolves actor uuids → full names via
  `user_profiles`, with caching.
- History tab rewritten: card per event with category icon, action badge,
  timestamp, actor display name, brief description.
- Raw `audit_log` dump kept underneath as a secondary card.

### User Management ✅ (commit `eaa9669`) — 2026-06-03
Backend edge function `manage-user-v1` (deployed via Supabase MCP). Single
endpoint dispatching on `body.action`. JWT-verified, super_admin only.
Wraps the `auth.admin.*` calls + `user_profiles` row updates.

**Actions**:
- `delete` — `auth.admin.deleteUser`; user_profiles cascades.
- `change_role` — UPDATE user_profiles + auth user_metadata so the
  `custom_access_token_hook` picks up the new role on next token refresh.
- `change_org` — same pattern.
- `resend_invite` — `auth.admin.inviteUserByEmail` for users who lost
  the original email.
- `deactivate` / `reactivate` — UPDATE user_profiles.is_active + auth
  `ban_duration` ('100y' to block / 'none' to unblock).
- `reset_password` — `auth.admin.generateLink(type='recovery')` so the
  user receives the standard reset email.

**Safety**: super_admin cannot delete or deactivate their own account
(self-lockout protection) — enforced in the function AND the UI buttons
are disabled.

**Frontend (UsersAdminPage)**: per-row action buttons (Role · Org ·
Resend invite · Reset pwd · Deactivate/Reactivate · Delete) with modal
dialogs for change-role/change-org and destructive confirms. Toast
feedback via sonner. 'you' tag on the caller's own row.

### Custom SMTP via Resend ✅ — 2026-06-03
Permanent fix for Supabase's free-tier email rate limit (was 2 emails/hour;
caused live demo invites to fail with 429). Configured in Supabase Dashboard
→ Auth → SMTP Settings:
- Host: `smtp.resend.com` port 465
- Username: `resend`, password: Resend API key
- Sender: `noreply@4dcs.co.za`
- Rate limit now **30 emails/hour** (verified in auth logs:
  `GOTRUE_RATE_LIMIT_EMAIL_SENT changed from 2/1h to 30`). Adjustable
  higher in Dashboard → Authentication → Rate Limits.

Domain `4dcs.co.za` verified in Resend with DKIM + SPF DNS records — emails
land in inbox, not spam.

### Branded email templates ✅ — 2026-06-03
Replaced Supabase's plain default emails with 4D-branded HTML templates.
Files committed in `email-templates/` directory:
- `invite.html` — "You've been invited to SADP-II Monitoring"
- `password-reset.html` — "Reset your SADP-II Monitoring password"
- `confirm-signup.html` — "Confirm your SADP-II Monitoring account"
- `email-change.html` — "Confirm your new email address"
- `magic-link.html` — "Your SADP-II Monitoring sign-in link"

Design: dark green `#006838` header with wordmark + lime `#8DC63F` accent
strip. Personalised via `{{ .Data.full_name }}` (populated by `invite-user`
edge function in user_metadata). Email-client-safe (table layout + inline
CSS). Pasted into Supabase Dashboard → Auth → Templates.

### Set-password flow for invites + recovery ✅ (commit `9df3c8e`) — 2026-06-03
Gap surfaced during a live test: invited users were landing on the
dashboard auto-signed-in but never got a chance to set a password — they
could never sign back in afterwards because they didn't know any
password. Same gap existed for the recovery flow.

**New flow** (works for both invite and recovery email links):
1. User clicks email link → app loads with `#access_token=...&type=invite|recovery`.
2. `src/lib/initial-url.ts` snapshots the hash SYNCHRONOUSLY at module
   load (imported first in `main.tsx`, **before** supabase-js clears it).
3. `App.tsx` mounts, top-level effect redirects to `/set-password` when
   `INITIAL_URL_TYPE` is non-null.
4. `SetPasswordPage` shows welcome + new-password + confirm-password
   fields. Copy adapts: 'Welcome — set your password' for invite,
   'Reset your password' for recovery.
5. Submit calls `supabase.auth.updateUser({ password })`.
6. On success: signs the user OUT and navigates to
   `/login?passwordSet=1`.
7. `LoginPage` shows a green success banner; user signs in with email +
   the password they just chose.

**Backend changes**:
- `invite-user` edge function: new optional `redirect_to` body parameter.
  When passed, it's forwarded to `inviteUserByEmail` as `redirectTo` so
  the invite link lands directly on `/set-password` (instead of Supabase's
  Site URL default).
- Deployed under fresh slug **`invite-user-v2`** per the stuck-slug
  pattern — the original v1 slot's redeploy was rejected with
  `import map path does not exist`. Frontend (`UsersAdminPage`) now
  invokes `invite-user-v2`. The original `invite-user` slug stays
  deployed but is no longer called.
- `lib/auth.tsx` `sendPasswordReset`: `redirectTo` flipped from
  `/reset-password` (the request-email page — confusing name!) to
  `/set-password` (the page that actually sets the new password).

**Template fix (same commit)**:
`email-templates/invite.html` — removed the bullet "Track 273+ enterprises
across both partner organisations". That copy is only true for
super_admins (cross-org view); field_supervisor / me_officer /
team_leader only see their own org. Replaced with role-neutral "Manage
enterprises through their full lifecycle".

**Caveat**: the corrected `invite.html` is in git, but the deployed
email won't use it until the HTML is pasted into Supabase Dashboard →
Auth → Email Templates → Invite user → Save. Supabase doesn't auto-pull
templates from the repo.

### Dashboard: org name fix ✅ (commit `d11c282`) — 2026-06-03
Non-super-admin users were seeing the section header `"Your org"` on
the dashboard regardless of which org they belonged to. Now reads the
actual org code + name — e.g. `"4D — 4D Climate Solutions"` — by
looking up the user's `organization_id` from `useAuth()` against
`useOrganizations()`.

No data-scope change: RLS already scopes non-super-admin queries to
their own org, so passing `organizationId` vs `null` to the underlying
query is equivalent. Pure presentation fix.

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

### RSDA data load (2026-05-27) ✅
Loaded from `27.01.2026 SOUTH REGION Beneficiary status.xlsx` (Master Sheet
tab, 109 enterprises). All went directly into Supabase via the MCP — no
migration; just three INSERT batches.

**What landed:**
- **11 resource centers** (Mafeteng × 8, Qacha's Nek × 3). Mohale's Hoek
  and Quthing rows in the source sheet have NO resource center column
  filled, so those 44 enterprises have `resource_center_id = NULL` — the
  user can edit each in-app or send RSDA an RC list later.
- **109 enterprises**: Mafeteng 55 · Mohale's Hoek 28 · Quthing 16 ·
  Qacha's Nek 10. Round=3, org=RSDA.
- All 9 manual lifecycle milestones populated from the ✓/× columns.
- Service Provider name forward-filled per ISP block (numeric phone
  values in the ISP column stayed NULL — those weren't names).

**Decisions baked in:**
- **ESMP + M1 columns from the RSDA sheet were NOT imported.** Those two
  are derived in `enterprise_lifecycle` from in-app submissions, not
  jsonb-stored. The 109 RSDA rows show `no` for both until someone
  approves real ESSF/EMMP/M1 submissions in the app. If the user wants
  the RSDA self-reported values preserved as a fallback, a follow-up
  migration could add a COALESCE in the view (stored value overrides
  derived). Currently NOT done — they wanted these auto-derived only.
- **2 of 111 source rows were skipped** — they had a blank Enterprise
  Type cell in the source xlsx. To bring them in, the user fills the
  Enterprise column and re-runs the import.
- **Approximate enterprise-type mappings** (worth sanity-checking with
  RSDA): Dairy cows → Dairy Production · Dairy Goats Production →
  Livestock Production · butchery → Meat Processing · orchard → Fruit
  Drying · Rose hip → Fruit & Vegetable Processing · Livestock
  Production (Indigenous Chicken) → Broiler Production.

**Count cross-check against RSDA's "Analysed beneficiary" sheet:**
- Per-district totals match exactly (55 / 28 / 16 / 10 = 109).
- Most milestone counts match. Notable discrepancies are in the
  "Analysed beneficiary" tab itself — Mafeteng supervision says 17 there
  but the Master Sheet has 31; Mafeteng procurement says 24 but Master
  Sheet has 39. Our DB matches the Master Sheet cells. The Analysed tab
  appears to have been hand-counted with some misses.

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
- **Progress tab is leftmost** (commit `ef2788a`) — order: Progress ·
  Details · ESMP · Milestone 1 · History.

---

## 3. Recent commits (most recent first)

```
33e590a  feat(mobile): Phase 7 — responsive AppShell + tab strip scroll + cards default
24ba572  fix(offline): return plain Records (not Maps) so persister round-trip is lossless
e004210  feat(offline): Phase 5 + Phase 6 — online-only gating + conflict detection
1638b6b  feat(offline): Phase 4 — status transitions + enterprise/lifecycle/borehole edits
6dfc6a4  fix(offline): skip Maps/Sets in persister + clear stale cache on v2 upgrade
f05a3da  feat(offline): Phase 3 — form-save mutations queue + replay
62e2ab4  feat(offline): Phase 2 — React Query persistence + 'Take offline' button
443cc54  fix(offline): probe uses /rest/v1/ + apikey, falls back to navigator.onLine
66b20ce  feat(offline): Phase 1 — IndexedDB queue + online detection + OfflineBadge
43ecf01  fix(rls): correct JWT role-claim path in 260+270 (hotfix migration 271)
54a6895  feat(admin/users): per-user activity log + Last-seen column + kebab cleanup
a072515  feat(reports): Monthly/Quarterly/Custom period reports with PDF + Excel + archive
e603a0d  feat(enterprise): borehole supervision tab + dashboard hover animations + org-scoped district filter
1197605  docs: refresh PROGRESS.md — auth set-password flow + dashboard org label
9df3c8e  feat(auth): set-password flow for invitees + recovery (invite-user-v2 + corrected invite.html)
d11c282  ux(dashboard): show actual org name for non-super-admin users
58b956b  docs: refresh PROGRESS.md + commit branded email templates
eaa9669  feat(users): full user management — change role / org / resend / reset / deactivate / delete
86bd404  Update m1.ts (frontend → extract-m1-binder-v2)
568aad9  feat(history): expand to full enterprise timeline (what / when / who)
00294f1  feat: Backfill from M1 binder (Option B) — one PDF, all forms
ef2788a  ux: Progress tab moves to the leftmost position on enterprise detail
414af81  ux(cashbook): widen Date/Credit/Debit columns + flag out-of-period dates
b8de19d  feat(m1-extract): v4 — rotation-aware cashbook + FR + BR extraction
7735875  feat(m1): Phase 3b — compendium pages at back of m1.pdf
0a2037f  feat(m1): Phase 3b — Supporting documents uploader
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
| **Edge function "stuck slug" workaround** | The Supabase deploy API rejects re-deploys to a slug whose first deploy was partial/broken. Always deploy under a fresh `-vN` suffix; update the frontend hook. Current active slugs: `extract-esmp-pdf-v4`, `extract-m1-pdf-v4`, `extract-m1-binder-v2`, `manage-user-v1`. |
| **Email infrastructure** | Custom SMTP via Resend with `4dcs.co.za` DKIM/SPF. Removes Supabase free-tier 2/hr rate limit (now 30/hr, adjustable). Branded HTML templates in `email-templates/` paste into Supabase Dashboard → Auth → Templates. |
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

**Active slugs as of HEAD `9df3c8e`:**
- `invite-user-v2` — current invite endpoint. Accepts `redirect_to` for
  the set-password flow. `invite-user` (v1) stays deployed but is no
  longer called (its redeploy was rejected with `import map path does
  not exist` — classic stuck slot).
- `manage-user-v1` — change role / org / resend / reset / deactivate /
  delete (deployed via MCP on 2026-06-03; source committed in repo).
- `extract-esmp-pdf-v4` — current ESSF/EMMP extractor. `-v1/-v2/-v3` stale.
- `extract-m1-pdf-v4` — current M1-only extractor.
- `extract-m1-binder-v2` — current full-binder extractor (cover + ESSF
  + EMMP + Inspection + M1). v1 returned 16 empty FR shells for Hansen;
  v2 ports the detailed FR prompt from `extract-m1-pdf-v4` AND adds a
  defensive post-processing filter. v2 source is **only in Supabase**,
  not in git — to regenerate, take v1's source and replace the FR prompt
  block per the pattern in extract-m1-pdf-v4.

When you add a future re-deploy, assume the next slug needs a fresh
suffix.

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
    forms/M1SupportingDocsTab.tsx             # multi-file uploader, kind-tagged
    enterprise/EnterpriseLifecycleEditor.tsx  # 11-milestone Progress-tab editor
    enterprise/BackfillFromBinderCard.tsx     # one-PDF backfill for legacy M1
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
    230_inspection_visits_pdf_import_tracking.sql  # mirrors 170 for inspection_visits
    240_enterprise_timeline_view.sql          # UNION-ALL view across 6 tables
    210_enterprise_lifecycle.sql              # lifecycle_status jsonb + enterprise_lifecycle view
    211_lifecycle_make_three_manual.sql       # contracts_signed/sadp_contributed/business_plan → manual
  seeds/
    140_seed_rsda_districts.sql
    160_emmp_templates.sql
  functions/
    invite-user/                              # deployed
    manage-user-v1/                           # deployed via MCP — user management actions (source not in repo; build from frontend spec)
    extract-esmp-pdf-v4/                      # current; v1/v2/v3 stuck
    extract-m1-pdf-v4/                        # current; v1/v2/v3 stuck
    extract-m1-binder-v1/                     # legacy backfill function (source in repo)
    extract-m1-binder-v2/                     # current; FR-extraction fix (deployed via MCP — source NOT in repo, regenerate by porting extract-m1-pdf-v4's FR prompt into v1)

reference_documents/
  ESMP_MAQALIKA_AGRIFARM_sample.pdf
  4D_Data_Collection_Form_Milestone1.docx
  4D_Enterprise_Database_v_final_draft.xlsx
  Annex_VA_Cover_Page_fields.md

docs/
  PHASE_1_DESIGN.md
  PHASE_1_QUICKSTART.md
email-templates/                              # 4D-branded HTML for Supabase Auth emails
  README.md                                   # install instructions
  invite.html · password-reset.html · confirm-signup.html · email-change.html · magic-link.html
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

**Email template paste (do FIRST after this session):**
- Paste the updated `email-templates/invite.html` into Supabase Dashboard
  → Auth → Email Templates → Invite user → Save. Removes the
  super-admin-only "Track 273+ enterprises across both partner
  organisations" bullet (replaced with role-neutral copy). Supabase
  doesn't auto-pull from git — until pasted, delivered emails still
  carry the old bullet.

**Optional M1 follow-up:**
- Wire `computeBudgetBalances` to the Financial Report's `total_planned` per
  budget code so the Budget Balance column in cashbook actually populates
  (currently blank by design — matches paper template).
- Commit `extract-m1-binder-v2` source to git
  (`supabase/functions/extract-m1-binder-v2/`). Currently the deployed
  version is in Supabase only — see §6 stuck-slug note.

**Phase 4 — Business Plan module (future):**
- Phase 3 farmer BPs are done externally; Phase 4 BPs will need an
  in-app module. Structure documented in memory `sadp-bp-structure.md`
  for the next session — 7 numbered sections (Executive Summary,
  Company Overview, Production/Operating, Market Overview, Sales Plan,
  Management Plan, Financial Plan) + Validation block. ~2× the M1
  module's size.

**Testing leftovers from earlier sessions:**
- Verify the 5-dot progress strip on the enterprise list reads cleanly
  across all 164 enterprises.
- Spot-check ESSF/EMMP/Inspection Save/Submit/Approve gating per role.

**RSDA load follow-ups (2026-05-27):**
- Confirm 6 approximate enterprise-type mappings with RSDA (Dairy cows /
  Dairy Goats / butchery / orchard / Rose hip / Indigenous Chicken).
- RSDA to provide resource centers for Mohale's Hoek (28 enterprises)
  and Quthing (16 enterprises) — currently NULL.
- 2 skipped rows in the source xlsx have blank Enterprise Type cells —
  RSDA fills + we re-import.
- Decide whether to preserve RSDA's self-reported ESMP + M1 values as
  a fallback (would require a COALESCE migration on the
  `enterprise_lifecycle` view). Currently those two columns are
  app-state-only.
- Reconcile Mafeteng supervision (Master Sheet 31 vs Analysed sheet 17)
  and procurement (39 vs 24) with RSDA.

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
> left off. As of commit `33e590a`, the offline-first stack is fully
> shipped (Phases 1–7) plus mobile-responsive AppShell. Field supervisors
> can pre-cache an enterprise, work fully offline, and have writes
> auto-sync on reconnect with conflict detection. The dashboard `t.values`
> crash is fixed (Maps replaced with plain Records). The current edge
> function slugs are `extract-esmp-pdf-v4`, `extract-m1-pdf-v4`,
> `extract-m1-binder-v2`, `invite-user-v2`, `manage-user-v1` — any new
> extractor or re-deploy needs a fresh suffix per the §6 stuck-slug
> pattern. The PAT used in earlier commits is compromised — use
> `gh auth login` for pushes from this machine. The Business Plan module
> for Phase 4 farmers is the next major build (see memory
> `sadp-bp-structure`). The testing playbook for the offline + mobile
> work is §11."

Claude will absorb the architecture decisions (3-table ESMP, item.id key
scheme, no-self-approval, computed-status views, cashbook column mapping,
DD/MM/YYYY date inputs, stuck-slug edge function workaround,
backfill = Option B, Progress tab first, history aggregated via SQL
view, offline = IDB queue + replay with apply* helpers shared between
hook and replay, Records-not-Maps for any query that goes through the
persister) without needing them re-explained.

---

## 11. Testing playbook — offline-first + mobile (2026-06-04)

Walk these in order on whichever machine you're testing from. Each
section is independent so you can skip pieces if you've already verified
them.

### A. Setup — confirm the new build is live

1. Hard-refresh https://sadp-ii-monitoring.onrender.com (⌘⇧R on Mac,
   Ctrl+F5 on Windows). The current HEAD on `main` should be `33e590a`
   or later.
2. Open DevTools → **Application** → **IndexedDB**. You should see a
   `sadp_offline` database with two object stores: `queue` and `cache`.
   If you see version 3, the migration is applied.
3. The browser may show a one-time `IDBVersionChangeEvent`-related
   console warning the first time the upgrade runs. That's expected.

### B. Dashboard renders cleanly across refreshes

1. Sign in. Dashboard loads.
2. Hard refresh. Dashboard loads again — no `TypeError: t.values is
   not a function`.
3. Soft refresh (just F5) a third time. Still clean.

If it crashes, manually delete the `sadp_offline` database once
(Application → IndexedDB → right-click → Delete database) and refresh.
From then on it stays stable.

### C. Mobile responsive layout

Test in Chrome DevTools device emulation (toggle device toolbar,
choose iPhone SE / 375×667) OR on a real phone.

1. **Top header bar** visible on mobile only: hamburger button left,
   brand center, OfflineBadge right.
2. **Tap the hamburger** → drawer slides in from left over the page
   with a dim backdrop. The 6 nav items have generous tap targets.
3. **Tap any nav item** → drawer auto-closes, you land on that page.
4. **Tap the backdrop** (outside the drawer) → drawer closes without
   navigation.
5. **Enterprise list** defaults to **card view** on mobile — easier to
   read than the 11-column matrix. Desktop respects your last-chosen
   view via localStorage.
6. **Open an enterprise** → six tabs (Progress · Details · ESMP ·
   Borehole · M1 · History) stay on one row and scroll horizontally
   instead of wrapping.
7. **Open M1** → its 5 tabs (Narrative · Cashbook · FR · BR · Supporting
   Docs) also scroll horizontally.

### D. Pre-cache an enterprise for offline

1. **Online**, pick an enterprise (e.g. Hansen Farming). Click the
   **Take offline** button in the header (next to Cover-page PDF).
2. The button briefly shows "Caching for offline…" then flips to
   ✓ **Cached for offline** (green check).
3. DevTools → Application → IndexedDB → `sadp_offline` → `cache` store
   should now contain ~20 entries keyed `rq:tanstack-query-["essf",…]`
   etc., one per submission type plus catalogs.

### E. Go offline + collect data

1. DevTools → **Application** → **Service workers** → check **Offline**.
   (Or: Network panel → Throttling dropdown → Offline.)
2. Within ~30s the OfflineBadge ticks to amber **"Offline"**.
3. Navigate around the cached enterprise — Progress, ESMP → Review
   ESSF / Review EMMP, Milestone 1, History. **All tabs render** with
   cached data instead of throwing network errors. Refresh the page
   while offline; it still works.
4. **Type into a form** (e.g. add a value in ESSF Section 1) and hit
   **Save draft**. Toast: **"Saved locally — will sync when online"**.
   The form retains the new value (optimistic cache update).
5. **OfflineBadge** ticks to amber **"Offline · 1 queued"**.
6. Make 2–3 more saves across different forms (EMMP, M1 narrative).
   Badge counter increments.
7. **Status transitions** while offline: try **Submit** on the ESSF.
   Toast: **"Submit queued — will sync when online"**. Badge count
   bumps again.
8. **Lifecycle milestone** while offline: Progress tab → click a Yes/No
   on any milestone → **Save lifecycle**. Same offline toast.
9. **Try uploading a PDF or clicking Extract responses or Backfill** →
   the button is **disabled** and an **"Online required"** hint sits
   under it. This is by design (Phase 5).

### F. Reconnect + watch the replay drain

1. DevTools → uncheck **Offline**.
2. Within seconds, OfflineBadge transitions to **blue "Syncing N…"**
   (very brief), then back to **green** ✓.
3. Open IDB `queue` store — empty.
4. React Query auto-invalidated affected keys, so the forms now show
   the canonical server state. Forms render the values you saved.

### G. Conflict detection (two browsers needed)

1. **Browser A (Chrome, online)**: open Hansen → ESSF. Click **Take
   offline**, then switch DevTools to **Offline**.
2. **Browser B (e.g. Safari, online)**: open the same Hansen → ESSF.
   Make a different ESSF edit and hit Save. Server now has B's data.
3. **Browser A (still offline)**: make a DIFFERENT ESSF edit. Hit
   Save. Toast: "Saved locally".
4. **Browser A**: switch off Offline. The replay tries to apply A's
   change but sees that the server's `updated_at` is newer (because
   of B's edit). It parks the entry as **conflict** instead of clobbering.
5. **Browser A** OfflineBadge: red **"1 conflict — review →"**.
   Click it.
6. `/sync-conflicts` page opens with one card per conflict.
   Two buttons per card:
   - **Use mine** — A's change overwrites B's on the server.
   - **Discard mine** — A's queued change is dropped; B's stays.
7. Pick one, see the result reflected on the ESSF page.

### H. Other-machine handoff checklist

Before testing on the OTHER machine:

- [ ] Pull latest: `git pull origin main`. HEAD should be `33e590a`
  or later.
- [ ] `npm install` (the offline phases added `idb` and
  `@tanstack/react-query-persist-client`).
- [ ] `npx tsc -b` to confirm types still pass.
- [ ] `npm run build` to confirm Vite + Workbox build OK.
- [ ] If you see a stale dashboard crash, delete the `sadp_offline`
  IDB once.

After testing, capture any findings in this doc under a new
"§12 Test findings" section so the next session can pick them up.
