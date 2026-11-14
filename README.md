# MGP M1 Approval Tracker — tracker.4dcs.co.za

A web tool for the SADP II Matching Grants (MGP) team to track each enterprise's
M1 report through the **approval workflow** and its **M1 → M2 → Graduation
lifecycle**. Central Region (Maseru, Berea, Thaba-Tseka), 4D Climate Solutions.

The app is a React + Vite SPA at the repo root. It uses the SADP-II Supabase
project (see `supabase/`) and is otherwise self-contained.

## Screens

- **Summary** — whiteboard table by district, change since baseline, milestone &
  contributions/funds rollups, print.
- **Board** — drag cards between approval stages.
- **Enterprises** — filterable list (approval stage + milestone), CSV export.
- **Actions** — SADP queries + action items by person / due date.
- **Activity** — who moved which enterprise, when.
- **Bulk add** — place enterprises from the 4D enterprise list (admins can add missing ones).
- **Users** — admins add people (name, phone), issue PINs.

## Two axes per enterprise

**1. Approval workflow** (`mgp_tracking.stage`) — where the M1 report sits:

| Ref | Stage | Key |
|---|---|---|
| 1 | Approved | `approved` |
| 2 | At SADP – pending approval | `at_sadp` |
| 3(a)(i) | Resolving SADP queries | `sadp_queries` |
| 3(a)(ii) | Under 4D review | `under_review` |
| 3(b) | With ISPs | `with_isp` |
| 3(c) | Borehole / shadenet | `blocked_infra` |

**2. Lifecycle milestone** (`mgp_tracking.lifecycle_stage`) — `m1` → `m2` →
`graduated`, with per-milestone money in `stage_finances` (farmer & SADP
contribution, budget allocation, fund depletion, report). Approving the M2
report auto-graduates the enterprise.

## Login

Phone number + password. An admin adds a user (name, phone, role) and gets a
one-time 6-digit PIN (valid 14 days, 5 attempts) to send by WhatsApp. The user
picks **First time / Reset**, enters phone + PIN and creates a password.
Forgotten password → admin issues a new PIN.

Each user is a Supabase auth user `266XXXXXXXX@tracker.4dcs.co.za` created by the
`mgp-activate` edge function (verify_jwt off; the PIN is the credential). No
`role` metadata is set, so no `user_profiles` row is created.

Roles: `super_admin`, `admin` (users + baseline), `member` (edit), `viewer` (read-only).

## Database (`supabase/migrations/`)

Tracker tables are prefixed `mgp_`: `mgp_users`, `mgp_tracking` (approval stage +
lifecycle + finances), `mgp_stage_history` (trigger-written), `mgp_actions`,
`mgp_settings` (`baseline_at`), `mgp_excluded`. Enterprise names come from
`mgp_enterprise_catalog()` (SECURITY DEFINER, 4D enterprises only). RLS everywhere
via `mgp_is_member()` / `mgp_can_edit()` / `mgp_is_admin()`. Key migrations:
`400_mgp_tracker.sql`, `410_mgp_lifecycle.sql`.

## Deploy (Cloudflare Pages)

- Root directory: **repo root — leave empty**
- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`
- Env vars: none required (the publishable Supabase URL/key are defaults in
  `src/lib/supabase.ts`; `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` override them)
- Custom domain: `tracker.4dcs.co.za` (Pages → Custom domains).

## Local dev

```bash
npm install && npm run dev
```
