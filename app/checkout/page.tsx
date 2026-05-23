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

interface Address {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
const ADDR_KEY = 'kk_checkout_address';

function loadAddress(fallback: Partial<Address> = {}): Address {
  const empty: Address = { name: '', phone: '', line1: '', city: '', state: '', postalCode: '' };
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
  const [editing, setEditing] = useState(false);
  const [marketing, setMarketing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id?: number; orderNumber?: string } | null>(null);

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
  const youPay = total;
  const savings = Math.max(subtotal - youPay, 0);

  function fullAddress(a: Address): string {
    return [a.line1, a.city, a.state, a.postalCode].filter(Boolean).join(', ');
  }
  const addressFilled = !!(address.line1 && address.city && address.postalCode);

  async function placeOrder() {
    setError(null);
    if (!customer) {
      openAuth({});
      return;
    }
    if (!addressFilled) {
      setEditing(true);
      setError('Please complete your delivery address.');
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
          customerName: address.name || customer.name,
          customerEmail: customer.email || '',
          customerPhone: address.phone || customer.phone || '',
          shippingAddress: `${address.name} · ${address.phone}\n${fullAddress(address)}`,
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
                total: items.reduce((s, i) => s + i.price * i.qty, 0),
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
                          alt=""
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

        <main className="p-6 sm:p-8 relative">
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
                    <span className="block text-[12px] text-muted italic">5–7 business days</span>
                  </span>
                </span>
                <span className="text-[12px] font-bold tracking-wider text-success border border-success rounded px-2 py-0.5">
                  FREE
                </span>
              </label>
            </section>

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
              disabled={submitting}
              className="w-full py-4 rounded-md bg-ink text-white font-head font-bold tracking-wider uppercase text-sm hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {submitting
                ? 'Opening payment…'
                : `Pay Now · ${inr(youPay)}${count ? `  (${count} ${count === 1 ? 'item' : 'items'})` : ''}`}
            </button>

            <p className="text-center text-[11px] text-muted">
              ✓ Secure payment via Razorpay · KitchenaryKart Trust
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
