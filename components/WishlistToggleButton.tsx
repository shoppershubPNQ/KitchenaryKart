'use client';

/**
 * Standalone heart toggle used on the product detail page. Clicking it adds
 * the product to the wishlist or removes it; the icon fills when saved and
 * the label reflects the current state.
 *
 * The heart svg re-mounts on every click (key={tick}) so the
 * kk-heart-pop CSS keyframe always re-fires — without the re-key,
 * the animation would only play once per page load.
 */
import { useState } from 'react';
import { toggleWishlist, useIsInWishlist } from '@/lib/wishlist';
import type { PublicProduct } from '@/lib/products';

export function WishlistToggleButton({ product: p }: { product: PublicProduct }) {
  const saved = useIsInWishlist(p.sku);
  const [tick, setTick] = useState(0);
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => {
        toggleWishlist({
          sku: p.sku,
          name: p.name,
          price: p.price,
          imageUrl: p.imageUrl,
          category: p.category,
        });
        setTick((t) => t + 1);
      }}
      className={`btn flex-none inline-flex items-center gap-2 border-2 transition ${
        saved
          ? 'bg-brand/10 text-brand border-brand hover:bg-brand hover:text-white'
          : 'bg-white text-ink border-line hover:border-brand hover:text-brand'
      }`}
      title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <svg
        key={tick}
        className={tick > 0 ? 'kk-heart-pop' : ''}
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span>{saved ? 'Saved' : 'Wishlist'}</span>
    </button>
  );
}
