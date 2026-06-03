/**
 * Set-password page used by two flows:
 *
 *   1. Invite — a Super Admin invited the user; the email contains a magic
 *      link that signs them in once. The user has NO password yet, so they
 *      must set one here before they can sign in normally.
 *
 *   2. Recovery — the user clicked a "reset password" email. They have a
 *      transient recovery session that lets them call updateUser({password})
 *      to set a new one.
 *
 * Both flows arrive at the app with `#access_token=...&type=invite|recovery`.
 * `src/lib/initial-url.ts` snapshots the type before supabase-js consumes
 * the hash; we read it here.
 *
 * Flow:
 *   - Wait until supabase-js has set the session (so updateUser is allowed).
 *   - Show a welcome/recovery copy + two password fields (with confirmation).
 *   - On submit: `supabase.auth.updateUser({ password })`.
 *   - On success: sign out (so the user proves the password works) and
 *     redirect to /login with a success banner.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { INITIAL_URL_TYPE } from '@/lib/initial-url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { Loader2, ShieldCheck } from 'lucide-react';

const MIN_PASSWORD_LEN = 8;

export function SetPasswordPage() {
  const { session, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Which flow brought the user here, if known.
  const flow = INITIAL_URL_TYPE; // 'invite' | 'recovery' | null

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If there's no flow flag AND no active session, the user landed here by
  // mistake. Bounce them to login.
  useEffect(() => {
    if (authLoading) return;
    if (!flow && !session) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, flow, session, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If we end up authenticated but already have a password set (no flow
  // marker), the user shouldn't be here.
  if (!flow && session) {
    return <Navigate to="/dashboard" replace />;
  }

  const isInvite = flow === 'invite';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setSubmitting(false);
      setError(err.message);
      return;
    }
    // Sign the user out so they prove the new password works at /login.
    await signOut();
    setSubmitting(false);
    navigate('/login?passwordSet=1', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <Logo />
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {isInvite ? 'Welcome — set your password' : 'Reset your password'}
            </CardTitle>
            <CardDescription className="mt-1">
              {isInvite ? (
                <>
                  You've been invited to SADP-II Monitoring. Choose a password to
                  finish setting up your account.
                </>
              ) : (
                <>
                  Choose a new password. You'll be asked to sign in again with
                  the new credentials.
                </>
              )}
            </CardDescription>
            {session?.user?.email && (
              <p className="text-xs text-muted-foreground mt-2">
                Setting password for <strong>{session.user.email}</strong>
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LEN}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                At least {MIN_PASSWORD_LEN} characters. Mix letters and numbers for
                a stronger password.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LEN}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting password…
                </>
              ) : (
                <>{isInvite ? 'Set password and continue' : 'Update password'}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
