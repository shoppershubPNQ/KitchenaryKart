'use client';

import { useState } from 'react';

/**
 * "Notify me when available" — shown in place of the buy buttons on a sold-out
 * product. Collects just an email (no account needed) and posts to
 * /api/notify-me; the team is alerted and the customer is emailed
 * automatically once the SKU is back in stock.
 *
 * Starts as a single button so the sold-out state stays compact; the email
 * field only appears once the shopper opts in.
 */
export function NotifyMeButton({ sku }: { sku: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

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
      <div className="flex-1 rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-[13.5px] text-ink">
        <b>Thanks!</b> We&apos;ll email you at {email} as soon as this is back in stock.
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex-1 flex flex-col gap-2">
        <button type="button" disabled aria-disabled="true" className="btn btn-outline w-full opacity-60 cursor-not-allowed">
          Out of Stock
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[13.5px] font-semibold text-brand hover:underline text-center"
        >
          Notify me when available
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex-1 flex flex-col gap-2">
      <label htmlFor="notify-email" className="text-[13px] text-ink-soft">
        We&apos;ll email you the moment it&apos;s back:
      </label>
      <div className="flex gap-2">
        <input
          id="notify-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          // 16px keeps iOS Safari from auto-zooming the page on focus.
          className="flex-1 min-w-0 rounded-lg border border-line px-3 py-2 text-base"
        />
        <button type="submit" disabled={state === 'sending'} className="btn btn-primary whitespace-nowrap disabled:opacity-60">
          {state === 'sending' ? 'Saving…' : 'Notify me'}
        </button>
      </div>
      {error && <div className="text-[13px] text-brand">{error}</div>}
    </form>
  );
}
