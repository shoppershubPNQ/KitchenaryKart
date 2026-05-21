'use client';

/**
 * "Write a review" entry point on the PDP. Three states:
 *   1. Not signed in → button opens the AuthModal
 *   2. Signed in but never bought this SKU → muted helper text
 *   3. Signed in + verified buyer → opens ReviewWriteModal
 *
 * Eligibility is checked lazily via /api/reviews/eligibility?sku=...
 * so the PDP doesn't need to know auth state at SSR time (would also
 * defeat ISR caching).
 */
import { useEffect, useState } from 'react';
import { openAuth, useAuth } from '@/lib/useAuth';
import { ReviewWriteModal } from './ReviewWriteModal';

interface Props {
  productSku: string;
  productName: string;
}

interface Eligibility {
  eligible: boolean;
  orderNumber?: string;
  existing?: { rating: number; title: string | null; body: string };
}

export function ReviewWriteCTA({ productSku, productName }: Props) {
  const { loggedIn } = useAuth();
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!loggedIn) {
      setEligibility(null);
      return;
    }
    fetch(`/api/reviews/eligibility?sku=${encodeURIComponent(productSku)}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setEligibility(data);
      })
      .catch(() => {
        // ignore; CTA just stays muted
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, productSku]);

  if (!loggedIn) {
    return (
      <button
        type="button"
        onClick={() => openAuth()}
        className="w-full px-4 py-2.5 rounded-md bg-brand text-white text-sm font-semibold hover:opacity-90 transition"
      >
        Sign in to write a review
      </button>
    );
  }

  if (!eligibility) {
    return (
      <div className="text-xs text-muted text-center py-2">Checking eligibility…</div>
    );
  }

  if (!eligibility.eligible) {
    return (
      <div className="text-xs text-muted text-center py-2">
        Only verified buyers can leave reviews. Place an order to share your experience.
      </div>
    );
  }

  const isEdit = !!eligibility.existing;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full px-4 py-2.5 rounded-md bg-brand text-white text-sm font-semibold hover:opacity-90 transition"
      >
        {isEdit ? 'Edit your review' : 'Write a review'}
      </button>
      {open && (
        <ReviewWriteModal
          productSku={productSku}
          productName={productName}
          existing={eligibility.existing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            // Refresh the page so the new review shows in the list +
            // the summary updates.
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
