'use client';

import { inr } from '@/lib/format';

/**
 * "Add ₹X more for free shipping" nudge shown at the top of the cart
 * drawer. AOV-lift pattern used by every major D2C brand — surfaces a
 * concrete benefit the buyer doesn't currently have, with a clear
 * amount needed to reach it.
 *
 * Three visual states based on cart subtotal vs threshold:
 *   1. BELOW (> magic zone)  → calm "Add ₹X more" + green progress bar
 *   2. MAGIC ZONE (≤ ₹500)    → urgent "So close! Just ₹X more" + brand
 *                                color bar, FOMO tone
 *   3. MET / OVER             → green confirmation "Unlocked FREE shipping"
 *
 * Hidden entirely when the cart is empty (no nudge for a zero cart).
 *
 * Threshold is hardcoded to match the authoritative shipping rule in
 * web/lib/shipping.ts + admin /api/public/checkout (₹5,000). If that
 * changes, update this constant.
 */

const FREE_SHIPPING_THRESHOLD = 5000;
/** Within this distance from the threshold → switch to urgent tone. */
const MAGIC_ZONE_DISTANCE = 500;

interface Props {
  /** What the customer currently pays — sum of selling prices. */
  subtotal: number;
  /** Number of distinct items in the cart. Used to hide nudge when 0. */
  itemCount: number;
}

export function CartShippingNudge({ subtotal, itemCount }: Props) {
  if (itemCount === 0) return null;

  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const met = remaining <= 0;
  const magicZone = !met && remaining <= MAGIC_ZONE_DISTANCE;
  const pct = Math.max(
    2,
    Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100),
  );

  // STATE 3 — threshold met
  if (met) {
    return (
      <section
        className="rounded-lg p-3 bg-success/10 border border-success/40"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13.5px] font-bold text-success">
            ✅ You&apos;ve unlocked FREE shipping!
          </span>
          <span className="text-xl" aria-hidden="true">
            🎉
          </span>
        </div>
        <div className="h-1.5 bg-success/20 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-success w-full" />
        </div>
      </section>
    );
  }

  // STATE 1 + 2 — below threshold
  const message = magicZone
    ? `🔥 So close! Just ${inr(remaining)} more for FREE shipping`
    : `🚚 Add ${inr(remaining)} more for FREE shipping`;
  const textColor = magicZone ? 'text-brand' : 'text-ink';
  const barColor = magicZone ? 'bg-brand' : 'bg-success';
  const borderColor = magicZone ? 'border-brand/40 bg-brand/5' : 'border-line bg-white';

  return (
    <section
      className={`rounded-lg p-3 border ${borderColor}`}
      aria-live="polite"
    >
      <div className={`text-[13px] font-bold mb-2 ${textColor}`}>{message}</div>
      <div className="h-1.5 bg-bg-soft rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10.5px] text-muted mt-1">
        <span className="font-mono">{inr(subtotal)}</span>
        <span className="font-mono">{inr(FREE_SHIPPING_THRESHOLD)}</span>
      </div>
    </section>
  );
}
