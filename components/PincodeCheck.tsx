'use client';

/**
 * "Check delivery" under the buy box.
 *
 * Asks /api/pincode (Delhivery serviceability via the admin) and says three
 * true things: do we deliver there, roughly how long (only when Delhivery
 * gives a figure — never a guessed one), and whether THIS product ships free
 * there under our own zone thresholds (the same table checkout charges from).
 *
 * The pincode is remembered for the next product page, the way shoppers
 * expect from the marketplaces. Storage can be blocked (private mode), so
 * every read/write is guarded and the box still works without it.
 */
import { useEffect, useState } from 'react';

type Answer = {
  pincode: string;
  serviceable: boolean;
  place: string | null;
  state: string | null;
  etaDays: number | null;
  freeDeliveryAbove: number;
  note: string | null;
};

const KEY = 'kk:pincode';
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function PincodeCheck({ price }: { price: number }) {
  const [pin, setPin] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(p: string, remember = true) {
    if (!/^[1-9]\d{5}$/.test(p)) {
      setErr('Enter a valid 6-digit pincode');
      setAnswer(null);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/pincode?pin=${p}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnswer(null);
        setErr(res.status === 429 ? 'Too many checks — please try again in a few minutes' : body.error || 'Could not check right now');
        return;
      }
      setAnswer(body as Answer);
      if (remember) {
        try { localStorage.setItem(KEY, p); } catch { /* storage blocked */ }
      }
    } catch {
      setErr('Could not check right now — please try again');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let saved = '';
    try { saved = localStorage.getItem(KEY) ?? ''; } catch { /* storage blocked */ }
    if (/^[1-9]\d{5}$/.test(saved)) {
      setPin(saved);
      check(saved, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const free = answer?.serviceable && price >= answer.freeDeliveryAbove;

  return (
    <div className="mb-5 rounded-lg border border-line p-3.5">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          check(pin);
        }}
      >
        <label htmlFor="pdp-pincode" className="text-[13px] font-semibold text-ink whitespace-nowrap">
          Check delivery
        </label>
        <input
          id="pdp-pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder="Enter pincode"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="min-w-0 flex-1 rounded-md border border-line px-3 py-2 text-sm font-mono tracking-wider focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || pin.length !== 6}
          className="rounded-md border border-brand px-3.5 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-white disabled:opacity-50"
        >
          {busy ? '…' : 'Check'}
        </button>
      </form>

      <div aria-live="polite" className="text-[13px] leading-snug">
        {err && <p className="mt-2 text-red-600">{err}</p>}
        {answer && (answer.serviceable ? (
          <ul className="mt-2.5 space-y-1">
            <li className="text-success font-semibold">
              ✓ Delivery available{answer.place ? ` to ${answer.place}${answer.state ? `, ${answer.state}` : ''}` : ''}
            </li>
            {answer.etaDays && (
              <li className="text-ink/80">
                Delhivery estimate: about {answer.etaDays} day{answer.etaDays > 1 ? 's' : ''} after dispatch
              </li>
            )}
            <li className="text-ink/80">
              {free
                ? 'Free delivery on this product'
                : `Free delivery on orders above ${inr(answer.freeDeliveryAbove)} — shipping for this pincode is shown at checkout`}
            </li>
          </ul>
        ) : (
          <p className="mt-2.5 text-ink/80">
            <span className="font-semibold text-red-600">Not deliverable by our courier to {answer.pincode} yet.</span>{' '}
            Please WhatsApp us before ordering so we can confirm delivery.
          </p>
        ))}
      </div>
    </div>
  );
}
