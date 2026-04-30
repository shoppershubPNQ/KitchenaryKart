'use client';

/**
 * Product-detail CTA buttons: [Add to Cart] [Buy Now].
 * Both are auth-gated — if the user isn't signed in, the auth modal opens
 * and the cart action is queued to fire after a successful login.
 */
import { addToCart, openDrawer } from '@/lib/cart';
import { openAuth, useAuth } from '@/lib/useAuth';
import type { PublicProduct } from '@/lib/products';

interface Props {
  product: PublicProduct;
  /** Render only the primary "Add to Cart" button (used where the layout
   *  supplies its own secondary action). */
  onlyPrimary?: boolean;
}

export function AddToInquiryButton({ product, onlyPrimary }: Props) {
  const { loggedIn } = useAuth();
  function gated(action: () => void) {
    if (loggedIn) action();
    else openAuth({ onSuccess: action });
  }

  if (onlyPrimary) {
    return (
      <button
        type="button"
        onClick={() => gated(() => addToCart(product))}
        className="btn btn-primary flex-1"
      >
        Add to Cart
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => gated(() => addToCart(product))}
        className="btn btn-outline flex-1"
      >
        Add to Cart
      </button>
      <button
        type="button"
        onClick={() =>
          gated(() => {
            addToCart(product);
            openDrawer();
          })
        }
        className="btn btn-primary flex-1"
      >
        Buy Now
      </button>
    </>
  );
}
