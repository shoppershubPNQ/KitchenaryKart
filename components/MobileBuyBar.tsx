'use client';

/**
 * Sticky mobile-only buy bar for the PDP.
 *
 * On phones the in-page Add-to-Cart / Buy-Now buttons sit far below the fold
 * (after price → trust badges → variants → specs), so the CTA is easy to lose.
 * This bar pins price + actions to the bottom of the screen and shows ONLY
 * while the real in-page buy box (id `pdp-buybox`) is scrolled out of view —
 * so there's no redundant double-CTA when both are visible.
 *
 * Mirrors AddToInquiryButton's behaviour: auth-gated actions, out-of-stock
 * lockout, and "Buy Now" → /checkout.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart } from '@/lib/cart';
import { openAuth, useAuth } from '@/lib/useAuth';
import { inr } from '@/lib/format';

interface Props {
  cartItem: {
    sku: string;
    name: string;
    price: number;
    mrp?: number | null;
    taxPercent?: number | null;
    imageUrl?: string | null;
    category?: string | null;
  };
  /** Effective stock of the selected variant/parent. <= 0 → locked. */
  stock?: number;
  /** id of the in-page buy box to observe (bar shows when it's off-screen). */
  anchorId?: string;
}

export function MobileBuyBar({ cartItem, stock, anchorId = 'pdp-buybox' }: Props) {
  const { loggedIn } = useAuth();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const outOfStock = typeof stock === 'number' && stock <= 0;

  useEffect(() => {
    const el = document.getElementById(anchorId);
    if (!el) {
      setShow(true); // anchor missing → always show so the CTA is never lost
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { rootMargin: '0px 0px -30% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [anchorId]);

  function gated(action: () => void) {
    if (loggedIn) action();
    else openAuth({ onSuccess: action });
  }

  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-3 pt-2.5 transition-transform duration-200 ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-stretch gap-2.5">
        <div className="shrink-0 self-center leading-none">
          <div className="text-[10px] text-muted mb-0.5">Price</div>
          <div className="font-head font-bold text-ink text-[16px]">{inr(cartItem.price)}</div>
        </div>
        {outOfStock ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="btn btn-outline flex-1 whitespace-nowrap !px-3 opacity-60 cursor-not-allowed"
          >
            Out of Stock
          </button>
        ) : (
          <>
            {/* whitespace-nowrap + tighter padding: .btn's px-6 made "ADD TO CART"
                wrap to two lines on narrow phones, so it was taller than "BUY NOW".
                items-stretch + nowrap keeps both buttons one line and equal height. */}
            <button
              type="button"
              onClick={() => gated(() => addToCart(cartItem))}
              className="btn btn-outline flex-1 whitespace-nowrap !px-3"
            >
              Add to Cart
            </button>
            <button
              type="button"
              onClick={() =>
                gated(() => {
                  addToCart(cartItem);
                  router.push('/checkout');
                })
              }
              className="btn btn-primary flex-1 whitespace-nowrap !px-3"
            >
              Buy Now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
