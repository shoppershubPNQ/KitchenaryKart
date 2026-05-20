'use client';

import { useState } from 'react';
import type { PublicOrder } from '@/lib/orders';
import { OrderDetailView } from '@/components/OrderDetailView';

interface Props {
  prefillOrder?: string;
}

export function TrackForm({ prefillOrder = '' }: Props) {
  const [orderNumber, setOrderNumber] = useState(prefillOrder);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PublicOrder | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not find that order.');
        return;
      }
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (order) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setOrder(null)}
          className="text-sm text-brand hover:underline"
        >
          ← Look up another order
        </button>
        <OrderDetailView order={order} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-line rounded-lg p-6 space-y-4">
      <div>
        <label htmlFor="order" className="block text-xs text-muted mb-1.5 font-semibold uppercase tracking-wider">
          Order number
        </label>
        <input
          id="order"
          type="text"
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          placeholder="e.g. KKMPDPIVW8"
          className="form-input font-mono"
          autoComplete="off"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-xs text-muted mb-1.5 font-semibold uppercase tracking-wider">
          Phone number used for the order
        </label>
        <input
          id="phone"
          type="tel"
          required
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit mobile number"
          className="form-input"
          autoComplete="tel"
        />
        <p className="text-[11px] text-muted mt-1">
          We use this to verify ownership of the order — only the last 4 digits are checked.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !orderNumber || !phone}
        className="w-full px-6 py-3 bg-brand text-white rounded-md font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {busy ? 'Looking up…' : 'Track order'}
      </button>
    </form>
  );
}
