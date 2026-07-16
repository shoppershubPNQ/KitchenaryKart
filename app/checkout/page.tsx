'use client';

/**
 * Checkout / Review-order page.
 *
 * On "Pay Now" we:
 *   1. POST /admin-api/public/checkout       → creates Order + Razorpay order on backend
 *   2. Open Razorpay Checkout popup with razorpayOrderId
 *   3. On success: PUT /admin-api/public/payments/razorpay → verifies signature
 *   4. Show success card, clear cart
 *
 * Uses the Next.js rewrite proxy (/admin-api/...) configured in next.config.js
 * so calls go server-to-server (no CORS).
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { clearCart, useCart } from '@/lib/cart';
import { openAuth, useAuth } from '@/lib/useAuth';
import { imgSrc, inr, letter } from '@/lib/format';
import { trackPurchase } from '@/lib/analytics';
import { computeOrderSummary } from '@/lib/order-summary';

interface Address {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  /** Optional buyer GSTIN for B2B customers who want a GST input-credit invoice. */
  gstin?: string;
}

/** Indian GSTIN: 2-digit state + 10-char PAN + entity + 'Z' + checksum. */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
function isValidGstin(g: string): boolean {
  return GSTIN_RE.test((g || '').trim().toUpperCase());
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
const ADDR_KEY = 'kk_checkout_address';

function loadAddress(fallback: Partial<Address> = {}): Address {
  const empty: Address = { name: '', phone: '', line1: '', city: '', state: '', postalCode: '', gstin: '' };
  if (typeof window === 'undefined') return { ...empty, ...fallback };
  try {
    const raw = localStorage.getItem(ADDR_KEY);
    if (raw) return { ...empty, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...empty, ...fallback };
}

function saveAddress(a: Address) {
  try {
    localStorage.setItem(ADDR_KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

/** Inject Razorpay's Checkout script once. Resolves true if loaded. */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, count } = useCart();
  const { customer, loggedIn, loading: authLoading } = useAuth();

  const [address, setAddress] = useState<Address>(() => loadAddress());
  // B2B: when checked, reveal a GSTIN field so the buyer gets a GST input-credit
  // invoice. Pre-checked if a GSTIN was saved from a prior order.
  const [isBusiness, setIsBusiness] = useState<boolean>(() => !!loadAddress().gstin);
  const [editing, setEditing] = useState(false);
  const [marketing, setMarketing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id?: number; orderNumber?: string } | null>(null);

  // Coupon state. `applied` holds the server-validated result; the
  // binding discount is recomputed at checkout regardless, so this is
  // just for live preview.
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    message: string;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    setAddress((prev) => ({
      ...prev,
      name: prev.name || customer.name || '',
      phone: prev.phone || customer.phone || '',
    }));
  }, [customer]);

  useEffect(() => {
    if (authLoading) return;
    if (!loggedIn) {
      openAuth({ onSuccess: () => {} });
    }
  }, [authLoading, loggedIn]);

  useEffect(() => {
    if (items.length === 0 && !done) {
      const t = setTimeout(() => router.replace('/'), 50);
      return () => clearTimeout(t);
    }
  }, [items.length, done, router]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (a, i) => a + (i.mrp && i.mrp > i.price ? i.mrp : i.price) * (i.qty || 1),
        0,
      ),
    [items],
  );
  // `total` (from useCart) is the selling-price sum — the same value
  // the backend recomputes as its `subtotal`. The coupon discount
  // applies on top of that.
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const amountAfterDiscount = Math.max(0, total - couponDiscount);
  const savings = Math.max(subtotal - total, 0);

  // Zone × weight delivery charge — fetched from the server (shipping-quote)
  // so the amount shown always equals the binding charge at /api/public/
  // checkout. Needs the destination state + cart; null until both are known.
  // cartKey keeps the effect stable (items is a fresh array each render).
  const cartKey = items.map((i) => `${i.sku}:${i.qty}`).join(',');
  const [shipQuote, setShipQuote] = useState<number | null>(null);
  const [shipLoading, setShipLoading] = useState(false);
  useEffect(() => {
    if (!address.state.trim() || items.length === 0) {
      setShipQuote(null);
      return;
    }
    let cancelled = false;
    setShipLoading(true);
    fetch('/admin-api/public/shipping-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ sku: i.sku, quantity: i.qty })),
        state: address.state,
        amountAfterDiscount,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setShipQuote(typeof d?.shippingCost === 'number' ? d.shippingCost : null);
      })
      .catch(() => {
        if (!cancelled) setShipQuote(null);
      })
      .finally(() => {
        if (!cancelled) setShipLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, address.state, amountAfterDiscount]);

  // Whether we have a usable quote to show (state entered + fetched).
  const shipKnown = !!address.state.trim() && shipQuote !== null;

  // GST-compliant breakdown via the shared helper — identical labels +
  // calculation to the cart, invoice, admin and print view. Pass the fetched
  // zone-weight shipping as the override (0 until a quote loads).
  const summary = computeOrderSummary(items, couponDiscount, shipQuote ?? 0);

  // Re-validate a previously applied coupon when the cart total changes
  // (e.g. customer edits qty in another tab). Clears it if it no longer
  // qualifies. Skips when nothing's applied.
  useEffect(() => {
    if (!appliedCoupon) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedCoupon.code,
            subtotal: total,
            phone: address.phone || customer?.phone || '',
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.valid) {
          setAppliedCoupon({
            code: data.coupon.code,
            discountAmount: data.discountAmount,
            message: data.message,
          });
        } else {
          setAppliedCoupon(null);
          setCouponError(data.message || 'Coupon no longer applies.');
        }
      } catch {
        /* leave as-is on transient error */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // Google Customer Reviews opt-in — fires on the order-confirmation
  // ("Payment received") state. Google shows the customer a post-purchase
  // survey opt-in; if they accept, Google emails them a survey after the
  // estimated delivery date and aggregates a verified store rating.
  // Requires an email; phone-only customers simply won't see the opt-in.
  useEffect(() => {
    if (!done?.orderNumber) return;
    const email = customer?.email || '';
    if (!email) return;
    // Estimated delivery ~7 days out (matches our 3–7 business-day window).
    const est = new Date();
    est.setDate(est.getDate() + 7);
    const estimatedDeliveryDate = est.toISOString().slice(0, 10);
    (window as any).renderOptIn = function () {
      (window as any).gapi.load('surveyoptin', function () {
        (window as any).gapi.surveyoptin.render({
          merchant_id: 5809109517,
          order_id: done.orderNumber,
          email,
          delivery_country: 'IN',
          estimated_delivery_date: estimatedDeliveryDate,
        });
      });
    };
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/platform.js?onload=renderOptIn';
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
    return () => {
      s.remove();
    };
  }, [done, customer]);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal: total,
          phone: address.phone || customer?.phone || '',
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          discountAmount: data.discountAmount,
          message: data.message,
        });
        setCouponInput('');
      } else {
        setAppliedCoupon(null);
        setCouponError(data.message || 'This coupon is not valid.');
      }
    } catch {
      setCouponError('Could not check the coupon. Please try again.');
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput('');
  }

  function fullAddress(a: Address): string {
    return [a.line1, a.city, a.state, a.postalCode].filter(Boolean).join(', ');
  }
  // State is required now: the delivery charge is zone-based, so without it
  // the shown amount couldn't match the server's binding charge.
  const addressFilled = !!(address.line1 && address.city && address.state && address.postalCode);

  async function placeOrder() {
    setError(null);
    if (!customer) {
      openAuth({});
      return;
    }
    if (!addressFilled) {
      setEditing(true);
      setError('Please complete your delivery address (including state).');
      return;
    }
    // Don't let the order go through before the delivery charge is known —
    // otherwise the customer could be charged a different amount than shown.
    if (shipQuote === null) {
      setError('Calculating delivery charge — please wait a moment and try again.');
      return;
    }
    if (isBusiness && address.gstin?.trim() && !isValidGstin(address.gstin)) {
      setEditing(true);
      setError('Please enter a valid 15-character GSTIN (e.g. 27AAQPR2976J1ZU), or uncheck the business option.');
      return;
    }
    if (!RAZORPAY_KEY) {
      setError('Payment is not configured. Please contact support.');
      return;
    }
    setSubmitting(true);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) throw new Error('Could not load Razorpay. Check your internet connection.');

      // 1. Create Order + Razorpay order on the backend.
      const res = await fetch('/admin-api/public/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Link the order to the signed-in account so it appears in
          // "My Orders" (server re-verifies this id before linking).
          customerId: customer.id,
          customerName: address.name || customer.name,
          customerEmail: customer.email || '',
          customerPhone: address.phone || customer.phone || '',
          shippingAddress: `${address.name} · ${address.phone}\n${fullAddress(address)}`,
          // B2B GST invoice: only sent when the buyer ticked "business" + gave a valid GSTIN.
          customerGstin:
            isBusiness && address.gstin?.trim() && isValidGstin(address.gstin)
              ? address.gstin.trim().toUpperCase()
              : null,
          couponCode: appliedCoupon?.code || null,
          items: items.map((i) => ({
            sku: i.sku,
            name: i.name,
            price: i.price,
            quantity: i.qty || 1,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not create order');

      saveAddress(address);

      // 2. Open Razorpay Checkout popup.
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY,
        amount: data.amount,
        currency: data.currency || 'INR',
        order_id: data.razorpayOrderId,
        name: 'KitchenaryKart',
        description: `Order ${data.orderNumber}`,
        image: '/logo.png',
        prefill: {
          name: data.customerName || '',
          email: data.customerEmail || '',
          contact: data.customerPhone || '',
        },
        theme: { color: '#A01818' },
        handler: async (response: any) => {
          // 3. Payment success — verify signature on backend.
          try {
            const v = await fetch('/admin-api/public/payments/razorpay', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const vd = await v.json().catch(() => ({}));
            if (!v.ok) throw new Error(vd?.error || 'Payment verification failed');
            // Fire Purchase conversion BEFORE clearing cart so we still
            // have the line items + total to report. Wrapped in
            // try/catch so a flaky pixel never blocks the success state.
            try {
              trackPurchase({
                orderNumber: data.orderNumber,
                // Use the server's binding charge (Razorpay amount, in
                // paise) so revenue includes the ₹399 shipping and any
                // discount. Fall back to the line-item subtotal only if
                // the API didn't return an amount.
                total:
                  typeof data.amount === 'number'
                    ? data.amount / 100
                    : items.reduce((s, i) => s + i.price * i.qty, 0),
                shipping:
                  typeof data.shippingCost === 'number'
                    ? data.shippingCost
                    : undefined,
                coupon: data.couponCode || appliedCoupon?.code || undefined,
                items: items.map((i) => ({
                  sku: i.sku,
                  name: i.name,
                  price: i.price,
                  quantity: i.qty,
                })),
              });
            } catch (err) {
              console.error('[kk:analytics] trackPurchase failed', err);
            }
            clearCart();
            setDone({ id: data.orderId, orderNumber: data.orderNumber });
          } catch (e: any) {
            setError(e?.message || 'Payment verification failed. Contact support with order number ' + data.orderNumber);
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setError('Payment cancelled. You can try again.');
            // We intentionally LEAVE the order as pending/unpaid instead of
            // cancelling it. That way it surfaces in the admin "Abandoned
            // carts" queue so the team can WhatsApp the buyer and recover the
            // sale. It stays hidden from the main admin Orders list (see the
            // default filter in /api/orders) and can never be fulfilled while
            // unpaid, so it doesn't look like a real order.
          },
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e?.message || 'Could not place order');
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-[6mm] md:px-[1.5cm] py-12 bg-bg-soft">
        <div className="bg-white rounded-xl border border-line shadow-sm p-10 max-w-[520px] text-center">
          <div className="w-14 h-14 rounded-full bg-success text-white grid place-items-center text-3xl mx-auto mb-5">
            ✓
          </div>
          <h1 className="font-head text-2xl text-ink mb-2">Payment received</h1>
          <p className="text-muted text-sm mb-6">
            Thank you! Your order has been confirmed and is being processed.
            {done.orderNumber && (
              <>
                {' '}Order number{' '}
                <span className="font-mono text-ink">{done.orderNumber}</span>.
              </>
            )}
          </p>
          <Link href="/" className="btn btn-primary inline-block">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-bg-soft min-h-[80vh] py-6 px-[6mm] md:px-[1.5cm]">
      <div className="max-w-[1080px] mx-auto bg-white rounded-xl border border-line shadow-sm overflow-hidden grid md:grid-cols-[360px_1fr] grid-cols-1">
        <aside className="bg-brand text-white p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-md p-2 inline-block">
              <img src="/logo.png" alt="KitchenaryKart" className="h-8 w-auto" />
            </div>
          </div>

          <section className="bg-[#fff7f7] text-ink rounded-lg p-3.5 z-10">
            <h3 className="text-[12px] font-bold tracking-widest uppercase text-ink/70 mb-2">
              Order summary
            </h3>
            <ul className="space-y-3">
              {items.slice(0, 3).map((i) => {
                const qty = i.qty || 1;
                const lineMrp = (i.mrp && i.mrp > i.price ? i.mrp : i.price) * qty;
                const lineNet = i.price * qty;
                return (
                  <li key={i.sku} className="grid grid-cols-[44px_1fr_auto] gap-2.5 items-center">
                    <div className="w-11 h-11 rounded bg-white grid place-items-center overflow-hidden">
                      {i.imageUrl ? (
                        <img
                          src={imgSrc(i.imageUrl)}
                          alt={i.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-sm font-head font-bold text-brand">
                          {letter(i.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] text-ink line-clamp-2 leading-snug">
                        {i.name}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">Qty {qty}</div>
                    </div>
                    <div className="text-right">
                      {lineMrp > lineNet && (
                        <div className="text-[11px] text-muted line-through">
                          {inr(lineMrp)}
                        </div>
                      )}
                      <div className="text-[13px] font-head font-bold text-ink">
                        {inr(lineNet)}
                      </div>
                    </div>
                  </li>
                );
              })}
              {items.length > 3 && (
                <li className="text-[12px] text-muted text-center pt-1">
                  + {items.length - 3} more item{items.length - 3 === 1 ? '' : 's'}
                </li>
              )}
            </ul>
          </section>

          {savings > 0 && (
            <section className="bg-white text-ink rounded-lg p-3.5 flex items-center gap-3 z-10">
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-white grid place-items-center text-sm">
                ✓
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-ink truncate">
                  {inr(savings)} saved on MRP
                </div>
                <div className="text-[11px] text-muted">Discount automatically applied</div>
              </div>
            </section>
          )}

          <svg
            viewBox="0 0 200 160"
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-72 h-auto opacity-30 pointer-events-none"
            aria-hidden="true"
          >
            <rect x="60" y="55" width="80" height="95" rx="6" fill="white" />
            <rect x="40" y="70" width="55" height="80" rx="5" fill="white" opacity="0.8" />
            <rect x="125" y="68" width="60" height="82" rx="5" fill="white" opacity="0.8" />
            <path d="M75 55 v-12 a25 25 0 0 1 50 0 v12" stroke="white" strokeWidth="3" fill="none" />
            <circle cx="155" cy="48" r="11" fill="white" />
            <text x="155" y="53" textAnchor="middle" fill="#A01818" fontSize="13" fontWeight="800">%</text>
          </svg>

          <div className="mt-auto pt-6 text-[11px] text-white/75 z-10">
            Secured by <strong className="text-white">KitchenaryKart</strong>
          </div>
        </aside>

        <div className="p-6 sm:p-8 relative">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-head text-lg font-bold text-ink">Review Order</h2>
            <Link
              href="/"
              aria-label="Close"
              className="w-8 h-8 rounded-full grid place-items-center text-muted hover:bg-bg-soft hover:text-ink text-2xl leading-none"
            >
              ×
            </Link>
          </div>

          <div className="space-y-4">
            <section className="border border-line rounded-lg p-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full grid place-items-center text-brand bg-brand/10 shrink-0">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <div className="flex-1 text-[14px] text-ink font-medium">
                {customer?.phone || customer?.email || '—'}
              </div>
              <span className="text-[12px] text-success font-semibold">logged in</span>
            </section>

            <section className="border border-line rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-ink">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" />
                  </svg>
                  <span className="font-semibold text-[14px]">
                    Deliver to <span className="font-bold">Home</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="text-[13px] text-brand font-semibold hover:underline"
                >
                  {addressFilled ? (editing ? 'Cancel' : 'Add/Change') : 'Add address'}
                </button>
              </div>

              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <input
                    placeholder="Full name"
                    value={address.name}
                    onChange={(e) => setAddress((a) => ({ ...a, name: e.target.value }))}
                    className="px-3 py-2 border border-line rounded text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                  <input
                    placeholder="Phone"
                    value={address.phone}
                    onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                    className="px-3 py-2 border border-line rounded text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                  <input
                    placeholder="Address line"
                    value={address.line1}
                    onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                    className="px-3 py-2 border border-line rounded text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none sm:col-span-2"
                  />
                  <input
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    className="px-3 py-2 border border-line rounded text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                  <input
                    placeholder="State"
                    value={address.state}
                    onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                    className="px-3 py-2 border border-line rounded text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                  <input
                    placeholder="Pincode"
                    value={address.postalCode}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                    className="px-3 py-2 border border-line rounded text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                  {/* B2B GST invoice */}
                  <label className="sm:col-span-2 flex items-start gap-2 text-[13px] text-ink-soft mt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isBusiness}
                      onChange={(e) => setIsBusiness(e.target.checked)}
                      className="mt-0.5 accent-brand"
                    />
                    <span>Buying for a business? Add your <strong>GSTIN</strong> for a GST input-credit (ITC) invoice.</span>
                  </label>
                  {isBusiness && (
                    <input
                      placeholder="GSTIN (e.g. 27AAQPR2976J1ZU)"
                      value={address.gstin || ''}
                      onChange={(e) => setAddress((a) => ({ ...a, gstin: e.target.value.toUpperCase() }))}
                      maxLength={15}
                      className="px-3 py-2 border border-line rounded text-sm font-mono uppercase tracking-wide focus:border-brand focus:ring-1 focus:ring-brand outline-none sm:col-span-2"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      saveAddress(address);
                      setEditing(false);
                    }}
                    className="sm:col-span-2 mt-1 py-2 rounded font-head text-xs font-bold tracking-wider uppercase bg-brand text-white hover:bg-brand-dark transition"
                  >
                    Save address
                  </button>
                </div>
              ) : addressFilled ? (
                <div className="text-[13.5px] text-ink-soft leading-6">
                  <div className="font-bold text-ink">
                    {address.name}
                    {address.phone && ` · ${address.phone}`}
                  </div>
                  {fullAddress(address)}
                </div>
              ) : (
                <div className="text-[13px] text-muted">
                  No address yet. Click <strong>Add address</strong> to set it.
                </div>
              )}
            </section>

            <section className="border border-line rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3 text-ink">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                  <rect x="1" y="3" width="15" height="13"/>
                  <path d="M16 8h4l3 3v5h-7V8z"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <span className="font-semibold text-[14px]">Delivery Options</span>
              </div>
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded border border-brand bg-brand/5 cursor-pointer">
                <span className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full border-[5px] border-brand bg-white shrink-0" />
                  <span>
                    <span className="block text-[14px] font-semibold text-ink">Standard Delivery</span>
                    <span className="block text-[12px] text-muted italic">3–7 business days</span>
                  </span>
                </span>
                {!address.state.trim() ? (
                  <span className="text-[12px] text-muted">Enter state</span>
                ) : shipLoading || shipQuote === null ? (
                  <span className="text-[12px] text-muted">Calculating…</span>
                ) : shipQuote === 0 ? (
                  <span className="text-[12px] font-bold tracking-wider text-success border border-success rounded px-2 py-0.5">
                    FREE
                  </span>
                ) : (
                  <span className="text-[12px] font-bold tracking-wider text-ink border border-line rounded px-2 py-0.5">
                    {inr(shipQuote)}
                  </span>
                )}
              </label>
            </section>

            {/* Coupon */}
            <section className="border border-line rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3 text-ink">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                  <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
                <span className="font-semibold text-[14px]">Have a coupon?</span>
              </div>

              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded border border-success bg-success/5">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-ink font-mono">
                      {appliedCoupon.code}
                    </span>
                    <span className="block text-[12px] text-success">
                      {appliedCoupon.message}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-[12px] font-semibold text-red-600 hover:text-red-700 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                      placeholder="Enter code"
                      className="flex-1 min-w-0 px-3 py-2 border border-line rounded-md text-sm font-mono uppercase focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponBusy || !couponInput.trim()}
                      className="px-4 py-2 rounded-md bg-brand text-white text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
                    >
                      {couponBusy ? '…' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[12px] text-red-600 mt-2">{couponError}</p>
                  )}
                </>
              )}
            </section>

            {/* Price breakdown — GST-compliant ladder, identical labels +
                calculation to the cart / invoice / admin / print. GST is on
                the discounted Net Value; discount line shows only with a
                coupon. */}
            <div className="border-t border-line pt-3 space-y-1.5 text-[13.5px]">
              <div className="flex justify-between text-ink-soft">
                <span>Excluding GST Price (Net Price)</span>
                <span>{inr(summary.netPrice)}</span>
              </div>
              {summary.discountPct > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Discount ({summary.discountPct}%)</span>
                  <span>−{inr(summary.discountAmount)}</span>
                </div>
              )}
              {summary.discountPct > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <span>Net Value</span>
                  <span>{inr(summary.netValue)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-soft">
                <span>Shipping Fee{shipKnown && summary.shipping === 0 ? ' (Free)' : ''}</span>
                <span>{shipKnown ? inr(summary.shipping) : <span className="text-muted text-xs">enter state</span>}</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>GST ({summary.gstRateLabel})</span>
                <span>{inr(summary.gstAmount)}</span>
              </div>
              {summary.roundOff !== 0 && (
                <div className="flex justify-between text-ink-soft">
                  <span>Round Off</span>
                  <span>{summary.roundOff > 0 ? '+ ' : '− '}{inr(Math.abs(summary.roundOff))}</span>
                </div>
              )}
              <div className="flex justify-between text-ink font-head font-bold text-base pt-1 border-t border-line">
                <span>Net Payable Amount</span>
                <span>{inr(summary.netPayable)}</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="w-4 h-4 accent-brand"
              />
              <span>Send me offers and order updates</span>
            </label>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={placeOrder}
              disabled={submitting || (addressFilled && shipLoading)}
              className="w-full py-4 rounded-md bg-brand text-white font-head font-bold tracking-wider uppercase text-sm hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {submitting
                ? 'Opening payment…'
                : addressFilled && shipLoading
                  ? 'Calculating delivery…'
                  : `Pay Now · ${inr(summary.netPayable)}${count ? `  (${count} ${count === 1 ? 'item' : 'items'})` : ''}`}
            </button>

            <p className="text-center text-[11px] text-muted">
              ✓ Secure payment via Razorpay · KitchenaryKart Trust
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
