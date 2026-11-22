import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { Icon } from '@/components/icons';
import { Button, Field, Input, Loading } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { isValidMobile, tenDigits, toE164 } from '@/lib/phone';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export function Login() {
  const { session, loading, isStaff, isDeveloper, error: profileError, signOut } = useSession();
  const navigate = useNavigate();
  const loc = useLocation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (loc.state as { from?: string } | null)?.from;
  const notStaff = !!session && !loading && !isStaff && !profileError;

  // Signed in as staff: go to the console.
  useEffect(() => {
    if (session && !loading && isStaff) {
      navigate(from && from !== '/login' ? from : isDeveloper ? '/dev/activity' : '/agency', { replace: true });
    }
  }, [session, loading, isStaff, isDeveloper, from, navigate]);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    if (!isValidMobile(phone)) {
      setError('Enter your 10-digit mobile number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ phone: toE164(phone) });
      if (err) throw err;
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.verifyOtp({ phone: toE164(phone), token: code.trim(), type: 'sms' });
      if (err) throw err;
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (session && loading) return <Loading label="Signing you in…" />;

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-20 size-80 rounded-full bg-white/10" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-10 rounded-xl ring-2 ring-white/30" />
          <span className="font-display text-xl font-extrabold">ManeMaid</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl leading-tight font-extrabold">Agency & developer console</h2>
          <p className="mt-3 max-w-md text-lg text-white/85">Sign in with the same mobile number you use in the ManeMaid app.</p>
        </div>
        <p className="relative text-sm text-white/70">Only phones approved by ManeMaid can open the console.</p>
      </div>

      <div className="flex items-center justify-center bg-surface px-5 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <img src="/favicon.svg" alt="" className="size-9" />
            <span className="font-display text-lg font-extrabold">ManeMaid</span>
          </Link>

          {notStaff ? (
            <div className="space-y-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-warn-soft text-warn">
                <Icon name="lock" size={22} />
              </div>
              <h1 className="text-2xl font-extrabold">This portal is for agency staff</h1>
              <p className="text-muted">
                Your number isn't approved for the console. Customers can book and manage services in the ManeMaid mobile app.
                If you work for the agency, ask a developer to give your number access.
              </p>
              <Button variant="secondary" onClick={() => void signOut()}>
                Use a different number
              </Button>
            </div>
          ) : profileError ? (
            <div className="space-y-4">
              <h1 className="text-2xl font-extrabold">We couldn't load your account</h1>
              <p className="text-muted">{profileError}</p>
              <Button variant="secondary" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          ) : step === 'phone' ? (
            <form onSubmit={sendCode} className="space-y-5" noValidate>
              <div>
                <h1 className="text-2xl font-extrabold">Sign in</h1>
                <p className="mt-1 text-muted">We'll text a 6-digit code to your mobile.</p>
              </div>
              <Field label="Mobile number" htmlFor="phone" required error={error}>
                <div className="flex">
                  <span className="inline-flex h-11 items-center rounded-l-xl border border-r-0 border-line bg-surface-2 px-3 text-[15px] text-muted">+91</span>
                  <Input
                    id="phone"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    autoFocus
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 14))}
                    className="rounded-l-none"
                    invalid={!!error}
                  />
                </div>
              </Field>
              <Button type="submit" loading={busy} className="w-full" icon="phone">
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-5" noValidate>
              <div>
                <h1 className="text-2xl font-extrabold">Enter the code</h1>
                <p className="mt-1 text-muted">Sent to +91 {tenDigits(phone)}</p>
              </div>
              <Field label="6-digit code" htmlFor="code" required error={error}>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-lg tracking-[0.5em]"
                  invalid={!!error}
                />
              </Field>
              <Button type="submit" loading={busy} className="w-full" icon="check">
                Verify and continue
              </Button>
              <div className="flex justify-between text-sm">
                <button type="button" className="font-medium text-brand-500 hover:underline" onClick={() => { setStep('phone'); setCode(''); setError(null); }}>
                  Change number
                </button>
                <button type="button" className="font-medium text-brand-500 hover:underline" onClick={(e) => void sendCode(e as unknown as FormEvent)} disabled={busy}>
                  Resend code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
