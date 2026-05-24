# Phase 1 Implementation Quickstart

A step-by-step checklist for implementing Phase 1 on your machine. Designed to be followed top-to-bottom. Read [PHASE_1_DESIGN.md](./PHASE_1_DESIGN.md) v0.4 first if you haven't already.

**Roughly 5–8 working days of effort**, depending on familiarity with Supabase + the chosen UI library.

---

## 0. Prerequisites

Install on your machine:

- **Node.js ≥ 20** (`node --version`)
- **Supabase CLI ≥ 1.190** — install via `brew install supabase/tap/supabase` or [docs](https://supabase.com/docs/guides/cli)
- **Python ≥ 3.10** (only needed for the catalog loader + Round 3 import scripts; not the React app)
- **Docker** (the Supabase CLI uses it to run a local stack)
- **Git**

Verify:

```bash
node --version
supabase --version
python3 --version
docker --version
```

---

## 1. Clone the repo

```bash
git clone https://github.com/EhsanRiz/sadp-ii-monitoring.git sadp-ii-monitoring
cd sadp-ii-monitoring
git checkout -b phase-1-redesign
```

Create a Phase 1 working branch. Don't touch `main` until Phase 1 is reviewed and merged.

---

## 2. Trash the legacy artifacts

Per [§10.2 of the design doc](./PHASE_1_DESIGN.md#102-discard), delete the ~25 root fix docs and stale operational files. From the repo root:

```bash
# Stale docs
rm -f \
  ADMIN_DASHBOARD_FIX_GUIDE.md ADMIN_LOGIN_FIX.md \
  AUTHENTICATION_FIXED.md AUTHENTICATION_FIX_SUMMARY.md \
  CHAT_PERSISTENCE_FIX_SUMMARY.md DASHBOARD_STATUS.md \
  FIXES_APPLIED.md FIX_ALL_USERS_GUIDE.md \
  FIX_DASHBOARD_QUICKSTART.md FIX_MALIKA_LOGIN.md \
  IMPLEMENTATION_COMPLETE.md ISSUE_ANALYSIS.md \
  LOGIN_GUIDE.md MESSAGE_SENDING_DEBUG_GUIDE.md \
  OFFLINE_STATUS_FIX.md PWA_FEATURES.md \
  QUICK_FIX.md QUICK_FIX_GUIDE.md QUICK_START.md \
  ROUTING_FIX.md SCHEMA_DOCS_IMPLEMENTATION.md \
  START_HERE.md SUPER_ADMIN_SETUP_GUIDE.md \
  TRENDS_IMPLEMENTATION_SUMMARY.md UPDATE_CREDENTIALS.md

# Stale operational files
rm -f check_auth_status.sql reset-admin.html test_batch_reset.sh

# Reset Supabase migrations
rm -rf supabase/migrations/*
rm -rf supabase/functions/*  # review before deleting if anything looks salvageable

# Decide on dev-dist (build artifacts) and .bolt (Bolt scaffolding)
rm -rf dev-dist .bolt

# Write a placeholder README (you'll replace at the end of Phase 1)
echo "# SADP-II Monitoring App\n\nUnder Phase 1 redesign. See \`docs/PHASE_1_DESIGN.md\`." > README.md
```

Move the design + quickstart + reference docs into the repo:

```bash
mkdir -p docs reference_documents
cp /path/to/SADP_Monitoring/PHASE_1_DESIGN.md       docs/
cp /path/to/SADP_Monitoring/PHASE_1_QUICKSTART.md   docs/
cp -r /path/to/SADP_Monitoring/reference_documents/* reference_documents/
cp -r /path/to/SADP_Monitoring/extracted_catalog .
```

Commit the cleanup:

```bash
git add -A
git commit -m "phase-1: wipe legacy artifacts, add design + reference docs"
```

---

## 3. Set up a fresh Supabase project

Two options. **Recommended:** create a brand-new project so Round 3 cleanup is impossible to undo.

### Option A — new Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project named `sadp-ii-monitoring` (region: closest to Lesotho, likely Cape Town `af-south-1` or Frankfurt).
2. Note the URL and the **anon** and **service_role** keys (Settings → API).
3. From the repo root:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
```

### Option B — reset existing project

```bash
supabase link --project-ref YOUR-EXISTING-REF
supabase db reset --linked   # WIPES EVERYTHING
```

Either way, also start a local Supabase for development:

```bash
supabase start
# Note the local API URL + anon key it prints — used for local dev
```

---

## 4. Drop in the migrations

```bash
cp /path/to/SADP_Monitoring/starter_kit/migrations/*.sql supabase/migrations/
ls supabase/migrations/   # should show 010_extensions.sql ... 100_auth_hook.sql
```

Apply them locally first:

```bash
supabase db reset   # wipes local DB and re-runs all migrations
```

Then push to the linked project:

```bash
supabase db push
```

### Smoke check

Open Supabase Studio (`supabase status` shows the local URL) → SQL Editor → run:

```sql
SELECT table_name FROM information_schema.tables
 WHERE table_schema = 'public' ORDER BY table_name;
```

Expected tables: `audit_log`, `community_councils`, `districts`, `enterprises`, `enterprise_types`, `organizations`, `resource_centers`, `rounds`, `user_profiles`, `villages`.

---

## 5. Enable the Auth Hook

In Supabase Dashboard (linked project) → **Authentication → Hooks → Custom Access Token Hook**:

- Toggle **Enable**
- Function schema: `public`
- Function name: `custom_access_token_hook`
- Save

After this, every JWT issued at sign-in carries `organization_id` and `user_role` claims, which the RLS policies read.

For local dev, edit `supabase/config.toml`:

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

Then `supabase stop && supabase start`.

---

## 6. Seed organizations, rounds, enterprise types

```bash
cp /path/to/SADP_Monitoring/starter_kit/seeds/*.sql supabase/seeds/
# Then run them. Cleanest path: include them in supabase/seed.sql (they're idempotent)
# OR run via psql against the local DB:
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/seeds/110_seed_organizations.sql
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/seeds/120_seed_rounds.sql
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/seeds/130_seed_enterprise_types.sql
```

Verify:

```sql
SELECT * FROM public.organizations;       -- 2 rows: 4D, RSDA
SELECT * FROM public.rounds;              -- 2 rows: Round 3 active, Round 4 upcoming
SELECT count(*) FROM public.enterprise_types;  -- 17
```

---

## 7. Load the 4D catalog

```bash
cd /path/to/SADP_Monitoring/starter_kit/seeds
cp .env.example .env
# Edit .env: paste SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from Dashboard → Settings → API)

pip install supabase python-dotenv
python3 load_4d_catalog.py --dry-run    # verify CSVs read correctly
python3 load_4d_catalog.py              # write
```

Verify in SQL Editor:

```sql
SELECT
  (SELECT count(*) FROM districts          WHERE organization_id = (SELECT id FROM organizations WHERE code='4D')) AS d,
  (SELECT count(*) FROM community_councils WHERE organization_id = (SELECT id FROM organizations WHERE code='4D')) AS cc,
  (SELECT count(*) FROM resource_centers   WHERE organization_id = (SELECT id FROM organizations WHERE code='4D')) AS rc,
  (SELECT count(*) FROM villages           WHERE organization_id = (SELECT id FROM organizations WHERE code='4D')) AS v;
-- Expected: d=3, cc=27, rc=17, v=140
```

---

## 8. Run the Round 3 import

```bash
cd /path/to/SADP_Monitoring/starter_kit/round3_import
cp .env.example .env       # same Supabase creds

python3 import.py --dry-run    # validate all rows resolve, no writes
python3 import.py              # actual import
```

Read `ROUND3_IMPORT_REPORT.md`. Verify:

- ~191 enterprises inserted
- No unmapped enterprise types
- Missing CCs / RCs flagged are expected (some Round 3 records genuinely lack them; field staff complete via UI)

Verify in SQL Editor:

```sql
SELECT count(*) FROM enterprises WHERE round_id = 3;     -- ~191
SELECT count(*) FROM enterprises WHERE registration_completeness = 'minimal';  -- same
```

---

## 9. Create the first Super Admin account

In Supabase Dashboard → **Authentication → Users → Add user**:

- Email: yours (`sehsan.rizvi@gmail.com`)
- Password: anything strong
- **Auto Confirm User: YES**
- User Metadata:

```json
{
  "role": "super_admin",
  "full_name": "Ehsan Rizvi",
  "organization_id": null
}
```

The `handle_new_auth_user()` trigger in migration 030 picks up the metadata and creates the matching `user_profiles` row. Verify:

```sql
SELECT * FROM public.user_profiles WHERE role = 'super_admin';
```

Sign in once via the frontend (Step 11) and decode the JWT to confirm `user_role='super_admin'` and `organization_id=null` are present.

---

## 10. Build the auth + role gating

**You're now writing app code.** Recommended approach:

1. Verify the package.json deps you actually want — Supabase JS client, React Router, your form library of choice (likely `react-hook-form` + `zod`), your UI library (shadcn vs raw Tailwind), a date library (`date-fns`), and a PDF lib for Step 13.
2. `src/lib/supabase.ts` — typed Supabase client (run `supabase gen types typescript --linked > src/types/database.ts` first).
3. `src/lib/auth.ts` + `useAuth()` hook — wraps Supabase Auth, exposes `user`, `role`, `organizationId`, `isSuperAdmin`, `signIn`, `signOut`.
4. `<RoleGate roles={[...]}>` route guard component.
5. `/login` and `/reset-password` pages.

**Test:** sign in as Super Admin → land on `/admin/dashboard`. Create a test 4D Field Supervisor user → sign in as them → land on `/field/dashboard`. Confirm 4D FS cannot see anything (no enterprises yet).

---

## 11. Build the admin panel (Super Admin only)

Five screens. Each is a simple list + edit form against a single table:

- `/admin/organizations` (read-only — 4D and RSDA pre-seeded)
- `/admin/users` — invite-user edge function calling Supabase Admin API
- `/admin/districts` — list + create form
- `/admin/community-councils` — list + create form, parent district dropdown
- `/admin/resource-centers` — list + create form, parent district dropdown
- `/admin/enterprise-types` — read-only list (pre-seeded)

The invite-user edge function lives at `supabase/functions/invite-user/index.ts` and calls `supabase.auth.admin.inviteUserByEmail()` with `user_metadata` containing `role`, `organization_id`, `full_name`, `phone`. Only callable by Super Admin (verify via JWT in the function).

---

## 12. Build enterprise registration

Per §6.9 — every field in the schema, with conditional validation based on `registration_completeness`.

- **List page** (`/enterprises`): filter by district, RC, type, ESMP status, completeness. Already 191+ rows once Round 3 imports run.
- **Detail page** (`/enterprises/:id`): all fields, edit-in-place. "History" tab querying `audit_log` for this `record_id`.
- **New page** (`/enterprises/new`): wizard or single form. On submit, sets `registration_completeness='cover_page_ready'` if all required fields filled, else `'minimal'`.
- **ESMP status block**: dropdown for status; file upload for `completed_uploaded` writes to Supabase Storage (`esmp-pdfs/{enterprise_id}.pdf`).

---

## 13. Build the Milestone 1 cover-page PDF generator

Pure rendering — no editing. Implementation choices:

- **`react-pdf/renderer`** if you want JSX-style PDFs
- **`pdfme`** if you want a template + bindings approach
- **Puppeteer in an edge function** if you want HTML/CSS-driven (highest visual fidelity to the original layout)

I'd lean toward `react-pdf/renderer` for Phase 1 — runs in the browser, no server dependency, fine for one-page document.

The renderer reads an `enterprises` row, formats currency as `M{:,.2f}`, formats dates as `dd/mm/yyyy`, and lays out the table exactly as Annex V/A. Reject rendering if `registration_completeness != 'cover_page_ready'`.

Route: `/enterprises/:id/cover-page.pdf` (downloads on visit).

---

## 14. Build the audit log UI

Already queryable via RLS as a non-Super-Admin org user. Build the "History" tab on the enterprise detail page:

```sql
SELECT *
  FROM public.audit_log
 WHERE table_name = 'enterprises'
   AND record_id = $1
 ORDER BY changed_at DESC;
```

Render each row: `{full_name} {INSERT|UPDATE|DELETE'd} on {dd/mm/yyyy HH:mm}` plus, for UPDATEs, a per-column diff from the `diff` jsonb column.

For Field Supervisor / M&E / TL, RLS already scopes to their org.

---

## 15. Run through acceptance criteria (§11 of design doc)

Open `docs/PHASE_1_DESIGN.md` §11 and tick every checkbox. The non-trivial smoke tests:

```sql
-- Geo consistency: this MUST fail
INSERT INTO enterprises (organization_id, round_id, beneficiary_short_name,
  applicant_organisation_name, enterprise_type_id, district_id, community_council_id)
SELECT
  (SELECT id FROM organizations WHERE code='4D'),
  3, 'test', 'test', 1,
  (SELECT id FROM districts WHERE name='Berea' AND organization_id=(SELECT id FROM organizations WHERE code='4D')),
  (SELECT id FROM community_councils WHERE name='Manonyane Community Council' LIMIT 1);  -- Maseru CC, not Berea

-- Audit immutability: this MUST fail for Super Admin too
DELETE FROM audit_log WHERE id = 1;

-- 4D user cannot see RSDA: sign in as 4D Field Supervisor in a private window
SELECT count(*) FROM districts WHERE organization_id = (SELECT id FROM organizations WHERE code='RSDA');
-- Returns 0 if RLS works
```

---

## 16. Commit, push, open a PR

```bash
git add -A
git commit -m "phase-1: schema, auth, admin panel, enterprise registration, cover page, audit log"
git push origin phase-1-redesign
```

Open PR on GitHub. Title: `Phase 1 redesign — foundation, registration, cover page, audit log`. Description links to `docs/PHASE_1_DESIGN.md`.

---

## When you hit something the doc doesn't cover

The design doc is the source of truth. If a question isn't answered there:

1. Check this quickstart's steps.
2. Check the inline comments in the SQL migration files — most rationale is captured there.
3. Make a judgement call and add a note to `docs/PHASE_1_OPEN_QUESTIONS.md` for review.

Phase 2 (ESMP digital forms) starts after Phase 1 is merged and demoed. Templates for `livestock`, `aquaculture`, `processing` categories are the gating dependency.
