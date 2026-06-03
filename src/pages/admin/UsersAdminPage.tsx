import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizations } from '@/lib/catalogs';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
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

interface UserProfile {
  id: string;
  full_name: string;
  role: AppRole;
  organization_id: string | null;
  phone: string | null;
  is_active: boolean;
}

export function UsersAdminPage() {
  const { data: orgs } = useOrganizations();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ['user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as UserProfile[];
    },
  });

  // ----- Invite form -----
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
      // -v2 slug per the stuck-slug pattern; v1 (original) doesn't accept the
      // redirect_to parameter and would silently fall back to Site URL.
      const { data, error: err } = await supabase.functions.invoke('invite-user-v2', {
        body: {
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role,
          organization_id: role === 'super_admin' ? null : organizationId,
          // Force the invite link to land on /set-password, not the
          // Supabase default Site URL, so invitees go directly to the
          // welcome+password-setup screen.
          redirect_to: `${window.location.origin}/set-password`,
        },
      });
      if (err) throw err;
      return data as { user_id: string };
    },
    onSuccess: () => {
      setSuccess(`Invitation sent to ${email}. They'll receive a sign-up link by email.`);
      setEmail(''); setFullName(''); setPhone('');
      setRole(undefined); setOrganizationId(undefined);
      qc.invalidateQueries({ queryKey: ['user_profiles'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null);
    invite.mutate();
  }

  // ----- Manage actions -----
  const manage = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error: err } = await supabase.functions.invoke('manage-user-v1', { body: payload });
      if (err) throw err;
      return data;
    },
    onSuccess: (_, vars) => {
      const action = (vars as { action: string }).action;
      toast.success(actionToast(action));
      qc.invalidateQueries({ queryKey: ['user_profiles'] });
      setRoleDialog(null); setOrgDialog(null); setConfirmDialog(null);
    },
    onError: (e: Error) => toast.error('Action failed', { description: e.message }),
  });

  const [roleDialog, setRoleDialog] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<AppRole | undefined>(undefined);
  const [orgDialog, setOrgDialog] = useState<UserProfile | null>(null);
  const [newOrg, setNewOrg] = useState<string | undefined>(undefined);
  const [confirmDialog, setConfirmDialog] = useState<{ user: UserProfile; action: 'delete' | 'deactivate' | 'reactivate' | 'resend_invite' | 'reset_password' } | null>(null);

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
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger id="role"><SelectValue placeholder="Select role…" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="org">Organization</Label>
              <Select value={organizationId} onValueChange={setOrganizationId} disabled={role === 'super_admin'}>
                <SelectTrigger id="org"><SelectValue placeholder="Select organization…" /></SelectTrigger>
                <SelectContent>
                  {orgs?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.code} — {o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? 'Sending…' : 'Send invite'}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-success">{success}</p>}
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
          {users.error && <p className="text-sm text-destructive">{(users.error as Error).message}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Organization</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.data?.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="py-2 pr-4 font-medium">{u.full_name}{isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</td>
                      <td className="py-2 pr-4">{ROLE_LABEL[u.role] ?? u.role}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{orgs?.find((o) => o.id === u.organization_id)?.code ?? '—'}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{u.phone ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={u.is_active ? 'default' : 'destructive'}>{u.is_active ? 'active' : 'disabled'}</Badge>
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => { setRoleDialog(u); setNewRole(u.role); }}>Role</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setOrgDialog(u); setNewOrg(u.organization_id ?? undefined); }}>Org</Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDialog({ user: u, action: 'resend_invite' })}>Resend invite</Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDialog({ user: u, action: 'reset_password' })}>Reset pwd</Button>
                          {u.is_active
                            ? <Button size="sm" variant="ghost" disabled={isSelf} onClick={() => setConfirmDialog({ user: u, action: 'deactivate' })}>Deactivate</Button>
                            : <Button size="sm" variant="ghost" onClick={() => setConfirmDialog({ user: u, action: 'reactivate' })}>Reactivate</Button>}
                          <Button size="sm" variant="ghost" className="text-destructive" disabled={isSelf} onClick={() => setConfirmDialog({ user: u, action: 'delete' })}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Change role modal */}
      {roleDialog && (
        <ModalCard title={`Change role — ${roleDialog.full_name}`} onClose={() => setRoleDialog(null)}>
          <div className="space-y-3">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger><SelectValue placeholder="Pick role" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">The user&apos;s next login (or token refresh) will pick up the new role.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRoleDialog(null)}>Cancel</Button>
              <Button disabled={!newRole || newRole === roleDialog.role || manage.isPending} onClick={() => manage.mutate({ action: 'change_role', user_id: roleDialog.id, role: newRole, organization_id: roleDialog.organization_id })}>
                {manage.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </ModalCard>
      )}

      {/* Change org modal */}
      {orgDialog && (
        <ModalCard title={`Change organization — ${orgDialog.full_name}`} onClose={() => setOrgDialog(null)}>
          <div className="space-y-3">
            <Select value={newOrg} onValueChange={setNewOrg}>
              <SelectTrigger><SelectValue placeholder="Pick organization" /></SelectTrigger>
              <SelectContent>
                {orgs?.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.code} — {o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOrgDialog(null)}>Cancel</Button>
              <Button disabled={!newOrg || newOrg === orgDialog.organization_id || manage.isPending} onClick={() => manage.mutate({ action: 'change_org', user_id: orgDialog.id, organization_id: newOrg })}>
                {manage.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </ModalCard>
      )}

      {/* Confirm modal */}
      {confirmDialog && (
        <ModalCard title={confirmTitle(confirmDialog.action, confirmDialog.user.full_name)} onClose={() => setConfirmDialog(null)}>
          <div className="space-y-3">
            <p className="text-sm">{confirmCopy(confirmDialog.action, confirmDialog.user.full_name)}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDialog(null)}>Cancel</Button>
              <Button
                variant={confirmDialog.action === 'delete' || confirmDialog.action === 'deactivate' ? 'destructive' : 'default'}
                disabled={manage.isPending}
                onClick={() => manage.mutate({ action: confirmDialog.action, user_id: confirmDialog.user.id })}
              >
                {manage.isPending ? 'Working…' : confirmLabel(confirmDialog.action)}
              </Button>
            </div>
          </div>
        </ModalCard>
      )}
    </div>
  );
}

function actionToast(action: string): string {
  switch (action) {
    case 'delete': return 'User deleted';
    case 'change_role': return 'Role updated';
    case 'change_org': return 'Organization updated';
    case 'deactivate': return 'User deactivated';
    case 'reactivate': return 'User reactivated';
    case 'resend_invite': return 'Invitation re-sent';
    case 'reset_password': return 'Password-reset email sent';
    default: return 'Done';
  }
}
function confirmTitle(action: string, name: string): string {
  switch (action) {
    case 'delete': return `Delete ${name}?`;
    case 'deactivate': return `Deactivate ${name}?`;
    case 'reactivate': return `Reactivate ${name}?`;
    case 'resend_invite': return `Resend invite to ${name}?`;
    case 'reset_password': return `Send password reset to ${name}?`;
    default: return name;
  }
}
function confirmCopy(action: string, name: string): string {
  switch (action) {
    case 'delete': return `Permanently delete ${name}. Their submissions stay (filled_by becomes orphan). This cannot be undone.`;
    case 'deactivate': return `${name} will no longer be able to log in. You can reactivate them later.`;
    case 'reactivate': return `${name} will be able to log in again.`;
    case 'resend_invite': return `Send a fresh invite email to ${name}. Use this if the original was lost.`;
    case 'reset_password': return `${name} will receive an email with a password-reset link.`;
    default: return '';
  }
}
function confirmLabel(action: string): string {
  switch (action) {
    case 'delete': return 'Delete user';
    case 'deactivate': return 'Deactivate';
    case 'reactivate': return 'Reactivate';
    case 'resend_invite': return 'Resend invite';
    case 'reset_password': return 'Send reset email';
    default: return 'Confirm';
  }
}

function ModalCard({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
