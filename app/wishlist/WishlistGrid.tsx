'use client';

/**
 * Full-page wishlist grid. Reads from the same localStorage-backed
 * useWishlist() hook that powers the drawer, so adds/removes from
 * anywhere reflect here instantly. Includes a "ready" flag to avoid
 * the empty-state flash during the initial localStorage read.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { imgSrc, inr, letter } from '@/lib/format';
import { addToCart, openDrawer } from '@/lib/cart';
import { moveAllToCart, removeFromWishlist, useWishlist } from '@/lib/wishlist';

export function WishlistGrid() {
  const { items, count } = useWishlist();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    // First render must match SSR (no localStorage on the server) to avoid
    // a hydration mismatch. Show a skeleton until the client takes over.
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-bg-soft animate-pulse" />
        ))}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="bg-bg-soft rounded-lg p-12 text-center">
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mx-auto mb-4 text-line"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <p className="font-head font-semibold text-ink">Nothing saved yet.</p>
        <p className="text-muted text-sm mt-1">
          Tap the heart on any product card to save it for later.
        </p>
        <Link
          href="/shop"
          className="inline-block mt-5 px-6 py-2.5 bg-brand text-white rounded-md font-semibold text-sm hover:opacity-90"
        >
          Browse the catalog
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.price, 0);

  return (
    <>
      {/* Action bar — subtotal + move-all primary action */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-bg-soft rounded-lg px-4 py-3">
        <div className="text-sm">
          <span className="font-semibold text-ink">{count} item{count === 1 ? '' : 's'}</span>
          <span className="text-muted"> · {inr(subtotal)} total</span>
        </div>
        <button
          type="button"
          onClick={() => moveAllToCart()}
          className="px-5 py-2 rounded-md bg-brand text-white font-head text-xs font-bold tracking-wider uppercase hover:opacity-90 transition"
        >
          Move all to cart →
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
        {items.map((i) => {
        const save =
          i.mrp && i.mrp > i.price
            ? Math.round(((i.mrp - i.price) / i.mrp) * 100)
            : 0;
        return (
          <div
            key={i.sku}
            className="group relative bg-white border border-line rounded-lg overflow-hidden hover:border-brand hover:shadow-sm transition"
          >
            <button
              type="button"
              onClick={() => removeFromWishlist(i.sku)}
              aria-label="Remove from wishlist"
              title="Remove"
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/95 grid place-items-center text-muted hover:bg-red-50 hover:text-red-600 shadow-sm border border-line"
            >
              ×
            </button>
            <Link
              href={`/product/${encodeURIComponent(i.sku)}`}
              className="block relative aspect-square bg-cream grid place-items-center overflow-hidden"
            >
              {i.imageUrl ? (
                <Image
                  src={imgSrc(i.imageUrl)}
                  alt={i.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 240px"
                  className="object-contain p-3"
                />
              ) : (
                <span className="text-5xl font-head font-black text-brand/40">
                  {letter(i.name)}
                </span>
              )}
            </Link>
            <div className="p-3">
              <Link
                href={`/product/${encodeURIComponent(i.sku)}`}
                className="block text-sm text-ink hover:text-brand line-clamp-2 leading-snug min-h-[2.7em] font-medium"
              >
                {i.name}
              </Link>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-head font-bold text-ink">{inr(i.price)}</span>
                {i.mrp && i.mrp > i.price && (
                  <span className="text-xs text-muted line-through">{inr(i.mrp)}</span>
                )}
                {save > 0 && (
                  <span className="text-[11px] font-bold text-success">SAVE {save}%</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  addToCart({
                    sku: i.sku,
                    name: i.name,
                    price: i.price,
                    mrp: i.mrp,
                    imageUrl: i.imageUrl,
                    category: i.category,
                  });
                  removeFromWishlist(i.sku);
                  openDrawer();
                }}
                className="mt-3 w-full px-3 py-2 rounded text-xs font-head font-bold tracking-wider uppercase bg-brand text-white hover:opacity-90 transition"
              >
                Move to cart
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </>
  );
}
