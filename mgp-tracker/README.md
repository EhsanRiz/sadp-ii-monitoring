# MGP M1 Approval Tracker — tracker.4dcs.co.za

A small, separate web tool for the two-week push on SADP II MGP M1 reports (Central Region). It lives in this repo only to share the SADP-II Supabase project; it is **not** part of the monitoring app and its users have **no** access to the monitoring app.

## What it does

Each enterprise sits in exactly one stage (mirrors the office whiteboard):

| Ref | Stage | Key |
|---|---|---|
| 1 | Approved | `approved` |
| 2 | At SADP – pending approval | `at_sadp` |
| 3(a)(i) | Resolving SADP queries (sent back by SADP) | `sadp_queries` |
| 3(a)(ii) | Under 4D review (submitted by ISP/farmer) | `under_review` |
| 3(b) | With ISPs | `with_isp` |
| 3(c) | Borehole / shadenet | `blocked_infra` |
| 3(d) | Withdrawal | `withdrawn` |

Screens: **Summary** (whiteboard table by district, change since baseline, print), **Board** (drag cards between stages), **Enterprises** (filterable list, CSV export), **Action plan** (all SADP queries + actions by due date), **Add to tracker** (bulk place enterprises from the 4D enterprise list; admins can add missing ones), **Users** (admins).

## Login

Phone number + password. An admin adds a user (name, phone, role) and gets a one-time 6-digit PIN (valid 14 days, 5 attempts) to send by WhatsApp. The user picks **First time / Reset**, enters phone + PIN and creates a password. Forgotten password → admin issues a new PIN.

Under the hood each user is a Supabase auth user `266XXXXXXXX@tracker.4dcs.co.za` created by the `mgp-activate` edge function (verify_jwt off; the PIN is the credential). No `role` metadata is set, so `handle_new_auth_user` creates no `user_profiles` row.

Roles: `super_admin`, `admin` (users + baseline), `member` (edit), `viewer` (read-only).

## Database (migration `400_mgp_tracker.sql`)

`mgp_users`, `mgp_tracking`, `mgp_stage_history` (trigger-written), `mgp_actions`, `mgp_settings` (`baseline_at`). Enterprise names come from `mgp_enterprise_catalog()` (SECURITY DEFINER, 4D enterprises only). RLS everywhere via `mgp_is_member()` / `mgp_can_edit()` / `mgp_is_admin()`.

## Deploy (Render static site)

- Root directory: `mgp-tracker`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Env vars: none required (the publishable Supabase URL/key are defaults in `src/lib/supabase.ts`; `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` override them)
- Custom domain: `tracker.4dcs.co.za` → add the CNAME Render shows in Cloudflare DNS (DNS only / grey cloud).

## Local dev

```bash
cd mgp-tracker && npm install && npm run dev
```
