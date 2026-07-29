'use client';

import { useState } from 'react';

/** Alert bell — the sold-out counterpart to the card's add-to-cart trolley. */
function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

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
  const [phone, setPhone] = useState('');
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
        body: JSON.stringify({ sku, email, phone }),
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
        className={`w-full basis-full rounded-lg border border-success/40 bg-success/5 text-ink ${
          card ? 'px-2.5 py-2 text-[11.5px] leading-snug' : 'px-4 py-3 text-[13.5px]'
        }`}
      >
        <b>Thanks!</b> We&apos;ll email you when this is back in stock.
      </div>
    );
  }

  if (!open) {
    // Card: one line, mirroring the in-stock row's [icon][wide button] shape —
    // a bell in the icon slot where add-to-cart puts its trolley, next to the
    // sold-out label.
    if (card) {
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Notify me when available"
            title="Notify me when available"
            // border matches the outline buttons' box so this row is exactly
            // the same height as the in-stock [cart][Buy Now] row. Narrower on
            // phones to leave room for the longer "Out of Stock" label.
            className="btn-small btn-small-primary border border-brand !flex-none !py-2 !px-0 w-9 md:w-11 grid place-items-center"
          >
            <BellIcon />
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            // min-w-0 lets this flex item actually shrink, and the tighter
            // padding/type on phones keeps the nowrap label inside its border —
            // in a 2-up mobile grid the tile only leaves it ~80px.
            className="btn-small btn-small-outline !py-2 !px-0.5 md:!px-2 !text-[9.5px] md:!text-[11px] tracking-tight md:tracking-wide min-w-0 opacity-60 cursor-not-allowed"
          >
            {/* On very narrow phones (<340px) even the tightened label would
                spill past its border, so shorten it there. */}
            <span className="max-[339px]:hidden">Out of Stock</span>
            <span className="hidden max-[339px]:inline">Sold Out</span>
          </button>
        </div>
      );
    }
    // PDP: a Fragment, not a wrapper — the buy box is already a flex row, so
    // these two land side by side exactly like [Add to Cart][Buy Now].
    return (
      <>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="btn btn-outline flex-1 whitespace-nowrap opacity-60 cursor-not-allowed"
        >
          Out of Stock
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-primary flex-1 whitespace-nowrap inline-flex items-center justify-center gap-2"
        >
          <BellIcon />
          Notify me
        </button>
      </>
    );
  }

  const field = `w-full min-w-0 rounded-lg border border-line px-3 ${
    // 16px keeps iOS Safari from auto-zooming the page on focus.
    card ? 'py-1.5 text-[16px]' : 'py-2 text-base'
  }`;
  return (
    <form onSubmit={submit} className="w-full basis-full flex flex-col gap-2">
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
        className={field}
      />
      {/* Phone is optional — demanding it would cost signups, but when given it
          lets the team CALL a waiting buyer, which converts far better than an
          email on bulk HORECA orders. */}
      <input
        type="tel"
        inputMode="numeric"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional) — for a faster callback"
        autoComplete="tel"
        className={field}
      />
      <button type="submit" disabled={state === 'sending'} className={`${ctaCls} disabled:opacity-60`}>
        {state === 'sending' ? 'Saving…' : 'Notify me'}
      </button>
      {error && <div className={`text-brand ${card ? 'text-[11px]' : 'text-[13px]'}`}>{error}</div>}
    </form>
  );
}
