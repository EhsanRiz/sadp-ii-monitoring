# SADP-II Monitoring App — Phase 1 Design Doc

**Status:** Draft v0.4 — for review by Ehsan Rizvi
**Owner:** 4D Climate Solutions
**Drafted:** 2026-05-22 · **Revised:** 2026-05-22 (v0.2 after 4D database review; v0.3 closing Excel-review open items; v0.4 schema refinement for partial Round 3 records)
**Replaces:** the accumulated `*_FIX*.md` notes from prior iterations of the codebase

**v0.4 changes from v0.3:**
- **Partial registration model added.** Round 3 records imported from the 4D Excel don't have registration number, project title, period dates, costs, or signatures. So:
  - Most cover-page fields on `enterprises` change from NOT NULL to NULLABLE (see §6.9 revised list).
  - A new column `registration_completeness` enum (`'minimal'` | `'cover_page_ready'`) tracks readiness.
  - A CHECK constraint enforces that when `registration_completeness = 'cover_page_ready'`, all the cover-page-required fields must be non-null.
  - The cover-page PDF generator refuses to render unless the row is `'cover_page_ready'`.
  - UI for Round 4 registration requires all fields up-front and saves with `'cover_page_ready'`. Round 3 records start at `'minimal'` and field staff progressively complete them.
- Migration script writes Round 3 imports with `registration_completeness = 'minimal'`.

**v0.3 changes from v0.2:**
- Terminology fixed: **"ESMP"** is the umbrella term throughout. The ESMP package has two parts: the *Environmental and Social Screening Form* and the *Environmental Management and Monitoring Plan* — together they are the ESMP. (The doc previously used "EMMP" in places, lifting the literal title of the Plan document; corrected.)
- **Round 3 migration locked into Phase 1 scope.** The 191 enterprises from 4D's Excel are imported as `round_id=3` records, with a data-quality report showing what was normalized.
- **`beneficiary_short_name` column added** to `enterprises` alongside `applicant_organisation_name` (e.g., `'Octagon'` short, `'Octagon Farming PTY LTD'` formal).
- Service Provider stays as **plain text only** — Round 3 SPs aren't continuing into Round 4, so no `service_providers` table.
- **Phase 2 ESMP templates locked per-category** (4 templates covering all 17 types): crops / livestock / aquaculture / processing.

**v0.2 changes from v0.1** (carried forward):
- M&E Officer and Field Supervisor INSERT+UPDATE permission **locked**.
- Field Supervisor scope **locked** at organization-wide (not per-district).
- **Audit logging added to Phase 1 scope**.
- Geographic hierarchy: CC, RC, Village are siblings under District (not nested).
- `enterprises` gains `beneficiary_contact_phone` and three borehole tracking flags.
- Enterprise type seed list expanded to 17 to match real 4D data.
- Catalog seed data extracted from the 4D Excel and saved in `extracted_catalog/`.

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [What Phase 1 Delivers](#2-what-phase-1-delivers)
3. [Architecture Overview](#3-architecture-overview)
4. [Roles & Permissions](#4-roles--permissions)
5. [Geographic Hierarchy](#5-geographic-hierarchy)
6. [Data Model](#6-data-model)
7. [Row-Level Security (RLS)](#7-row-level-security-rls)
8. [Authentication Model](#8-authentication-model)
9. [Frontend: Routing & Role Gating](#9-frontend-routing--role-gating)
10. [Existing Repo: Keep / Discard / Review](#10-existing-repo-keep--discard--review)
11. [Phase 1 Acceptance Criteria](#11-phase-1-acceptance-criteria)
12. [Forward Look: Phases 2–5](#12-forward-look-phases-25)
13. [Dependencies & Open Items](#13-dependencies--open-items)

---

## 1. Purpose & Scope

The SADP-II Monitoring App is a Progressive Web App (PWA) used by **4D Climate Solutions** and **RSDA** to monitor smallholder agriculture enterprises funded under SADP-II in the Kingdom of Lesotho. It supports two implementation rounds (Round 3, currently active; Round 4, launching imminently), with each organization operating in its own districts and managing its own staff and beneficiaries.

This Phase 1 doc covers the **foundational substrate only** — data model, auth, roles, and the geographic catalog. It does **not** cover ESMP forms (Phase 2), milestone monitoring data collection (Phase 3), or report generation (Phase 4). Those are previewed in §12.

The architectural decisions below were locked with Ehsan on 2026-05-22 and are not in scope for further debate at this stage. They are restated here for completeness.

### Locked architectural decisions

| Decision | Resolution |
|---|---|
| Round separation | Single Supabase project; `round_id` column on relevant tables; RLS / view-level filters |
| Multi-tenancy | Two organizations (4D, RSDA) as first-class entities; org scoping cascades through the geographic hierarchy |
| Service Provider | **Not** a user role and **not** a structured entity. Captured as plain text on the enterprise record, manually filled by the Field Supervisor at registration. Round 3 SPs aren't continuing into Round 4. |
| District ownership | Each district belongs to **exactly one** organization; no overlap |
| Existing Round 3 data | **Migrated** into the new app from the 4D Excel as `round_id=3` records (191 enterprises). Field staff monitor Round 3 and Round 4 from one system. A data-quality report ships with the import. RSDA's Round 3 data is loaded similarly once received. |
| Roles | Super Admin (Ehsan, cross-org), Team Leader, M&E Officer, Field Supervisor |
| M&E Officer + Field Supervisor permissions on enterprises | **Both can INSERT and UPDATE.** No district-level scoping for Field Supervisors — they see all enterprises in their org, filterable in the UI. |
| Audit logging | **In Phase 1 scope.** Every change to `enterprises` (and `user_profiles`) is recorded with who/when/before/after, queryable per enterprise. |
| Geographic hierarchy | Organization → District → {Community Council, Resource Center, Village} → Enterprise. CC, RC, and Village are **siblings** under District (flat, not nested), because real 4D data shows RCs routinely serve multiple CCs. |
| Enterprise types (Phase 2 scope) | Expanded from 4 to 17 to match real data: Vegetable Production, Broiler Production, Piggery, Dairy Production, Ram Breeding, Ram & Buck Breeding, Egg Production, Duck Production, Hatchery, Fish Production, Hydroponics, Meat Processing, Fruit Drying, Fruit & Vegetable Processing, Milling, Seedling Production, Livestock Production. Grouped into 4 categories. |
| ESMP templates (Phase 2) | **Per-category, not per-type.** Four ESMP templates total — one each for `crops`, `livestock`, `aquaculture`, `processing` — applied to all 17 types via the `enterprise_types.category` field. The Vegetable Production Ver. 2 22/06/2022 in hand becomes the basis for the `crops` template. |

---

## 2. What Phase 1 Delivers

By the end of Phase 1, the team should be able to:

- Log in as a Super Admin, Team Leader, M&E Officer, or Field Supervisor.
- Be correctly scoped: 4D staff see only 4D data; RSDA staff see only RSDA data; Super Admin sees everything.
- Manage the geographic catalog (organizations, districts, community councils, resource centers, villages).
- Register a new enterprise with all Annex V/A "Project Summary Form" fields captured.
- Generate the **Milestone 1 cover page PDF** from the enterprise record (one report output included in Phase 1 to validate the end-to-end flow).
- Mark an enterprise's ESMP status (`not_started`, `pending_app_completion`, `completed_uploaded`, `completed_in_app`) and upload a scanned PDF for `completed_uploaded`.
- See, per enterprise, an **audit trail** of every change: who, when, before/after. The history is queryable from the enterprise detail page.

What Phase 1 explicitly does **not** deliver:

- Digital ESMP screening or ESMP forms (Phase 2).
- Multi-visit monitoring data collection (Phase 3).
- The full Milestone 1 report beyond the cover page (Phase 4).
- Dashboards or analytics (Phase 5).

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            PWA (browser + offline)                       │
│  React + Vite + TypeScript + Tailwind, Service Worker, IndexedDB cache  │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ Supabase JS client (HTTPS / WebSocket)
┌────────────────────────────┴─────────────────────────────────────────────┐
│                              Supabase                                    │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                  │
│  │  Auth (JWT)  │   │  Postgres    │   │ Storage      │                  │
│  │  custom      │   │  RLS-gated   │   │ (signatures, │                  │
│  │  claims:     │   │  schema      │   │  ESMP PDFs)  │                  │
│  │  org, role   │   │              │   │              │                  │
│  └──────────────┘   └──────────────┘   └──────────────┘                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Stack confirmation:** the existing repo's choice of Vite + React + TypeScript + Tailwind + Supabase + PWA is the right substrate. We keep this. We do not introduce a server-side Node/Express layer — Supabase RLS + edge functions cover all backend needs.

**Scoping principle:** every non-catalog row carries `organization_id` and (where relevant) `round_id`. Catalog rows (districts, community_councils, resource_centers, villages) carry `organization_id`. Users carry `organization_id` (null only for Super Admin). RLS enforces "show me only my org's data" at the database level; the client cannot bypass this even with a malicious patch.

**Offline behaviour:** the PWA caches reference data (districts, CCs, RCs, villages, enterprise types) in IndexedDB so a Field Supervisor can register an enterprise offline. Writes queue and flush on reconnection. This is implemented in Phase 3 properly; Phase 1 only needs basic offline shell readiness.

---

## 4. Roles & Permissions

Four roles, ordered from most to least privileged:

| Role | Scope | Read | Write | Notes |
|---|---|---|---|---|
| **Super Admin** | All orgs, all rounds | Everything | Everything | Only Ehsan. Singleton (`organization_id` is `NULL`). |
| **Team Leader (TL)** | Their org, all rounds | All data in org | Nothing | Observation only. Dashboards / read-only views. |
| **M&E Officer** | Their org, all rounds | All data in org | Review fields on reports; mark visits as reviewed; generate / finalize reports | The "approval" tier. |
| **Field Supervisor** | Their org, all rounds | All data in org | Create / update enterprises and visit data; upload signatures and ESMP PDFs | The "data entry" tier. |

### Permission matrix (Phase 1 tables only)

| Table | Super Admin | TL | M&E Officer | Field Supervisor |
|---|---|---|---|---|
| `organizations` | RW | R | R | R |
| `rounds` | RW | R | R | R |
| `user_profiles` (other users in org) | RW (all) | R (own org) | R (own org) | R (own org) |
| `user_profiles` (self) | RW | RW (limited fields) | RW (limited fields) | RW (limited fields) |
| `districts` | RW | R | R | R |
| `community_councils` | RW | R | R | R |
| `resource_centers` | RW | R | R | R |
| `villages` | RW | R | R | RW (add only) |
| `enterprise_types` | RW | R | R | R |
| `enterprises` | RW | R | RW (incl. INSERT) | RW (incl. INSERT, no DELETE) |
| `audit_log` | R (all) | R (own org) | R (own org) | R (own org) |

**Locked in v0.2:** M&E Officer and Field Supervisor both have full INSERT and UPDATE on `enterprises`. Field Supervisors see all enterprises in their org (no per-district scoping). DELETE remains Super-Admin-only.

**Why villages allow Field Supervisor add:** villages are the most granular geographic level and field staff routinely encounter new villages on visits. Letting them add (but not edit/delete) keeps the catalog growing organically without bottlenecking on the Super Admin. All other geographic levels are pre-seeded and managed by Super Admin.

**Why districts/CCs/RCs are Super-Admin-only writes:** these change very rarely and an incorrect edit (e.g., reassigning a district to a different org) would silently break access for an entire team. Tight control is appropriate.

**Why nobody can write `audit_log` directly:** only the Postgres trigger (`SECURITY DEFINER`) writes to it. Even Super Admin cannot manually insert or delete audit rows from the client — this guarantees the trail is tamper-resistant.

---

## 5. Geographic Hierarchy

**Revised in v0.2** — based on the real 4D operational database (`Enterprise database for 4D Climate solutions_final draft.xlsx`), Resource Centers do **not** nest under Community Councils. Examples from the data:

- **Masianokeng RC** (Maseru district) serves enterprises in 10 different CCs: Kubake, Lilala, Manonyane, Maseru Urban, Mazenod, Mohlakeng, Qiloane, Ratau, Makhoarane, Senekane.
- **Maqhaka RC** (Berea district) serves 4 CCs: Kanana, Kubake, Maseru Urban Council, Senekane.
- **Sefikeng RC** even appears in records spanning Berea and Maseru districts (likely a data-entry inconsistency, but evidence that the "RC sits under CC" model is wrong).

The corrected model treats **Community Council, Resource Center, and Village as siblings under District** — each is its own dimension that an enterprise references independently.

```
Organization (4D, RSDA)
    └─ District            [organization_id ← root of org ownership]
        ├─ Community Council    (one of many CCs in this district)
        ├─ Resource Center      (one of many RCs in this district)
        └─ Village              (one of many villages in this district)

Enterprise references one each of (District, CC, RC, Village) — all four must
belong to the same District (enforced by trigger).
```

`organization_id` is denormalized onto every catalog level and onto enterprises so RLS stays single-column. The denormalization is enforced via triggers (insert/update copies `organization_id` from the parent District), making inconsistency impossible.

**Pre-seeding:** the 4D Excel has been extracted into clean CSVs in `extracted_catalog/`:

| File | Rows | Contents |
|---|---|---|
| `01_districts.csv` | 3 | Berea, Maseru, Thaba-Tseka (4D-operated districts in this dataset) |
| `02_community_councils.csv` | 27 | 4D's CCs grouped by district |
| `03_resource_centers.csv` | 17 | 4D's RCs grouped by district |
| `04_villages.csv` | 140 | 4D's villages grouped by district |
| `05_enterprise_types_observed.csv` | 17 | Normalized enterprise types seen in real records |
| `06_service_providers.csv` | 18 | The full 4D SP catalog with codes (e.g., SPQIL A001) |
| `07_sample_enterprises_round3.csv` | 191 | All current Round 3 enterprises — for **test/staging seed**, not production |

These cover **4D only**. RSDA's equivalent catalog still needs to be collected from RSDA before production launch — flagged in §13.

---

## 6. Data Model

All tables use `uuid` primary keys (generated via `gen_random_uuid()`) unless stated. All tables have `created_at timestamptz default now()` and `updated_at timestamptz default now()` with a generic `set_updated_at` trigger.

### 6.1 `organizations`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `code` | text | UNIQUE, NOT NULL | `'4D'`, `'RSDA'` |
| `name` | text | NOT NULL | `'4D Climate Solutions'`, `'RSDA'` |
| `created_at` | timestamptz | default `now()` | |

Two rows, inserted by seed migration.

### 6.2 `rounds`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | smallint | PK | Use `3`, `4` directly (not a uuid) |
| `name` | text | NOT NULL | `'Round 3'`, `'Round 4'` |
| `status` | text | CHECK in (`'active'`, `'upcoming'`, `'closed'`) | |
| `start_date` | date | | |
| `end_date` | date | NULL allowed | |

Round 3 inserted as `active`, Round 4 inserted as `upcoming` and flipped when ready.

### 6.3 `user_profiles`

Extends Supabase's `auth.users`. The Supabase auth table holds credentials and basic identity; the profile table holds org/role and is what app queries reference.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, FK → `auth.users.id` ON DELETE CASCADE | |
| `organization_id` | uuid | FK → `organizations.id` | NULL only when `role = 'super_admin'` |
| `role` | text | CHECK in (`'super_admin'`, `'team_leader'`, `'me_officer'`, `'field_supervisor'`) | |
| `full_name` | text | NOT NULL | |
| `phone` | text | | |
| `is_active` | boolean | default `true` | Soft-disable without deleting auth user |
| `created_at` | timestamptz | default `now()` | |
| `updated_at` | timestamptz | default `now()` | |

**Constraints:**

```sql
CHECK (
  (role = 'super_admin' AND organization_id IS NULL)
  OR (role <> 'super_admin' AND organization_id IS NOT NULL)
)
```

**Indexes:** `(organization_id, role)`, `(organization_id, is_active)`.

### 6.4 `districts`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `organization_id` | uuid | FK → `organizations.id`, NOT NULL | Locked at creation |
| `name` | text | NOT NULL | e.g., `'Berea'` |
| `code` | text | | Optional short code |
| `created_at` | timestamptz | default `now()` | |

UNIQUE (`organization_id`, `name`).

### 6.5 `community_councils`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `district_id` | uuid | FK → `districts.id`, NOT NULL | Parent dimension |
| `organization_id` | uuid | FK → `organizations.id`, NOT NULL | Denormalized from district |
| `name` | text | NOT NULL | |
| `created_at` | timestamptz | default `now()` | |

UNIQUE (`district_id`, `name`).
Trigger: BEFORE INSERT/UPDATE — set `organization_id` from parent district.

### 6.6 `resource_centers`

**Revised in v0.2:** RC now hangs off District directly, not CC.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `district_id` | uuid | FK → `districts.id`, NOT NULL | Direct parent |
| `organization_id` | uuid | FK → `organizations.id`, NOT NULL | Denormalized |
| `name` | text | NOT NULL | e.g., `'Maqhaka'`, `'Masianokeng'`, `'Teyateyaneng'` |
| `created_at` | timestamptz | default `now()` | |

UNIQUE (`district_id`, `name`).
Trigger: BEFORE INSERT/UPDATE — set `organization_id` from parent district.

### 6.7 `villages`

**Revised in v0.2:** Village now hangs off District directly. Real 4D villages (`Ha Mafefooane`, `Ha-Teko`, `Khubetsoana`, etc.) are loosely associated with CCs and RCs in the source data, but the relationship is many-to-many in practice, so we treat Village as a sibling of CC and RC under District.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `district_id` | uuid | FK → `districts.id`, NOT NULL | Direct parent |
| `organization_id` | uuid | FK → `organizations.id`, NOT NULL | Denormalized |
| `name` | text | NOT NULL | |
| `created_at` | timestamptz | default `now()` | |

UNIQUE (`district_id`, `name`).
Trigger: BEFORE INSERT/UPDATE — set `organization_id` from parent district.

### 6.8 `enterprise_types`

**Expanded in v0.2** to match the 17 distinct types observed in real 4D data after normalization.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | smallint | PK | |
| `code` | text | UNIQUE, NOT NULL | snake_case slug |
| `name` | text | NOT NULL | Display name |
| `category` | text | CHECK in (`'crops'`, `'livestock'`, `'aquaculture'`, `'processing'`), NOT NULL | Drives Phase 2 ESMP template routing — each type inherits the template attached to its category. |

Phase 2 does **not** add per-type template-availability columns to this table. ESMP templates are per-category, and the template lookup happens via `enterprise_types.category` → `esmp_templates.category` (a Phase 2 table).

**Seed list (Phase 1):**

| code | name | category |
|---|---|---|
| `vegetable_production` | Vegetable Production | crops |
| `hydroponics` | Hydroponics | crops |
| `seedling_production` | Seedling Production | crops |
| `broiler_production` | Broiler Production | livestock |
| `egg_production` | Egg Production | livestock |
| `hatchery` | Hatchery | livestock |
| `duck_production` | Duck Production | livestock |
| `piggery` | Piggery | livestock |
| `dairy_production` | Dairy Production | livestock |
| `ram_breeding` | Ram Breeding | livestock |
| `ram_buck_breeding` | Ram & Buck Breeding | livestock |
| `livestock_production` | Livestock Production | livestock |
| `fish_production` | Fish Production | aquaculture |
| `meat_processing` | Meat Processing | processing |
| `fruit_drying` | Fruit Drying | processing |
| `fruit_veg_processing` | Fruit & Vegetable Processing | processing |
| `milling` | Milling | processing |

All 17 types seeded at Phase 1 time with their fixed `category`. Phase 2 attaches one ESMP template per category (`crops`, `livestock`, `aquaculture`, `processing`); every type inherits its category's template at form-render time.

### 6.9 `enterprises` — the cover page table

Maps **every** field on the Annex V/A Project Summary cover page, **plus** operational fields from the 4D database (contact phone, borehole status) that the cover page itself doesn't carry.

**v0.4 revised:** cover-page-only fields are now NULLABLE so Round 3 imports can land minimally. A `registration_completeness` flag + CHECK constraint enforce completeness only when the cover page is being prepared.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `organization_id` | uuid | FK, NOT NULL | Denormalized from district |
| `round_id` | smallint | FK → `rounds.id`, NOT NULL | |
| `registration_completeness` | text | CHECK in (`'minimal'`, `'cover_page_ready'`), NOT NULL, default `'minimal'` | Round 3 imports start `'minimal'`; flip to `'cover_page_ready'` once all cover-page fields are filled. |
| `enterprise_type_id` | smallint | FK → `enterprise_types.id`, NOT NULL | |
| | | | |
| `beneficiary_short_name` | text | NOT NULL | Operational alias used in lists/dashboards, e.g., `'Octagon'`, `'Hansen Farming'`. Always required — even the minimal Round 3 records have this. |
| `applicant_organisation_name` | text | NOT NULL | Formal entity name. For Round 3 imports we copy `beneficiary_short_name` as the initial value; field staff edit to the formal version (`'Hansen Farming PTY LTD'`) when completing for cover page. |
| `project_title` | text | NULLABLE in `'minimal'`; required in `'cover_page_ready'` | e.g., `'Broiler production'` |
| `registration_number` | text | NULLABLE in `'minimal'`; required in `'cover_page_ready'`; UNIQUE per org (when not null) | e.g., `'D2024063'` |
| | | | |
| `district_id` | uuid | FK → `districts.id`, NOT NULL | |
| `community_council_id` | uuid | FK → `community_councils.id` | NULLABLE — some Round 3 rows lack CC. Required by UI for new registrations. Same-district constraint enforced via trigger when set. |
| `resource_center_id` | uuid | FK → `resource_centers.id` | NULLABLE — same logic. |
| `village_id` | uuid | FK → `villages.id` | NULLABLE always; field supervisor adds villages as encountered. |
| `location_detail` | text | | Free-text supplement when the catalogued name isn't enough |
| | | | |
| `period_start` | date | NULLABLE in `'minimal'`; required in `'cover_page_ready'` | "Period covered by the Report" start |
| `period_end` | date | NULLABLE in `'minimal'`; required in `'cover_page_ready'` | end |
| | | | |
| `total_project_cost_lsl` | numeric(14,2) | NULLABLE in `'minimal'`; required in `'cover_page_ready'` | Lesotho Loti |
| `total_grant_lsl` | numeric(14,2) | NULLABLE in `'minimal'`; required in `'cover_page_ready'` | |
| `current_grant_payment_lsl` | numeric(14,2) | NULLABLE always | Nullable until first payment regardless of completeness |
| | | | |
| `beneficiary_contact_phone` | text | | Operational, not on cover page |
| | | | |
| `principal_applicant_name` | text | NULLABLE in `'minimal'`; required in `'cover_page_ready'` | e.g., `'Mary Hansen'` |
| `principal_applicant_signature_url` | text | NULLABLE always | Signature upload is a follow-up step even when `'cover_page_ready'` |
| `principal_applicant_signed_date` | date | NULLABLE always | |
| | | | |
| `service_provider_name` | text | NULLABLE always | Plain text — Field Supervisor fills manually. |
| `service_provider_signature_url` | text | NULLABLE always | |
| `service_provider_signed_date` | date | NULLABLE always | |
| | | | |
| `cgp_received_date` | date | NULLABLE always | Office-use field |
| `cgp_officer_name` | text | NULLABLE always | |
| `cgp_officer_signature_url` | text | NULLABLE always | |
| | | | |
| `borehole_pre_existing` | boolean | NOT NULL default `false` | "Already Have a borehole" — was a borehole on site before the project? |
| `borehole_drilled` | boolean | NOT NULL default `false` | "Completely Drilled" — has a new borehole been fully drilled under this project? |
| `borehole_drilling_incomplete` | boolean | NOT NULL default `false` | "Incomplete" flag from 4D's tracking |
| | | | |
| `esmp_status` | text | CHECK in (`'not_started'`, `'pending_app_completion'`, `'completed_uploaded'`, `'completed_in_app'`), NOT NULL default `'not_started'` | |
| `esmp_uploaded_pdf_url` | text | NULLABLE | Set when `esmp_status = 'completed_uploaded'` |
| | | | |
| `created_by` | uuid | FK → `user_profiles.id` | NULL allowed for migration-inserted rows; otherwise required |
| `created_at` | timestamptz | NOT NULL default `now()` | |
| `updated_at` | timestamptz | NOT NULL default `now()` | |

UNIQUE (`organization_id`, `registration_number`) — partial unique index (`WHERE registration_number IS NOT NULL`) so multiple `'minimal'` rows with null reg numbers don't conflict.

**Completeness CHECK constraint:**

```sql
CHECK (
  registration_completeness = 'minimal'
  OR (
    registration_completeness = 'cover_page_ready'
    AND project_title IS NOT NULL
    AND registration_number IS NOT NULL
    AND period_start IS NOT NULL
    AND period_end IS NOT NULL
    AND total_project_cost_lsl IS NOT NULL
    AND total_grant_lsl IS NOT NULL
    AND principal_applicant_name IS NOT NULL
    AND community_council_id IS NOT NULL
    AND resource_center_id IS NOT NULL
  )
)
```

This guarantees the database cannot hold a `'cover_page_ready'` row that's missing a field the PDF generator needs.

**Indexes:**

- `(organization_id, round_id)` — primary dashboard query
- `(organization_id, district_id)` — "show me Berea enterprises"
- `(organization_id, resource_center_id)` — "show me this RC's enterprises"
- `(organization_id, enterprise_type_id)` — type breakdown
- `(esmp_status)` — "show me enterprises whose ESMP isn't done"
- `(borehole_drilling_incomplete) WHERE borehole_drilling_incomplete = true` — partial index for the borehole-stalled list

**Trigger `enterprises_geo_consistency`:** BEFORE INSERT/UPDATE —
1. Copy `organization_id` from `districts.organization_id` for the referenced `district_id`.
2. Verify `community_councils.district_id`, `resource_centers.district_id`, and (if set) `villages.district_id` all equal `enterprises.district_id`. Raise exception on mismatch.

This guarantees you cannot create an enterprise whose geo refs cross districts.

### 6.10 `audit_log`

**New in v0.2.** Generic per-row history for tracked tables. Filled by Postgres triggers, not application code, so no edit path bypasses it.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | bigint | PK, identity | Cheap autoincrement; no need for uuid here |
| `table_name` | text | NOT NULL | `'enterprises'`, `'user_profiles'`, etc. |
| `record_id` | uuid | NOT NULL | The id of the affected row |
| `action` | text | CHECK in (`'INSERT'`, `'UPDATE'`, `'DELETE'`) | |
| `changed_by` | uuid | FK → `user_profiles.id` | The user who made the change (read from `auth.uid()`) |
| `changed_at` | timestamptz | default `now()`, NOT NULL | |
| `old_values` | jsonb | | NULL for INSERT; full row before the change otherwise |
| `new_values` | jsonb | | NULL for DELETE; full row after the change otherwise |
| `diff` | jsonb | | Convenience: only the columns that actually changed (computed at trigger time) |
| `organization_id` | uuid | | Denormalized from the affected row for RLS scoping |

**Indexes:**
- `(table_name, record_id, changed_at DESC)` — primary query: "show me this enterprise's history"
- `(organization_id, changed_at DESC)` — "what happened in 4D today"
- `(changed_by, changed_at DESC)` — "what did this user touch"

**Triggers:** a generic `audit_trigger()` function is attached AFTER INSERT/UPDATE/DELETE on each tracked table. Phase 1 tracked tables:

- `enterprises` (all columns)
- `user_profiles` (role, organization_id, is_active changes are the most sensitive)

`districts`, `community_councils`, `resource_centers`, `villages`, and `enterprise_types` are not tracked in Phase 1 since they change rarely and Super Admin is the only writer. Audit can be added in a later phase if needed.

**Trigger implementation sketch:**

```sql
CREATE OR REPLACE FUNCTION public.audit_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  old_j jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  new_j jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  diff_j jsonb;
  org_id uuid;
BEGIN
  -- Compute diff: columns where new != old
  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(k, jsonb_build_object('from', old_j->k, 'to', new_j->k))
      INTO diff_j
      FROM jsonb_each(new_j) AS j(k, v)
      WHERE old_j->k IS DISTINCT FROM new_j->k;
  END IF;

  -- Pull organization_id off the row (most tracked tables have it)
  org_id := COALESCE(new_j->>'organization_id', old_j->>'organization_id')::uuid;

  INSERT INTO public.audit_log
    (table_name, record_id, action, changed_by, old_values, new_values, diff, organization_id)
  VALUES
    (TG_TABLE_NAME,
     COALESCE((new_j->>'id'), (old_j->>'id'))::uuid,
     TG_OP, auth.uid(), old_j, new_j, diff_j, org_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

**UI surface (Phase 1):** the enterprise detail page exposes a "History" tab listing rows from `audit_log` for that enterprise — who, when, and a human-readable diff ("Mpho Mapitse changed `current_grant_payment_lsl` from M120,000.00 to M160,000.00").

### 6.11 ER diagram

```
organizations ──┬──< districts ──┬──< community_councils
                │                 ├──< resource_centers
                │                 └──< villages
                │
                │              ┌──< enterprises (organization_id, round_id,
                │              │                  district_id, community_council_id,
                │              │                  resource_center_id, village_id,
                │              │                  enterprise_type_id)
                │              │
                └──< user_profiles ──< (created_by on enterprises)

                                       enterprise_types ──< enterprises
                                       rounds            ──< enterprises

audit_log ──< (table_name, record_id) — references everything, FK-less for flexibility
```

---

## 7. Row-Level Security (RLS)

RLS is enabled on every table. Policies use three helper functions.

### 7.1 Helper functions

```sql
-- Read the org from the JWT custom claim (set at sign-in)
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (auth.jwt() ->> 'organization_id')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.jwt() ->> 'user_role';
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.current_user_role() = 'super_admin';
$$;
```

The org and role claims are written into the JWT by an Auth Hook (`pg_hook` on `auth.users` or Supabase's "Custom Access Token Hook"). On login, the hook reads `user_profiles` and emits `organization_id` and `user_role` claims. Subsequent queries do not need to join `user_profiles`.

### 7.2 Standard policy pattern

For every org-scoped table (e.g., `enterprises`), the pattern is:

```sql
-- SELECT: super admin sees all; everyone else sees their org only
CREATE POLICY "enterprises_select"
ON public.enterprises FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR organization_id = public.current_user_org_id()
);

-- INSERT: super admin always; field_supervisor + me_officer for own org
CREATE POLICY "enterprises_insert"
ON public.enterprises FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() IN ('field_supervisor', 'me_officer')
  )
);

-- UPDATE: same as insert for non-super
CREATE POLICY "enterprises_update"
ON public.enterprises FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() IN ('field_supervisor', 'me_officer')
  )
)
WITH CHECK (
  organization_id = public.current_user_org_id() -- can't move records across orgs
);

-- DELETE: super admin only
CREATE POLICY "enterprises_delete"
ON public.enterprises FOR DELETE
TO authenticated
USING (public.is_super_admin());
```

The same pattern (with role lists adjusted per §4 matrix) applies to all other tables.

### 7.3 Special cases

- **`user_profiles`:** users can always see and update their own row (filter `id = auth.uid()`). Super Admin sees all. Org users see other profiles in their org for read-only purposes (so a TL can see "M&E Officer X is on my team").
- **`organizations` and `rounds`:** read by all authenticated users; write by Super Admin only.
- **Villages insert by Field Supervisor:** explicit policy carve-out — `field_supervisor` can `INSERT` into `villages` but not `UPDATE` or `DELETE`.
- **`audit_log`:**
  - SELECT: Super Admin sees all; org users see rows where `organization_id = current_user_org_id()`.
  - INSERT/UPDATE/DELETE: **no policy granted** — only the trigger function (`SECURITY DEFINER`) can write. Even Super Admin cannot manually delete audit rows.

```sql
CREATE POLICY "audit_log_select"
ON public.audit_log FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR organization_id = public.current_user_org_id()
);
-- Intentionally no INSERT/UPDATE/DELETE policies. Writes happen via the
-- SECURITY DEFINER trigger function, which bypasses RLS.
```

---

## 8. Authentication Model

### 8.1 Supabase Auth setup

- Provider: **email + password** (Lesotho mobile data reliability for SMS OTP is uneven; email is the safer default. Phone OTP can be added in a future phase if needed.)
- Email confirmation: enabled. New users get an invite email to set their password.
- Password reset: standard Supabase flow with a redirect to the app's reset page.
- Session JWT TTL: 1 hour (default); refresh tokens with 7-day TTL persisted in IndexedDB so PWA offline use survives a day or two.

### 8.2 Custom claims hook

A Postgres function attached to the "Custom Access Token Hook" reads `user_profiles` and injects `organization_id` and `user_role` into the JWT. This means RLS policies never need to join `user_profiles` — they read claims via `auth.jwt()`.

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims jsonb := event -> 'claims';
  profile record;
BEGIN
  SELECT organization_id, role, is_active
    INTO profile
    FROM public.user_profiles
   WHERE id = (event ->> 'user_id')::uuid;

  IF profile.is_active = false THEN
    -- block sign-in for soft-disabled users
    RAISE EXCEPTION 'User is disabled';
  END IF;

  claims := jsonb_set(claims, '{organization_id}',
                       COALESCE(to_jsonb(profile.organization_id::text), 'null'::jsonb));
  claims := jsonb_set(claims, '{user_role}', to_jsonb(profile.role));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

### 8.3 User creation flow

Super Admin creates users from the app's admin panel:

1. Super Admin fills `full_name`, `email`, `phone`, `role`, `organization_id` (auto-skipped for super_admin).
2. App calls Supabase Admin API (`auth.admin.invite_user_by_email`) to create the auth user and send invite.
3. A trigger on `auth.users` insert creates a corresponding `user_profiles` row using metadata passed at invite time.
4. User receives email, sets password, lands in app, scoped correctly via JWT claims.

The Supabase Admin API call must be wrapped in an edge function (it requires the service role key, which must never leave the server). The edge function checks that the caller is Super Admin before invoking the admin API.

---

## 9. Frontend: Routing & Role Gating

### 9.1 Route structure

```
/                       — redirect to /dashboard
/login                  — public
/reset-password         — public
/dashboard              — role-aware: each role lands on its own dashboard view

/admin/**               — Super Admin only
  /admin/organizations
  /admin/users
  /admin/districts
  /admin/community-councils
  /admin/resource-centers
  /admin/enterprise-types
  /admin/rounds

/enterprises            — all authenticated (scoped by org)
/enterprises/new        — field_supervisor, me_officer, super_admin
/enterprises/:id        — read by all; edit by FS/M&E/SA
/enterprises/:id/cover-page.pdf  — generated PDF download

/profile                — self
```

### 9.2 Guards

A single `<RoleGate roles={['field_supervisor', 'me_officer', 'super_admin']}>` wrapper renders children only when the JWT carries one of the allowed roles. Otherwise it redirects to `/dashboard` with a toast.

A `useAuth()` hook exposes `user`, `role`, `organizationId`, `signOut()`, and `isSuperAdmin`. Components conditional-render based on this (e.g., a "Delete" button only renders for super admin).

Client-side guards are **defense in depth, not authoritative** — RLS is the authority. A user who hacks past the route guard still gets nothing from the API.

---

## 10. Existing Repo: Keep / Discard / Review

The legacy repo carries useful scaffolding and a lot of cruft from past iteration. Phase 1 starts by triaging it.

### 10.1 Keep (unchanged or near-unchanged)

- `package.json` and `package-lock.json` — review and prune unused dependencies after components are reset
- `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`, `.prettierrc`, `.npmrc`, `.gitignore`
- `index.html` (review for PWA manifest links)
- `public/` — icons, manifest, robots
- PWA service-worker config — keep but verify it doesn't interfere with the new schema

### 10.2 Discard

The following are removed in the first Phase 1 commit:

**Stale documentation (~25 files):**
- `ADMIN_DASHBOARD_FIX_GUIDE.md`, `ADMIN_LOGIN_FIX.md`
- `AUTHENTICATION_FIXED.md`, `AUTHENTICATION_FIX_SUMMARY.md`
- `CHAT_PERSISTENCE_FIX_SUMMARY.md`
- `DASHBOARD_STATUS.md`, `FIXES_APPLIED.md`
- `FIX_ALL_USERS_GUIDE.md`, `FIX_DASHBOARD_QUICKSTART.md`, `FIX_MALIKA_LOGIN.md`
- `IMPLEMENTATION_COMPLETE.md`, `ISSUE_ANALYSIS.md`
- `LOGIN_GUIDE.md`, `MESSAGE_SENDING_DEBUG_GUIDE.md`
- `OFFLINE_STATUS_FIX.md`, `PWA_FEATURES.md`
- `QUICK_FIX.md`, `QUICK_FIX_GUIDE.md`, `QUICK_START.md`
- `ROUTING_FIX.md`, `SCHEMA_DOCS_IMPLEMENTATION.md`, `START_HERE.md`
- `SUPER_ADMIN_SETUP_GUIDE.md`, `TRENDS_IMPLEMENTATION_SUMMARY.md`, `UPDATE_CREDENTIALS.md`

These get replaced by a single, current `README.md` and a `docs/` folder with this Phase 1 doc and (over time) Phase 2–5 docs.

**Stale operational files:**
- `check_auth_status.sql`
- `reset-admin.html`
- `test_batch_reset.sh`
- All current `supabase/migrations/*` (replaced by fresh Phase 1 migrations)

**Likely-stale:**
- `.bolt/` — Bolt scaffolding from initial generation; remove if no longer used in the workflow
- `dev-dist/` — build artifacts (should be `.gitignore`'d anyway)
- `scripts/` — case-by-case review; most are likely no longer applicable

### 10.3 Review

- `src/` — keep the folder structure (Vite conventions) but **reset components, pages, hooks, and stores**. Any reusable primitives (e.g., button components, form inputs) can be salvaged; the auth/role logic and the enterprise/service-provider domain code is rewritten.
- `supabase/functions/` — review case-by-case; most are likely tied to the old auth model and get rewritten.
- `docs/` — read and prune. Anything not aligned with the new design goes.

### 10.4 New top-level structure (target)

```
legacy-repo/
├── README.md                       (concise, current)
├── docs/
│   ├── PHASE_1_DESIGN.md           (this doc)
│   ├── PHASE_2_ESMP.md             (TBD)
│   ├── PHASE_3_MONITORING.md       (TBD)
│   ├── PHASE_4_REPORTING.md        (TBD)
│   └── PHASE_5_DASHBOARDS.md       (TBD)
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── auth.ts
│   │   └── pdf/
│   │       └── coverPage.ts
│   ├── stores/
│   └── types/
│       └── database.ts             (generated from Supabase types)
├── supabase/
│   ├── migrations/
│   │   ├── 20260522_000_extensions.sql
│   │   ├── 20260522_010_organizations_rounds.sql
│   │   ├── 20260522_020_user_profiles.sql
│   │   ├── 20260522_030_geo_hierarchy.sql
│   │   ├── 20260522_040_enterprise_types.sql
│   │   ├── 20260522_050_enterprises.sql
│   │   ├── 20260522_060_rls_helpers.sql
│   │   ├── 20260522_070_rls_policies.sql
│   │   ├── 20260522_080_auth_hook.sql
│   │   └── 20260522_090_seed_catalog.sql
│   └── functions/
│       ├── invite-user/
│       └── generate-cover-page/    (Phase 1 PDF generation, server-side)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── ...
```

---

## 11. Phase 1 Acceptance Criteria

Phase 1 is "done" when **all** of the following are true:

- [ ] Existing Supabase project is either reset or replaced with a new project; old migrations/data are gone.
- [ ] The new schema (all tables in §6, including `audit_log`) is created via versioned migrations and `npx supabase db push` succeeds against a fresh local Supabase.
- [ ] Geographic catalogs (districts, CCs, RCs, villages, enterprise_types) are seeded for 4D from `extracted_catalog/` CSVs. RSDA's catalog is loaded once received (or seeded empty with admin UI for entry).
- [ ] **Round 3 enterprise import:** 191 enterprises from 4D's Excel are loaded as `round_id=3` records. A data-quality report (CSV or HTML) is produced listing every normalization (Maseru Urban → Maseru Urban Council, Vegetable production → Vegetable Production, nthuseng kahlolo → Nthuseng Kahlolo, etc.) so 4D can verify the import.
- [ ] Cross-district geo references are rejected by the `enterprises_geo_consistency` trigger (test: try to insert an enterprise with a Berea CC and Maseru RC — must fail).
- [ ] RLS is enabled on every table; the standard policy pattern from §7 is applied; smoke tests confirm scoping works (4D user cannot read RSDA rows).
- [ ] Auth hook is installed; a 4D Field Supervisor's JWT contains `organization_id` of the 4D org and `user_role = 'field_supervisor'`.
- [ ] All four user roles can sign in. Super Admin lands on `/admin`; others land on their role's dashboard stub.
- [ ] Super Admin can create users, districts, community councils, resource centers, and enterprise types via admin panel UI.
- [ ] Field Supervisor **and** M&E Officer can both register a new enterprise capturing every Annex V/A field (§6.9). All required fields validated.
- [ ] The cover-page PDF generator produces a one-page PDF visually matching the Annex V/A layout, populated from the enterprise record. Downloadable from `/enterprises/:id/cover-page.pdf`.
- [ ] ESMP status flag works: Field Supervisor can mark an enterprise's ESMP as `completed_uploaded` and upload the scanned PDF to Supabase Storage; the PDF link is retrievable.
- [ ] **Audit log smoke test:** edit an enterprise; the change appears in the `audit_log` table with the correct `changed_by`, action `'UPDATE'`, and a diff showing only the changed columns. The enterprise detail page "History" tab renders the entry with a human-readable diff.
- [ ] **Audit log immutability:** even Super Admin cannot `DELETE` or `UPDATE` rows in `audit_log` from the client (RLS rejects). Only the trigger writes.
- [ ] All ~25 stale fix docs are deleted from repo root; `README.md` is rewritten; `docs/PHASE_1_DESIGN.md` (this file) is committed.
- [ ] Repo passes `tsc --noEmit` and `prettier --check`. No lint errors.
- [ ] PWA still installs and runs offline (basic shell — full offline data is a Phase 3 concern).

---

## 12. Forward Look: Phases 2–5

These are previews; detailed designs come in their own phase docs.

### Phase 2 — Digital ESMP

- Tables: `esmp_screenings` (Screening Form responses, one per enterprise), `esmp_templates` (4 rows — one per category, holding the template jsonb structure), `esmps` (filled Plan/Management instances, one per enterprise once the screening triggers it), `esmp_rows` (the table rows the user ticks/fills).
- UI: a digital version of the *Environmental and Social Screening Form* (rating scales, Yes/No checklists with branching to OP 4.01 / 4.11 / 4.12 / 4.37 references). When the screening triggers an ESMP requirement, render the *Environmental Management and Monitoring Plan* form using the template attached to the enterprise's category.
- PDF export matching the existing letterhead layout for printing and signatures.
- **Blocker (revised in v0.3):** four ESMP templates must be authored, one per category — `crops`, `livestock`, `aquaculture`, `processing`. The Vegetable Production Ver. 2 22/06/2022 already in hand becomes the `crops` template. The other three categories need source templates from Ehsan (or co-authoring with him based on the existing structure).

### Phase 3 — Milestone 1 Data Collection

- Tables: `enterprise_visits`, `visit_esmp_monitoring`, `visit_business_plan`, `visit_borehole_site_clearing`, `visit_borehole_drilling`, `visit_procurement`.
- Multi-visit per enterprise; each visit records date, data collector, and a set of section responses.
- Conditional sections: borehole sections show only when `enterprise.has_borehole = true`.
- Full offline support: writes queue in IndexedDB, flush on reconnection.

### Phase 4 — Milestone 1 Report Generation

- Auto-assemble the full Milestone 1 report: cover page + ESMP status + monitoring section summaries from each visit.
- **Blocker:** the rest of the Milestone 1 report format that Ehsan mentioned sharing later.
- DOCX or PDF output. M&E Officer review/sign-off workflow before report is "final."

### Phase 5 — Dashboards, Analytics, Round 4 Readiness

- Per-org and per-round dashboards (counts of enterprises by district/RC/type, ESMP completion %, visits per month, etc.).
- Round 4 launch checklist: pre-flight script that creates Round 4 records and confirms readiness.
- TL-facing observation dashboards.

---

## 13. Dependencies & Open Items

### Hard dependencies (block specific phases)

| Item | Owner | Blocks |
|---|---|---|
| Four ESMP templates (`crops`, `livestock`, `aquaculture`, `processing`) — `crops` already in hand via Vegetable Production Ver. 2 22/06/2022; the other three need source documents or co-authoring | Ehsan | Phase 2 implementation |
| Rest of the Milestone 1 report format/letter | Ehsan | Phase 4 |
| RSDA's geographic catalog (districts, CCs, RCs, villages they operate in) + RSDA's Round 3 enterprise list (analogous to 4D's 191) | Ehsan, via RSDA | Production catalog and data seeding for RSDA users. 4D's already extracted. |
| Confirmation of which districts belong to RSDA (must be disjoint from 4D's: Berea, Maseru, Thaba-Tseka) | Ehsan | Production catalog seeding |
| Production Supabase project credentials (new project, or wipe existing) | Ehsan | Phase 1 deployment |

### Resolved in v0.3 (formerly open)

| Question | Resolution |
|---|---|
| Service Provider as lookup table or plain text? | **Plain text only.** Round 3 SPs aren't continuing into Round 4. Field Supervisor fills the field manually at registration. No `service_providers` table. |
| Round 3 migration vs fresh start? | **Migrate** the 191 Round 3 enterprises into the new app as `round_id=3` records. Ships with a data-quality report listing every normalization performed (Maseru Urban → Maseru Urban Council, etc.) so 4D can verify. |
| Beneficiary name vs Applicant Organisation — one field or two? | **Two fields.** `beneficiary_short_name` (operational alias, used in lists/dashboards) and `applicant_organisation_name` (formal legal name, printed on cover page). Often equal but stored separately. |
| 17 enterprise types — per-type or per-category ESMP templates? | **Per-category.** Four templates: `crops` (vegetable, hydroponics, seedling), `livestock` (broiler, piggery, dairy, ram, ram & buck, egg, hatchery, duck, livestock), `aquaculture` (fish), `processing` (meat, fruit drying, fruit & veg processing, milling). |

### Soft / open

- **Phone auth:** if email-based auth proves too slow for Lesotho field staff, we may add SMS OTP in a later phase. No Phase 1 work needed.
- **Backup / DR:** Supabase has built-in point-in-time recovery on paid tiers — confirm tier before Phase 1 deploy.
- **i18n:** UI is English-only in Phase 1. Sesotho localisation is a future consideration if field staff request it.

---

## Appendix A: Catalog data extracted from the 4D Excel

The Excel file `Enterprise database for 4D Climate solutions_final draft.xlsx` was processed into normalized CSVs in `extracted_catalog/`. Summary:

| File | Rows | Purpose |
|---|---|---|
| `01_districts.csv` | 3 | Berea, Maseru, Thaba-Tseka — 4D's active districts |
| `02_community_councils.csv` | 27 | Per-district CCs (normalized for dupes/casing) |
| `03_resource_centers.csv` | 17 | Per-district RCs (16 unique names; 1 appears in two districts) |
| `04_villages.csv` | 140 | Per-district villages |
| `05_enterprise_types_observed.csv` | 17 | Normalized list of every type that appears in real records |
| `06_service_providers.csv` | 18 | Full SP catalog with codes (e.g., `SPQIL A001`) |
| `07_sample_enterprises_round3.csv` | 191 | All Round 3 enterprises — for **test/staging seed**, *not* production unless decision #3 above flips |

These files are the basis for the Phase 1 seed migrations. RSDA's equivalent data still needs to be collected.

---

*End of Phase 1 Design Doc. Ehsan: please mark up directly in this file or reply with comments. Once approved, Phase 1 implementation can begin.*
