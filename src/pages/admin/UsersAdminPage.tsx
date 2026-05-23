import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/lib/catalogs';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppRole } from '@/lib/auth';

const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  team_leader: 'Team Leader',
  me_officer: 'M&E Officer',
  field_supervisor: 'Field Supervisor',
};

/**
 * Super-admin-only user management. Inviting goes through the `invite-user`
 * edge function (supabase/functions/invite-user) so we can write to
 * auth.users with service_role privileges and stamp user_metadata, which the
 * `handle_new_auth_user` trigger uses to create the user_profiles row.
 *
 * The form below calls supabase.functions.invoke('invite-user', { body }).
 */
export function UsersAdminPage() {
  const { data: orgs } = useOrganizations();
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ['user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AppRole | undefined>(undefined);
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !fullName.trim() || !role) {
        throw new Error('Email, full name, and role are required.');
      }
      if (role !== 'super_admin' && !organizationId) {
        throw new Error('Pick an organization for non-Super-Admin roles.');
      }
      const { data, error: err } = await supabase.functions.invoke('invite-user', {
        body: {
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role,
          organization_id: role === 'super_admin' ? null : organizationId,
        },
      });
      if (err) throw err;
      return data as { user_id: string };
    },
    onSuccess: () => {
      setSuccess(`Invitation sent to ${email}. They'll receive a sign-up link by email.`);
      setEmail('');
      setFullName('');
      setPhone('');
      setRole(undefined);
      setOrganizationId(undefined);
      qc.invalidateQueries({ queryKey: ['user_profiles'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    invite.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Invite users by email. They&apos;ll receive a sign-up link from Supabase Auth and
          land with the role + org you assign here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite user</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role…" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {role !== 'super_admin' && (
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="org">Organization</Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger id="org">
                    <SelectValue placeholder="Select organization…" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.code} — {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? 'Sending invite…' : 'Send invite'}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-700">{success}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {users.error && (
            <p className="text-sm text-destructive">{(users.error as Error).message}</p>
          )}
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Organization</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-2 pr-4 font-medium">{u.full_name}</td>
                  <td className="py-2 pr-4">{ROLE_LABEL[u.role as AppRole] ?? u.role}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {orgs?.find((o) => o.id === u.organization_id)?.code ?? '—'}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{u.phone ?? '—'}</td>
                  <td className="py-2">
                    <Badge variant={u.is_active ? 'default' : 'destructive'}>
                      {u.is_active ? 'active' : 'disabled'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
