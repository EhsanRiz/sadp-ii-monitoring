# Phase 1 Starter Kit — SADP-II Monitoring App

Everything you need to bootstrap the Phase 1 schema and data without having to re-derive the design doc on the other machine.

**Before you start:** read [../PHASE_1_DESIGN.md](../PHASE_1_DESIGN.md) v0.4 (the source of truth) and follow [../PHASE_1_QUICKSTART.md](../PHASE_1_QUICKSTART.md) step-by-step. This README orients you to *what's in this folder*; the quickstart tells you *what to do with it*.

## Folder layout

```
starter_kit/
├── README.md                  ← you are here
├── migrations/                ← 10 Supabase SQL migrations (010 → 100)
│   ├── 010_extensions.sql
│   ├── 020_organizations_rounds.sql
│   ├── 030_user_profiles.sql
│   ├── 040_geo_hierarchy.sql
│   ├── 050_enterprise_types.sql
│   ├── 060_enterprises.sql
│   ├── 070_audit_log.sql
│   ├── 080_rls_helpers.sql
│   ├── 090_rls_policies.sql
│   └── 100_auth_hook.sql
├── seeds/                     ← inserts after migrations run
│   ├── 110_seed_organizations.sql      (4D, RSDA)
│   ├── 120_seed_rounds.sql             (Round 3 active, Round 4 upcoming)
│   ├── 130_seed_enterprise_types.sql   (17 types in 4 categories)
│   ├── load_4d_catalog.py              (districts, CCs, RCs, villages for 4D)
│   └── .env.example
└── round3_import/             ← migrate the 191 Round 3 enterprises
    ├── import.py
    └── .env.example
```

## What each piece does

### Migrations (run in order)

| File | Creates |
|---|---|
| `010_extensions.sql` | `pgcrypto`, `uuid-ossp`, the generic `set_updated_at` trigger function |
| `020_organizations_rounds.sql` | `organizations` (4D, RSDA) and `rounds` (3, 4) tables |
| `030_user_profiles.sql` | `user_profiles` extending `auth.users`, plus the auto-create trigger on new auth users |
| `040_geo_hierarchy.sql` | `districts`, `community_councils`, `resource_centers`, `villages` — with denormalization triggers from district |
| `050_enterprise_types.sql` | Catalog table for the 17 types (rows seeded by `130`) |
| `060_enterprises.sql` | The main `enterprises` table with the `registration_completeness` flag, completeness CHECK, geo-consistency trigger |
| `070_audit_log.sql` | `audit_log` table + `audit_trigger()` function, attached to `enterprises` and `user_profiles` |
| `080_rls_helpers.sql` | `current_user_org_id()`, `current_user_role()`, `is_super_admin()` |
| `090_rls_policies.sql` | RLS policies for every table per the §4 matrix |
| `100_auth_hook.sql` | `custom_access_token_hook()` — injects `organization_id` and `user_role` into the JWT |

After 100 runs, you must enable the hook in Supabase Dashboard (Auth → Hooks). See QUICKSTART step 5.

### Seeds

- `110`, `120`, `130` are pure SQL — run via `psql` or include in `supabase/seed.sql`.
- `load_4d_catalog.py` reads `../../extracted_catalog/01_districts.csv` through `04_villages.csv` and upserts them via the Supabase Python client. Uses the service role key (which bypasses RLS — never expose in the frontend).

### Round 3 import

`import.py` reads `../../extracted_catalog/07_sample_enterprises_round3.csv`, resolves foreign keys against the loaded catalog, inserts 191 enterprises as `round_id=3` with `registration_completeness='minimal'`, and writes `ROUND3_IMPORT_REPORT.md` documenting every normalization and any rows that needed manual attention.

## Idempotency

Every SQL file uses `IF NOT EXISTS` or `ON CONFLICT DO NOTHING`. The Python scripts check for existing rows before inserting. You can safely re-run any of them.

## Verification queries

After running everything, these queries should return what's noted:

```sql
SELECT count(*) FROM organizations;                                              -- 2
SELECT count(*) FROM rounds;                                                     -- 2
SELECT count(*) FROM enterprise_types;                                           -- 17
SELECT count(*) FROM districts WHERE organization_id=(SELECT id FROM organizations WHERE code='4D');  -- 3
SELECT count(*) FROM community_councils WHERE organization_id=(SELECT id FROM organizations WHERE code='4D');  -- 27
SELECT count(*) FROM resource_centers WHERE organization_id=(SELECT id FROM organizations WHERE code='4D');  -- 17
SELECT count(*) FROM enterprises WHERE round_id=3;                               -- ~191
SELECT count(*) FROM audit_log WHERE table_name='enterprises';                   -- ~191 (one INSERT row per enterprise)
```

## Common pitfalls

- **Forgetting to enable the Auth Hook in Studio** — RLS will lock everyone out because `current_user_org_id()` returns null without it. Symptom: an authenticated 4D user queries `enterprises` and sees 0 rows.
- **Running the Python scripts with the anon key instead of the service role key** — RLS blocks the inserts. Use service role.
- **Running seeds before migrations** — they'll fail on missing tables. Order matters: migrations 010-100, then seeds 110-130, then `load_4d_catalog.py`, then `round3_import/import.py`.
- **Editing the migrations after they've been pushed to a linked project** — Supabase tracks applied migrations by filename hash. Edits cause drift. If you must edit, write a new migration that fixes the issue.

## What's deliberately NOT in this kit

The React app itself. UI library choice, component structure, PDF generation library, state management, form handling — those are your calls. The design doc tells you the contracts (schema, RLS, what the cover page needs to render); the *how* is yours.

See [../PHASE_1_QUICKSTART.md](../PHASE_1_QUICKSTART.md) steps 10–14 for the order I'd build the app side in, but the choices belong to you.
