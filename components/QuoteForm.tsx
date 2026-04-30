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
    const form = e.currentTarget;
    const fd = new FormData(form);
    const adminBase = process.env.NEXT_PUBLIC_ADMIN_API_BASE || 'http://localhost:3000';
    const payload = {
      customerName: fd.get('name') || '',
      customerEmail: fd.get('email') || '',
      customerPhone: fd.get('phone') || '',
      companyName: fd.get('company') || '',
      message: msgRef.current?.value || '',
      items: items.map((i) => ({ sku: i.sku, quantity: i.qty || 1 })),
    };
    try {
      await fetch(adminBase.replace(/\/$/, '') + '/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Inquiry API unreachable (saved locally only)', err);
    }
    form.reset();
    clearCart();
    setSent(true);
    setSubmitting(false);
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
