// supabase/functions/invite-user/index.ts
//
// Edge function: Super Admin invites a new user by email.
// Called from src/pages/admin/UsersAdminPage.tsx via supabase.functions.invoke('invite-user').
//
// Flow:
//   1. Verify the caller's JWT and confirm `user_role` claim is 'super_admin'.
//   2. Validate the request body shape.
//   3. Call supabase.auth.admin.inviteUserByEmail with user_metadata containing
//      { role, organization_id, full_name, phone } — the `handle_new_auth_user`
//      trigger picks these up and writes the public.user_profiles row.
//
// Env vars (set automatically by Supabase Edge Runtime):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//
// Run locally:
//   supabase functions serve invite-user --no-verify-jwt   # for testing only
//
// Deploy:
//   supabase functions deploy invite-user

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

interface InviteBody {
  email?: string;
  full_name?: string;
  phone?: string | null;
  role?: 'super_admin' | 'team_leader' | 'me_officer' | 'field_supervisor';
  organization_id?: string | null;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  if (!payload) return {};
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(b64);
  try {
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing bearer token' }, 401);

  const claims = decodeJwtPayload(token);
  if (claims.user_role !== 'super_admin') {
    return json({ error: 'Forbidden — Super Admin only' }, 403);
  }

  let body: InviteBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { email, full_name, phone = null, role, organization_id = null } = body;
  if (!email || !full_name || !role) {
    return json({ error: 'email, full_name, and role are required' }, 400);
  }
  const allowedRoles = ['super_admin', 'team_leader', 'me_officer', 'field_supervisor'];
  if (!allowedRoles.includes(role)) {
    return json({ error: `role must be one of ${allowedRoles.join(', ')}` }, 400);
  }
  if (role !== 'super_admin' && !organization_id) {
    return json({ error: 'organization_id is required for non-Super-Admin roles' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Edge function not configured' }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey);

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      organization_id: role === 'super_admin' ? null : organization_id,
      full_name,
      phone,
    },
  });

  if (error) {
    return json({ error: error.message }, 400);
  }
  return json({ user_id: data.user?.id ?? null });
});
