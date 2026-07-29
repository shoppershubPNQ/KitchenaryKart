'use client';

import { useState } from 'react';

/**
 * "Notify me when available" — shown in place of the buy buttons on a sold-out
 * product. Collects just an email (no account needed) and posts to
 * /api/notify-me; the team is alerted and the customer is emailed
 * automatically once the SKU is back in stock.
 *
 * Two sizes so the same flow works in both places a sold-out product appears:
 *   'pdp'  — full-size buttons matching Add to Cart / Buy Now.
 *   'card' — the grid tile's compact .btn-small scale.
 * In both, it starts as a BUTTON (not a text link, which read as an
 * afterthought) and only reveals the email field once tapped.
 */
export function NotifyMeButton({
  sku,
  variant = 'pdp',
}: {
  sku: string;
  variant?: 'pdp' | 'card';
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const card = variant === 'card';
  // Card tiles use the compact .btn-small scale; the PDP uses the full .btn one
  // so this lines up with Add to Cart / Buy Now.
  const soldOutCls = card
    ? 'btn-small btn-small-outline !flex-none !py-2 w-full opacity-60 cursor-not-allowed'
    : 'btn btn-outline w-full opacity-60 cursor-not-allowed';
  const ctaCls = card
    ? 'btn-small btn-small-primary !flex-none !py-2 w-full'
    : 'btn btn-primary w-full';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setError(null);
    setState('sending');
    try {
      const res = await fetch('/api/notify-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not save your request. Please try again.');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError('Network error. Please try again.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div
        className={`w-full rounded-lg border border-success/40 bg-success/5 text-ink ${
          card ? 'px-2.5 py-2 text-[11.5px] leading-snug' : 'px-4 py-3 text-[13.5px]'
        }`}
      >
        <b>Thanks!</b> We&apos;ll email you when this is back in stock.
      </div>
    );
  }

  if (!open) {
    return (
      <div className="w-full flex flex-col gap-2">
        <button type="button" disabled aria-disabled="true" className={soldOutCls}>
          Out of Stock
        </button>
        <button type="button" onClick={() => setOpen(true)} className={ctaCls}>
          Notify me
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-2">
      {!card && (
        <label htmlFor={`notify-${sku}`} className="text-[13px] text-ink-soft">
          We&apos;ll email you the moment it&apos;s back:
        </label>
      )}
      <input
        id={`notify-${sku}`}
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        // 16px keeps iOS Safari from auto-zooming the page on focus.
        className={`w-full min-w-0 rounded-lg border border-line px-3 ${
          card ? 'py-1.5 text-[16px]' : 'py-2 text-base'
        }`}
      />
      <button type="submit" disabled={state === 'sending'} className={`${ctaCls} disabled:opacity-60`}>
        {state === 'sending' ? 'Saving…' : 'Notify me'}
      </button>
      {error && <div className={`text-brand ${card ? 'text-[11px]' : 'text-[13px]'}`}>{error}</div>}
    </form>
  );
}
