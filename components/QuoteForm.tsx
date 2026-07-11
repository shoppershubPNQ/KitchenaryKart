'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clearCart, useCart } from '@/lib/cart';

function Inner() {
  const params = useSearchParams();
  const skuParam = params.get('sku');
  const { items } = useCart();
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!msgRef.current) return;
    if (msgRef.current.value) return; // don't overwrite user input
    if (items.length > 0) {
      const lines = items.map((i) => `- ${i.name} (${i.sku}) × ${i.qty || 1}`).join('\n');
      msgRef.current.value = `I'd like a quote for the following products:\n\n${lines}\n\nPlease include bulk pricing, lead time and shipping terms.`;
    } else if (skuParam) {
      msgRef.current.value = `I'd like a quote for SKU: ${skuParam}\n\nPlease include bulk pricing, lead time and shipping terms.`;
    }
  }, [items, skuParam]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFailed(false);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      customerName: fd.get('name') || '',
      customerEmail: fd.get('email') || '',
      customerPhone: fd.get('phone') || '',
      companyName: fd.get('company') || '',
      message: msgRef.current?.value || '',
      items: items.map((i) => ({ sku: i.sku, quantity: i.qty || 1 })),
    };
    // Same-origin request; next.config rewrites /admin-api/* to the admin API
    // server-side, so this no longer depends on a public localhost fallback.
    let succeeded = false;
    try {
      const res = await fetch('/admin-api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      succeeded = res.ok;
      if (!res.ok) console.error('Inquiry submit failed with status', res.status);
    } catch (err) {
      console.error('Inquiry API unreachable', err);
    }
    setSubmitting(false);
    if (!succeeded) {
      // Don't fake success or wipe the cart — let the customer retry.
      setFailed(true);
      return;
    }
    form.reset();
    clearCart();
    setSent(true);
    setTimeout(() => successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  return (
    <form onSubmit={submit} className="bg-white border border-line rounded-lg p-8 shadow-sm grid gap-4">
      <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="form-label">Your name</label>
          <input type="text" id="name" name="name" required className="form-input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company" className="form-label">Company / Organisation</label>
          <input type="text" id="company" name="company" className="form-input" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="form-label">Email</label>
          <input type="email" id="email" name="email" required className="form-input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="form-label">Phone</label>
          <input type="tel" id="phone" name="phone" className="form-input" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="form-label">Your requirements</label>
        <textarea
          ref={msgRef}
          id="message"
          name="message"
          rows={8}
          placeholder="Tell us which SKUs, quantities, delivery location, timeline, and any special requirements."
          className="form-input resize-y min-h-[120px]"
        />
      </div>
      <div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send quote request'}
        </button>
      </div>
      {sent && (
        <div
          ref={successRef}
          className="bg-green-50 text-green-900 border border-green-200 px-4 py-3 rounded text-sm"
        >
          ✓ Thanks! Your quote request has been captured. We will reply within 4 business hours.
          For urgent queries, call +91 98903 52455.
        </div>
      )}
      {failed && (
        <div className="bg-red-50 text-red-900 border border-red-200 px-4 py-3 rounded text-sm">
          Sorry, we couldn&apos;t send your request just now. Please try again, or reach us
          directly on +91 98903 52455 or support@kitchenarykart.com.
        </div>
      )}
    </form>
  );
}

export function QuoteForm() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
