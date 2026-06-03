# SADP-II Monitoring — Email Templates

Branded HTML templates for Supabase Auth emails. Designed to render in
Gmail / Outlook / Apple Mail / mobile clients, with the 4D Climate
Solutions palette (primary dark green `#006838`, accent lime `#8DC63F`).

## How to install

1. Go to https://supabase.com/dashboard/project/urvecgqgxjwlznltjeap/auth/templates
2. For each template type, click the tab (Confirm signup / Invite user /
   Magic Link / Reset Password / Email Change), paste the matching
   `*.html` file's contents in this folder, and **also paste the matching
   subject line** at the top of the page.
3. Click **Save changes**.

Templates use Supabase's Go-template variables:
- `{{ .ConfirmationURL }}` — the magic link to click
- `{{ .Data.full_name }}` — populated by our `invite-user` edge function
- `{{ .Email }}` — the recipient's email address
- `{{ .SiteURL }}` — the configured site URL (set in Auth settings)

## Files

| File | Supabase template tab | Subject line |
|---|---|---|
| `invite.html` | **Invite user** | You've been invited to SADP-II Monitoring |
| `password-reset.html` | **Reset Password** | Reset your SADP-II Monitoring password |
| `confirm-signup.html` | **Confirm signup** | Confirm your SADP-II Monitoring account |
| `email-change.html` | **Email Change** | Confirm your new email address |
| `magic-link.html` | **Magic Link** | Your SADP-II Monitoring sign-in link |
