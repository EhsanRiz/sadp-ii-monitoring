import { useState, type FormEvent } from 'react';
import { supabase, phoneToEmail, maskPhone } from '../lib/supabase';
import { Button, inputCls } from './ui';
import { Logo } from './Logo';

export function Login() {
  const [mode, setMode] = useState<'signin' | 'activate'>('signin');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password });
    if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong phone number or password. First time here? Use “First time / Reset”.' : error.message);
    setBusy(false);
  }

  async function activate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) return setError('The two passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('mgp-activate', { body: { phone, pin, password } });
    if (error) {
      let msg = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx) msg = (await ctx.json()).error ?? msg;
      } catch {
        /* keep default */
      }
      setError(msg);
      setBusy(false);
      return;
    }
    setWelcome(data?.full_name ?? null);
    const { error: siErr } = await supabase.auth.signInWithPassword({ email: data.email, password });
    if (siErr) setError(siErr.message);
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-light via-white to-lime/10 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={48} />
          <h1 className="mt-3 text-xl font-bold text-slate-900">MGP M1 Approval Tracker</h1>
          <p className="text-sm text-slate-500">SADP II · Central Region · 4D Climate Solutions</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
            <button className={`rounded-md py-1.5 ${mode === 'signin' ? 'bg-white shadow-sm' : 'text-slate-500'}`} onClick={() => { setMode('signin'); setError(null); }}>
              Sign in
            </button>
            <button className={`rounded-md py-1.5 ${mode === 'activate' ? 'bg-white shadow-sm' : 'text-slate-500'}`} onClick={() => { setMode('activate'); setError(null); }}>
              First time / Reset
            </button>
          </div>

          {welcome && <p className="mb-3 rounded-md bg-brand-light px-3 py-2 text-sm text-brand">Welcome, {welcome}! Signing you in…</p>}

          {mode === 'signin' ? (
            <form onSubmit={signIn} className="space-y-3">
              <Field label="Phone number">
                <input className={inputCls} inputMode="tel" autoComplete="username" placeholder="xxxx xxxx" maxLength={9} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} required />
              </Field>
              <Field label="Password">
                <input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
            </form>
          ) : (
            <form onSubmit={activate} className="space-y-3">
              <p className="text-xs text-slate-500">Enter the 6-digit PIN your admin gave you, then create your password. Use this also if you forgot your password (ask the admin for a new PIN).</p>
              <Field label="Phone number">
                <input className={inputCls} inputMode="tel" autoComplete="username" placeholder="xxxx xxxx" maxLength={9} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} required />
              </Field>
              <Field label="PIN">
                <input className={`${inputCls} tracking-[0.4em]`} inputMode="numeric" maxLength={6} placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required />
              </Field>
              <Field label="Create password (min 6 characters)">
                <input className={inputCls} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <Field label="Confirm password">
                <input className={inputCls} type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
              </Field>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" disabled={busy}>{busy ? 'Please wait…' : 'Activate & sign in'}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
