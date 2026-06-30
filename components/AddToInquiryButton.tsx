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
  /** When the PDP URL is a specific variant, the exact payload to add to the
   *  cart (variant sku / price / mrp / image). Without this the buttons would
   *  add the PARENT product — so the customer sees the variant price on the
   *  page but a different (parent) price in the cart. Falls back to the
   *  parent product when no variant is selected. */
  cartItem?: {
    sku: string;
    name: string;
    price: number;
    mrp?: number | null;
    taxPercent?: number | null;
    imageUrl?: string | null;
    category?: string | null;
  };
  /** Render only the primary "Add to Cart" button (used where the layout
   *  supplies its own secondary action). */
  onlyPrimary?: boolean;
  /** Effective stock of the selected variant (or the parent when no variant
   *  is chosen). When <= 0 the buy buttons are replaced with a disabled
   *  "Out of Stock" state so an unavailable item can't be added to the cart.
   *  Undefined = unknown → behave as in-stock (backwards compatible). */
  stock?: number;
}

export function AddToInquiryButton({ product, cartItem, onlyPrimary, stock }: Props) {
  const { loggedIn } = useAuth();
  // Add the selected variant when supplied; otherwise the parent product.
  const payload = cartItem ?? product;
  const outOfStock = typeof stock === 'number' && stock <= 0;
  function gated(action: () => void) {
    if (loggedIn) action();
    else openAuth({ onSuccess: action });
  }

  // Out of stock — block the purchase entirely (no cart add). The server
  // also re-checks stock at checkout, but this stops it at the source.
  if (outOfStock) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="btn btn-outline flex-1 opacity-60 cursor-not-allowed"
      >
        Out of Stock
      </button>
    );
  }

  if (onlyPrimary) {
    return (
      <button
        type="button"
        onClick={() => gated(() => addToCart(payload))}
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
        onClick={() => gated(() => addToCart(payload))}
        className="btn btn-outline flex-1"
      >
        Add to Cart
      </button>
      <button
        type="button"
        onClick={() =>
          gated(() => {
            addToCart(payload);
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
