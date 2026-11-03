import { useState, type FormEvent } from 'react';
import { KeyRound, MessageCircle, Copy } from 'lucide-react';
import { useData, fmtDate, errMsg, type MgpUser } from '../lib/data';
import { supabase, formatPhone, normalizePhone, maskPhone } from '../lib/supabase';
import { Button, Modal, inputCls, toast } from './ui';

const ROLES: { key: MgpUser['role']; label: string; hint: string }[] = [
  { key: 'member', label: 'Member', hint: 'Can move enterprises and manage action plans' },
  { key: 'viewer', label: 'Viewer', hint: 'Read-only' },
  { key: 'admin', label: 'Admin', hint: 'Member + manage users and baseline' },
  { key: 'super_admin', label: 'Super admin', hint: 'Everything' },
];

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://tracker.4dcs.co.za';

export function UsersView() {
  const { users, me, reload } = useData();
  const [pinFor, setPinFor] = useState<{ user: MgpUser; pin: string } | null>(null);
  const [edit, setEdit] = useState<MgpUser | null>(null);

  async function issuePin(u: MgpUser) {
    const { data, error } = await supabase.rpc('mgp_admin_issue_pin', { p_user_id: u.id });
    if (error) return toast.err(errMsg(error));
    setPinFor({ user: u, pin: data as string });
    reload();
  }

  const status = (u: MgpUser) => {
    if (!u.is_active) return <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Deactivated</span>;
    if (u.pin_expires_at && new Date(u.pin_expires_at) > new Date())
      return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">PIN issued · expires {fmtDate(u.pin_expires_at)}</span>;
    if (u.activated_at) return <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Active</span>;
    return <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Needs PIN</span>;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Users</h2>
        <p className="text-sm text-slate-500">Add a person with their name and phone number, then send them the PIN. They open the tracker, choose “First time / Reset”, enter phone + PIN and create a password.</p>
      </div>

      <AddUser
        isSuper={me?.role === 'super_admin'}
        onAdded={async (u) => {
          await reload();
          issuePin(u);
        }}
      />

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Phone</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => {
              const locked = u.role === 'super_admin' && me?.role !== 'super_admin';
              return (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 font-medium">
                    {u.full_name} {u.id === me?.id && <span className="text-xs font-normal text-slate-400">(you)</span>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{formatPhone(u.phone)}</td>
                  <td className="px-4 py-2.5">{ROLES.find((r) => r.key === u.role)?.label}</td>
                  <td className="px-4 py-2.5">{status(u)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {!locked && (
                      <div className="flex justify-end gap-1.5">
                        {u.is_active && (
                          <Button size="sm" variant="secondary" onClick={() => issuePin(u)} title="Issue a new PIN (first login or forgotten password)">
                            <KeyRound size={13} /> {u.activated_at ? 'Reset PIN' : 'New PIN'}
                          </Button>
                        )}
                        {u.id !== me?.id && (
                          <Button size="sm" variant="ghost" onClick={() => setEdit(u)}>
                            Edit
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PinModal data={pinFor} onClose={() => setPinFor(null)} />
      <EditUser user={edit} isSuper={me?.role === 'super_admin'} onClose={() => setEdit(null)} onSaved={reload} />
    </div>
  );
}

function AddUser({ isSuper, onAdded }: { isSuper: boolean; onAdded: (u: MgpUser) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<MgpUser['role']>('member');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^266\d{8}$/.test(normalizePhone(phone))) return toast.err('Enter the phone number as xxxx xxxx (8 digits)');
    setBusy(true);
    const { data, error } = await supabase.rpc('mgp_admin_add_user', { p_full_name: name, p_phone: phone, p_role: role });
    setBusy(false);
    if (error) return toast.err(error.message.includes('duplicate') ? 'That phone number is already registered' : errMsg(error));
    toast.ok(`${name} added`);
    onAdded({ id: data as string, full_name: name, phone: normalizePhone(phone), role } as MgpUser);
    setName('');
    setPhone('');
    setRole('member');
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-white p-4">
      <div className="mb-3 text-sm font-semibold">Add a user</div>
      <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px_auto]">
        <input className={inputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={inputCls} placeholder="Phone (xxxx xxxx)" inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} required />
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as MgpUser['role'])}>
          {ROLES.filter((r) => isSuper || r.key !== 'super_admin').map((r) => (
            <option key={r.key} value={r.key}>
              {r.label} — {r.hint}
            </option>
          ))}
        </select>
        <Button disabled={busy}>{busy ? 'Adding…' : 'Add & get PIN'}</Button>
      </div>
    </form>
  );
}

function PinModal({ data, onClose }: { data: { user: MgpUser; pin: string } | null; onClose: () => void }) {
  if (!data) return null;
  const msg = `Hello ${data.user.full_name.split(' ')[0]}, you have access to the SADP II MGP M1 Tracker.\n\n1. Open ${APP_URL}\n2. Tap "First time / Reset"\n3. Phone: ${formatPhone(data.user.phone)}\n4. PIN: ${data.pin}\n5. Create your password.\n\nThe PIN expires in 14 days.`;
  return (
    <Modal open onClose={onClose} title={`PIN for ${data.user.full_name}`}>
      <div className="mb-4 rounded-lg bg-brand-light py-4 text-center">
        <div className="text-xs uppercase tracking-wide text-brand">One-time PIN</div>
        <div className="font-mono text-4xl font-bold tracking-[0.3em] text-brand">{data.pin}</div>
      </div>
      <p className="mb-3 text-sm text-slate-600">Send this to {formatPhone(data.user.phone)}. It is shown only now; you can always issue a new one.</p>
      <div className="flex flex-wrap gap-2">
        <a className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-3.5 py-2 text-sm font-medium text-white hover:opacity-90" href={`https://wa.me/${data.user.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
          <MessageCircle size={15} /> Send on WhatsApp
        </a>
        <Button
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(msg);
            toast.ok('Message copied');
          }}
        >
          <Copy size={15} /> Copy message
        </Button>
        <Button variant="ghost" onClick={onClose} className="ml-auto">
          Done
        </Button>
      </div>
    </Modal>
  );
}

function EditUser({ user, isSuper, onClose, onSaved }: { user: MgpUser | null; isSuper: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<MgpUser['role']>('member');
  const [active, setActive] = useState(true);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (user && loadedFor !== user.id) {
    setLoadedFor(user.id);
    setName(user.full_name);
    setRole(user.role);
    setActive(user.is_active);
  }
  if (!user) return null;

  async function save() {
    const { error } = await supabase.rpc('mgp_admin_update_user', { p_user_id: user!.id, p_full_name: name, p_role: role, p_is_active: active });
    if (error) return toast.err(errMsg(error));
    toast.ok('User updated');
    onSaved();
    onClose();
    setLoadedFor(null);
  }

  return (
    <Modal open onClose={() => { onClose(); setLoadedFor(null); }} title="Edit user">
      <div className="space-y-3">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as MgpUser['role'])}>
          {ROLES.filter((r) => isSuper || r.key !== 'super_admin').map((r) => (
            <option key={r.key} value={r.key}>
              {r.label} — {r.hint}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#006838]" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active (untick to block sign-in)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => { onClose(); setLoadedFor(null); }}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
