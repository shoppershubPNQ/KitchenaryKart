'use client';

/**
 * Cart drawer. Mounted once in the root layout, listens for `kk:open-drawer`
 * events (fired from the header cart button or a product's "Buy Now").
 *
 * Layout mirrors a standard marketplace cart:
 *   - Cart items (thumb + title, price/discount, coupon chip, qty −/+, delete)
 *   - Promo banner ("Summer Sale is Live!") with a filled progress bar
 *   - Price Summary (subtotal, discount, shipping)
 *   - "You Pay" total + "Checkout Now" button
 *
 * Discount rule for now: a flat 10% auto-coupon `SUMMER10`. When a real
 * coupon engine exists, pull it from there.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  decreaseQty,
  increaseQty,
  removeFromCart,
  useCart,
} from '@/lib/cart';
import { inr, imgSrc, letter } from '@/lib/format';
import { trackInitiateCheckout } from '@/lib/analytics';
import { CartShippingNudge } from './CartShippingNudge';
import { shippingFor } from '@/lib/shipping';

/** Per-line savings = (MRP − price) × qty, when the product has an MRP > price. */
function lineSavings(mrp: number | null, price: number, qty: number) {
  if (!mrp || mrp <= price) return 0;
  return (mrp - price) * qty;
}

export function DrawerMount() {
  const [open, setOpen] = useState(false);
  const { items, total, count } = useCart();

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('kk:open-drawer', openHandler);
    return () => window.removeEventListener('kk:open-drawer', openHandler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Subtotal = sum of MRPs (what the customer would pay without discount).
  // Discount = sum of (MRP − price) savings across lines.
  // You Pay  = sum of selling prices.
  const subtotal = items.reduce(
    (acc, i) => acc + (i.mrp && i.mrp > i.price ? i.mrp : i.price) * (i.qty || 1),
    0,
  );
  const discount = items.reduce(
    (acc, i) => acc + lineSavings(i.mrp, i.price, i.qty || 1),
    0,
  );
  // Shipping preview (no coupon in the drawer — recomputed after discount
  // at checkout). Free at/above the threshold, flat fee below.
  const shipping = shippingFor(total);
  const youPay = total + shipping; // selling-price sum + shipping
  const pctOff = subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/40 z-[200] transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`fixed top-0 right-0 h-dvh w-[440px] max-w-full bg-[#F5F5F5] shadow-lg z-[201] flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Free-shipping progress nudge — first thing the buyer sees
              on opening the cart. Auto-hides on empty cart. AOV-lift
              pattern (15-25% typical) — surfaces the free-shipping
              benefit + the concrete ₹ amount needed to reach it. */}
          <CartShippingNudge subtotal={total} itemCount={count} />

          {/* Cart items card */}
          <section className="bg-white rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-head text-[16px] font-bold text-ink">Cart items</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded grid place-items-center text-2xl text-muted hover:bg-bg-soft hover:text-ink"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center text-muted text-sm">
                <p>Your cart is empty.</p>
                <p className="mt-1">Browse the catalog and add products to your cart.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((i) => {
                  const qty = i.qty || 1;
                  const lineMrp = (i.mrp && i.mrp > i.price ? i.mrp : i.price) * qty;
                  const lineNet = i.price * qty;
                  const lineDiscount = lineMrp - lineNet;
                  return (
                    <div
                      key={i.sku}
                      className="border border-line rounded-md p-3 grid grid-cols-[72px_1fr_auto] gap-3"
                    >
                      <div className="w-[72px] h-[72px] rounded bg-bg-soft grid place-items-center overflow-hidden font-head font-bold text-brand">
                        {i.imageUrl ? (
                          <img src={imgSrc(i.imageUrl)} alt={i.name} className="w-full h-full object-contain" />
                        ) : (
                          letter(i.name)
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/product/${encodeURIComponent(i.sku)}`}
                          onClick={() => setOpen(false)}
                          className="block text-[14px] text-ink font-bold leading-snug line-clamp-2 hover:text-brand transition"
                        >
                          {i.name}
                        </Link>
                        <div className="flex items-baseline gap-2 mt-1.5">
                          {lineDiscount > 0 && (
                            <span className="text-[13px] text-muted line-through">
                              {inr(lineMrp)}
                            </span>
                          )}
                          <span className="font-head text-[15px] font-bold text-ink">
                            {inr(lineNet)}
                          </span>
                        </div>
                        {lineDiscount > 0 && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-success font-semibold">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                              <line x1="7" y1="7" x2="7.01" y2="7"/>
                            </svg>
                            <span>You save {inr(lineDiscount)}</span>
                          </div>
                        )}

                        {/* Quantity selector */}
                        <div className="mt-2.5 inline-flex items-center border border-line rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() => decreaseQty(i.sku)}
                            className="w-8 h-8 grid place-items-center text-ink hover:bg-bg-soft"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-8 h-8 grid place-items-center text-[13px] font-semibold text-ink">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQty(i.sku)}
                            className="w-8 h-8 grid place-items-center text-ink hover:bg-bg-soft"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(i.sku)}
                        className="w-8 h-8 rounded grid place-items-center text-muted hover:bg-red-50 hover:text-red-600 self-start"
                        aria-label="Remove"
                        title="Remove"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {items.length > 0 && (
            <>
              {/* Savings banner — only shown when the cart has actual MRP savings */}
              {discount > 0 && (
                <section className="bg-white rounded-lg p-4">
                  <h3 className="font-head text-[15px] font-bold text-ink mb-2">
                    You&rsquo;re saving {inr(discount)}!
                  </h3>
                  <div className="h-2 rounded-full bg-bg-soft overflow-hidden mb-2">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${Math.min(pctOff, 100)}%` }}
                    />
                  </div>
                  <p className="text-[13px] text-ink-soft">
                    That&rsquo;s{' '}
                    <strong className="text-ink">{pctOff}% off</strong> the catalog price
                    across your cart. <span>🎉</span>
                  </p>
                </section>
              )}

              {/* Price Summary */}
              <section className="bg-white rounded-lg p-4">
                <h3 className="font-head text-[15px] font-bold text-ink mb-3">Price Summary</h3>
                <dl className="space-y-2 text-[14px]">
                  <div className="flex justify-between">
                    <dt className="text-ink">Subtotal</dt>
                    <dd className="text-ink">{inr(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink">Discount</dt>
                    <dd className="text-ink">− {inr(discount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink">Shipping</dt>
                    {shipping === 0 ? (
                      <dd className="text-success font-semibold">Free</dd>
                    ) : (
                      <dd className="text-ink">{inr(shipping)}</dd>
                    )}
                  </div>
                </dl>
              </section>
            </>
          )}
        </div>

        {/* Sticky footer */}
        {items.length > 0 && (
          <div className="bg-[#F5F5F5] border-t border-line p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="font-head text-[16px] font-bold text-ink">You Pay:</span>
              <div className="text-right">
                <div className="font-head text-[18px] font-bold text-ink">{inr(youPay)}</div>
                <div className="text-[11px] text-muted">Including taxes</div>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={() => {
                // Meta Pixel InitiateCheckout + GA4 begin_checkout
                trackInitiateCheckout({
                  items: items.map((i) => ({
                    sku: i.sku,
                    name: i.name,
                    price: i.price,
                    quantity: i.qty,
                  })),
                  total,
                });
                setOpen(false);
              }}
              className="block w-full text-center py-3 rounded bg-brand text-white font-head font-bold tracking-widest uppercase text-[13px] hover:bg-brand-dark transition"
            >
              Proceed to Buy ({count} {count === 1 ? 'item' : 'items'})
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
