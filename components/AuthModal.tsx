'use client';

/**
 * Login / Create Account modal. Three-step flow:
 *   1. phone       — enter mobile number, click Get OTP
 *   2. otp         — existing customer: enter code to log in
 *      OR register — new phone: collect name + email
 *   3. (closed)    — fires `kk:auth-changed` so the rest of the app refreshes
 *
 * Mounted once from the root layout; opens when anything calls openAuth().
 */
import { useEffect, useRef, useState } from 'react';
import { emitAuthChanged } from '@/lib/useAuth';

type Step = 'phone' | 'otp' | 'register' | 'register-verify';

interface PendingAction {
  redirectTo?: string;
  onSuccess?: () => void;
}

export function AuthModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [deliveredTo, setDeliveredTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef<PendingAction | null>(null);

  // Listen for external open requests.
  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent).detail as PendingAction | undefined;
      pending.current = detail ?? null;
      resetState();
      setOpen(true);
    };
    window.addEventListener('kk:open-auth', h);
    return () => window.removeEventListener('kk:open-auth', h);
  }, []);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function resetState() {
    setStep('phone');
    setPhone('');
    setOtp('');
    setName('');
    setEmail('');
    setDeliveredTo(null);
    setError(null);
    setBusy(false);
  }

  function close() {
    setOpen(false);
  }

  function normalizeTen(p: string): string {
    return (p || '').replace(/\D/g, '').slice(-10);
  }

  async function submitPhone() {
    setError(null);
    const ten = normalizeTen(phone);
    if (ten.length !== 10) {
      setError('Please enter a 10-digit mobile number.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: ten }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Something went wrong.');
        return;
      }
      if (data.exists) {
        setDeliveredTo(typeof data.deliveredTo === 'string' ? data.deliveredTo : null);
        setStep('otp');
      } else {
        setStep('register');
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp() {
    setError(null);
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizeTen(phone), otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Invalid code.');
        return;
      }
      await finishAuth();
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister() {
    setError(null);
    if (!name.trim()) return setError('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Please enter a valid email.');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizeTen(phone),
          name: name.trim(),
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not start registration.');
        return;
      }
      // Switch to email-verification step. Account is NOT created until
      // the user enters the OTP we just emailed.
      setOtp('');
      setDeliveredTo(typeof data.deliveredTo === 'string' ? data.deliveredTo : null);
      setStep('register-verify');
    } finally {
      setBusy(false);
    }
  }

  async function submitRegisterVerify() {
    setError(null);
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizeTen(phone),
          name: name.trim(),
          email: email.trim(),
          otp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not create account.');
        return;
      }
      await finishAuth();
    } finally {
      setBusy(false);
    }
  }

  async function resendRegisterOtp() {
    setError(null);
    setBusy(true);
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizeTen(phone),
          name: name.trim(),
          email: email.trim(),
        }),
      });
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  async function finishAuth() {
    emitAuthChanged();
    const cb = pending.current?.onSuccess;
    const redirect = pending.current?.redirectTo;
    pending.current = null;
    setOpen(false);
    if (cb) setTimeout(cb, 10);
    if (redirect) setTimeout(() => (window.location.href = redirect), 10);
  }

  function changeNumber() {
    setOtp('');
    setError(null);
    setStep('phone');
  }

  async function resendOtp() {
    setError(null);
    setBusy(true);
    try {
      await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizeTen(phone) }),
      });
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/50 z-[300] transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Login or create account"
        className={`fixed inset-0 z-[301] grid place-items-center p-4 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="w-full max-w-[420px] bg-white rounded-lg shadow-2xl p-6 relative">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute top-3 right-3 w-8 h-8 rounded border border-line grid place-items-center text-ink hover:bg-bg-soft"
          >
            ×
          </button>

          {step === 'phone' && (
            <div>
              <h2 className="font-head text-xl text-ink mb-5">
                Login <span className="text-brand">or</span> Create Account
              </h2>
              <label className="block">
                <div className="flex items-center border border-line rounded-md focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition">
                  <span className="px-3 py-3 text-ink font-semibold border-r border-line">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoFocus
                    maxLength={10}
                    placeholder="Enter Mobile Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={(e) => e.key === 'Enter' && submitPhone()}
                    className="flex-1 px-3 py-3 outline-none text-[15px]"
                  />
                </div>
              </label>
              {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
              <button
                type="button"
                onClick={submitPhone}
                disabled={busy || phone.length !== 10}
                className="mt-5 w-full py-3 rounded font-head text-sm font-bold tracking-wider uppercase bg-brand text-white disabled:bg-line disabled:text-muted disabled:cursor-not-allowed hover:bg-brand-dark transition"
              >
                {busy ? 'Please wait…' : 'Get OTP'}
              </button>
              <p className="mt-4 text-xs text-muted text-center">
                We&rsquo;ll send a one-time code to verify your number.
              </p>
            </div>
          )}

          {step === 'otp' && (
            <div>
              <h2 className="font-head text-xl text-ink mb-1">Enter OTP</h2>
              <div className="text-sm text-muted mb-5">
                {deliveredTo
                  ? <>Sent to <strong className="text-ink">{deliveredTo}</strong>. Check your inbox (and spam folder).</>
                  : <>Sent to +91 {phone}.</>}
                {' '}
                <button type="button" onClick={changeNumber} className="text-brand font-semibold hover:underline">
                  Change
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && submitOtp()}
                className="w-full px-3 py-3 border border-line rounded-md text-center text-[18px] tracking-[8px] font-bold outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
              <button
                type="button"
                onClick={submitOtp}
                disabled={busy || otp.length !== 6}
                className="mt-5 w-full py-3 rounded font-head text-sm font-bold tracking-wider uppercase bg-brand text-white disabled:bg-line disabled:text-muted disabled:cursor-not-allowed hover:bg-brand-dark transition"
              >
                {busy ? 'Verifying…' : 'Verify & Login'}
              </button>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted">
                  Didn&rsquo;t receive it?
                </span>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={busy}
                  className="text-brand font-semibold hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {step === 'register' && (
            <div>
              <h2 className="font-head text-xl text-ink mb-1">Register with us</h2>
              <div className="text-sm text-ink mb-5">
                +91 {phone}{' '}
                <button type="button" onClick={changeNumber} className="text-brand font-semibold hover:underline ml-1">
                  Change
                </button>
              </div>
              <p className="text-sm text-muted mb-5">
                This number is not registered. Fill in the details to create your account.
              </p>
              <label className="block mb-3">
                <span className="block text-sm text-ink mb-1.5">
                  Name <span className="text-brand">*</span>
                </span>
                <input
                  type="text"
                  placeholder="First and Last Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-line rounded-md text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </label>
              <label className="block mb-3">
                <span className="block text-sm text-ink mb-1.5">
                  Email <span className="text-brand">*</span>
                </span>
                <input
                  type="email"
                  placeholder="Email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitRegister()}
                  className="w-full px-3.5 py-2.5 border border-line rounded-md text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <span className="block text-xs text-muted mt-1">
                  Your email will be used to send order invoices and updates.
                </span>
              </label>
              {error && <div className="mt-1 mb-3 text-sm text-red-600">{error}</div>}
              <button
                type="button"
                onClick={submitRegister}
                disabled={busy || !name.trim() || !email.trim()}
                className="mt-2 w-full py-3 rounded font-head text-sm font-bold tracking-wider uppercase bg-brand text-white disabled:bg-line disabled:text-muted disabled:cursor-not-allowed hover:bg-brand-dark transition"
              >
                {busy ? 'Creating…' : 'Create Account'}
              </button>
              <p className="mt-4 text-xs text-muted text-center">
                By continuing you agree to our{' '}
                <a className="text-brand font-semibold hover:underline" href="/terms">Terms of Use</a>
                {' '}and{' '}
                <a className="text-brand font-semibold hover:underline" href="/privacy">Privacy Policy</a>.
              </p>
            </div>
          )}

          {step === 'register-verify' && (
            <div>
              <h2 className="font-head text-xl text-ink mb-1">Verify your email</h2>
              <div className="text-sm text-muted mb-5">
                {deliveredTo
                  ? <>We sent a 6-digit code to <strong className="text-ink">{deliveredTo}</strong>. Check your inbox (and spam folder).</>
                  : <>We sent a 6-digit code to your email. Check your inbox (and spam folder).</>}
                {' '}
                <button type="button" onClick={() => setStep('register')} className="text-brand font-semibold hover:underline">
                  Edit details
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && submitRegisterVerify()}
                className="w-full px-3 py-3 border border-line rounded-md text-center text-[18px] tracking-[8px] font-bold outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
              <button
                type="button"
                onClick={submitRegisterVerify}
                disabled={busy || otp.length !== 6}
                className="mt-5 w-full py-3 rounded font-head text-sm font-bold tracking-wider uppercase bg-brand text-white disabled:bg-line disabled:text-muted disabled:cursor-not-allowed hover:bg-brand-dark transition"
              >
                {busy ? 'Verifying…' : 'Verify & Create Account'}
              </button>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted">Didn&rsquo;t receive it?</span>
                <button
                  type="button"
                  onClick={resendRegisterOtp}
                  disabled={busy}
                  className="text-brand font-semibold hover:underline disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
