import { useState, useEffect, useRef, type FormEvent } from 'react';
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
  email: string | null;
  full_name: string;
  role: AppRole;
  organization_id: string | null;
  organization_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
  sign_in_count_total: number;
  sign_in_count_30d: number;
  failed_30d: number;
}

export function UsersAdminPage() {
  const { data: orgs } = useOrganizations();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ['user_admin_list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('user_admin_list');
      if (error) throw error;
      return (data ?? []) as unknown as UserProfile[];
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
      qc.invalidateQueries({ queryKey: ['user_admin_list'] });
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
      qc.invalidateQueries({ queryKey: ['user_admin_list'] });
      setRoleDialog(null); setOrgDialog(null); setConfirmDialog(null);
    },
    onError: (e: Error) => toast.error('Action failed', { description: e.message }),
  });

  const [roleDialog, setRoleDialog] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<AppRole | undefined>(undefined);
  const [orgDialog, setOrgDialog] = useState<UserProfile | null>(null);
  const [newOrg, setNewOrg] = useState<string | undefined>(undefined);
  const [confirmDialog, setConfirmDialog] = useState<{ user: UserProfile; action: 'delete' | 'deactivate' | 'reactivate' | 'resend_invite' | 'reset_password' } | null>(null);
  const [activityUser, setActivityUser] = useState<UserProfile | null>(null);

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
                  <th className="py-2 pr-4">Last seen</th>
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
                      <td className="py-2 pr-4"><LastSeenCell u={u} /></td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1 items-center">
                          <Button size="sm" variant="ghost" onClick={() => { setRoleDialog(u); setNewRole(u.role); }}>Role</Button>
                          {u.is_active
                            ? <Button size="sm" variant="ghost" disabled={isSelf} onClick={() => setConfirmDialog({ user: u, action: 'deactivate' })}>Deactivate</Button>
                            : <Button size="sm" variant="ghost" onClick={() => setConfirmDialog({ user: u, action: 'reactivate' })}>Reactivate</Button>}
                          <Button size="sm" variant="ghost" className="text-destructive" disabled={isSelf} onClick={() => setConfirmDialog({ user: u, action: 'delete' })}>Delete</Button>
                          <KebabMenu
                            onActivity={() => setActivityUser(u)}
                            onChangeOrg={() => { setOrgDialog(u); setNewOrg(u.organization_id ?? undefined); }}
                            onResendInvite={() => setConfirmDialog({ user: u, action: 'resend_invite' })}
                            onResetPassword={() => setConfirmDialog({ user: u, action: 'reset_password' })}
                          />
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
      <ActivitySheet user={activityUser} onClose={() => setActivityUser(null)} />
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


// ============================================================================
// Helper components — Last-seen cell, Kebab menu, Activity sheet
// ============================================================================

function fmtRelative(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const dMs = now - then;
  const dMin = Math.floor(dMs / 60000);
  if (dMin < 1) return 'just now';
  if (dMin < 60) return `${dMin} min ago`;
  const dH = Math.floor(dMin / 60);
  if (dH < 24) return `${dH} hr ago`;
  const dD = Math.floor(dH / 24);
  if (dD < 30) return `${dD} day${dD === 1 ? '' : 's'} ago`;
  const dMo = Math.floor(dD / 30);
  if (dMo < 12) return `${dMo} mo ago`;
  return new Date(iso).toLocaleDateString();
}

function recencyTone(iso: string | null): string {
  if (!iso) return 'text-muted-foreground';
  const dH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (dH < 24)        return 'text-success';
  if (dH < 24 * 7)    return 'text-warning';
  if (dH < 24 * 30)   return 'text-muted-foreground';
  return 'text-destructive';
}

function LastSeenCell({ u }: { u: UserProfile }) {
  const tone = recencyTone(u.last_sign_in_at);
  const label = u.last_sign_in_at ? fmtRelative(u.last_sign_in_at)
              : (u.sign_in_count_total === 0 ? 'never' : '—');
  return (
    <div className="text-xs">
      <div className={tone + ' font-medium'}>{label}</div>
      <div className="text-muted-foreground">
        {u.sign_in_count_30d}× in 30d
        {u.failed_30d > 0 && <span className="text-destructive"> · {u.failed_30d} failed</span>}
      </div>
    </div>
  );
}

function KebabMenu({
  onActivity, onChangeOrg, onResendInvite, onResetPassword,
}: {
  onActivity: () => void;
  onChangeOrg: () => void;
  onResendInvite: () => void;
  onResetPassword: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}
              aria-label="More actions">⋯</Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[180px] rounded-md border bg-popover shadow-md z-20 py-1 text-sm">
          <MenuItem onClick={() => { setOpen(false); onActivity(); }}>View activity</MenuItem>
          <MenuItem onClick={() => { setOpen(false); onChangeOrg(); }}>Change organization</MenuItem>
          <MenuItem onClick={() => { setOpen(false); onResendInvite(); }}>Resend invite</MenuItem>
          <MenuItem onClick={() => { setOpen(false); onResetPassword(); }}>Reset password</MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="block w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
      onClick={onClick}
    >{children}</button>
  );
}

interface LoginEvent {
  kind: 'login' | 'failed';
  email: string;
  ip: string | null;
  occurred_at: string;
}

function ActivitySheet({ user, onClose }: { user: UserProfile | null; onClose: () => void }) {
  const open = !!user;
  const history = useQuery({
    queryKey: ['user_login_history', user?.id],
    enabled: open,
    queryFn: async (): Promise<LoginEvent[]> => {
      const { data, error } = await supabase.rpc('user_login_history', { p_user_id: user!.id });
      if (error) throw error;
      return (data ?? []) as unknown as LoginEvent[];
    },
  });

  if (!open) return null;
  const u = user!;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-full max-w-md bg-background border-l z-50 shadow-xl flex flex-col">
        <div className="p-5 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">User activity</div>
              <h2 className="text-lg font-semibold">{u.full_name}</h2>
              <p className="text-xs text-muted-foreground">{u.email ?? '—'}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Stat label="Last seen"        value={fmtRelative(u.last_sign_in_at)} tone={recencyTone(u.last_sign_in_at)} />
            <Stat label="Account created"  value={u.created_at ? fmtRelative(u.created_at) : '—'} />
            <Stat label="Sign-ins (total)" value={String(u.sign_in_count_total)} />
            <Stat label="Sign-ins (30 days)" value={String(u.sign_in_count_30d)} />
            {u.failed_30d > 0 && (
              <Stat label="Failed (30 days)" value={String(u.failed_30d)} tone="text-destructive" />
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Recent events (last 50)
          </h3>
          {history.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {history.error && (
            <p className="text-sm text-destructive">{(history.error as Error).message}</p>
          )}
          {history.data && history.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No events recorded yet.</p>
          )}
          {history.data && history.data.length > 0 && (
            <ol className="space-y-2 text-sm">
              {history.data.map((e, i) => (
                <li key={i} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
                  <div>
                    <div className={'font-medium ' + (e.kind === 'failed' ? 'text-destructive' : 'text-success')}>
                      {e.kind === 'failed' ? 'Failed sign-in' : 'Signed in'}
                    </div>
                    {e.ip && <div className="text-[11px] text-muted-foreground">IP {e.ip}</div>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{new Date(e.occurred_at).toLocaleString()}</div>
                    <div>{fmtRelative(e.occurred_at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={'mt-0.5 text-sm font-semibold ' + (tone ?? '')}>{value}</div>
    </div>
  );
}
