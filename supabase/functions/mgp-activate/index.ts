// supabase/functions/mgp-activate/index.ts
//
// MGP M1 Approval Tracker (tracker.4dcs.co.za) — first-time activation and
// password reset. Deployed with verify_jwt = false: the caller is not signed in
// yet; the one-time PIN issued by a tracker admin is the credential.
//
// POST { phone, pin, password }
//   1. public.mgp_check_pin(phone, pin) — bcrypt check, 5-attempt lockout, 14-day expiry
//   2. create (or update the password of) the auth user <266XXXXXXXX>@tracker.4dcs.co.za
//      — NO `role` in user_metadata, so handle_new_auth_user does not create a
//      monitoring-app profile. Tracker users get no access to the monitoring app.
//   3. public.mgp_complete_activation — links auth user, burns the PIN
// The client then signs in with signInWithPassword(email, password).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const friendly = (m: string) =>
  /weak|guess|pwned|leaked/i.test(m)
    ? 'That password is too common (found in leaked-password lists). Choose a different one — e.g. mix words, numbers and symbols.'
    : m;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function normalizePhone(p: string): string {
  const d = (p || '').replace(/\D/g, '');
  return d.length === 8 ? `266${d}` : d;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }

  const phone = normalizePhone(String(body?.phone ?? ''));
  const pin = String(body?.pin ?? '').trim();
  const password = String(body?.password ?? '');

  if (!/^266\d{8}$/.test(phone)) return json({ error: 'Enter your 8-digit Lesotho phone number.' }, 400);
  if (!/^\d{6}$/.test(pin)) return json({ error: 'The PIN is 6 digits.' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error: checkErr } = await admin.rpc('mgp_check_pin', { p_phone: phone, p_pin: pin });
  if (checkErr) return json({ error: 'Could not verify PIN. Try again.' }, 500);
  const r = rows?.[0];
  if (!r?.ok) return json({ error: r?.reason ?? 'Invalid PIN.' }, 400);

  const email = `${phone}@tracker.4dcs.co.za`;
  let authUserId: string | null = r.auth_user_id;

  if (authUserId) {
    const { error } = await admin.auth.admin.updateUserById(authUserId, { password, email_confirm: true } as any);
    if (error) return json({ error: friendly(error.message) }, 400);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: r.full_name, phone, app: 'mgp_tracker' },
    });
    if (error) {
      if (/weak|guess|pwned|leaked|password/i.test(error.message)) return json({ error: friendly(error.message) }, 400);
      // Auth user may already exist from an interrupted activation — find and reuse it.
      let found: any = null;
      for (let page = 1; page <= 20 && !found; page++) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (!list?.users?.length) break;
        found = list.users.find((u: any) => u.email === email);
      }
      if (!found) return json({ error: `Could not create account: ${error.message}` }, 500);
      authUserId = found.id;
      const { error: upErr } = await admin.auth.admin.updateUserById(found.id, { password });
      if (upErr) return json({ error: friendly(upErr.message) }, 400);
    } else {
      authUserId = data.user.id;
    }
  }

  const { error: doneErr } = await admin.rpc('mgp_complete_activation', {
    p_user_id: r.user_id, p_auth_user_id: authUserId,
  });
  if (doneErr) return json({ error: 'Could not finish activation. Try again.' }, 500);

  return json({ ok: true, email, full_name: r.full_name });
});
