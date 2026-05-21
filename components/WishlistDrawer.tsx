'use client';

/**
 * Wishlist slide-in drawer. Mounts once in the root layout, listens for the
 * `kk:open-wishlist` event. Each row has a "move to inquiry" primary action
 * (adds to the inquiry cart and removes from wishlist) plus a remove button.
 */
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { imgSrc, inr, letter } from '@/lib/format';
import { addToCart, openDrawer } from '@/lib/cart';
import {
  WL_OPEN_EVT,
  removeFromWishlist,
  useWishlist,
} from '@/lib/wishlist';

export function WishlistDrawer() {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const { items } = useWishlist();

  // Clear the "Are you sure?" prompt whenever the drawer is closed or
  // emptied — otherwise it can persist into a future open with no items.
  useEffect(() => {
    if (!open || items.length === 0) setConfirmClear(false);
  }, [open, items.length]);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener(WL_OPEN_EVT, openHandler);
    return () => window.removeEventListener(WL_OPEN_EVT, openHandler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/40 z-[200] transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`fixed top-0 right-0 h-screen w-[400px] max-w-full bg-white shadow-lg z-[201] flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center px-6 py-5 border-b border-line">
          <h2 className="font-head text-lg font-bold flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Your wishlist
            {items.length > 0 && <span className="text-muted font-normal text-sm">({items.length})</span>}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-full grid place-items-center text-2xl text-muted hover:bg-bg-soft hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {items.length === 0 ? (
            <div className="py-14 text-center text-muted text-sm">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.6" className="mx-auto mb-4 text-line">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <p className="font-head font-semibold text-ink">Your wishlist is empty.</p>
              <p className="mt-1">Tap the heart icon on any product to save it for later.</p>
              <Link
                href="/shop"
                onClick={() => setOpen(false)}
                className="inline-block mt-5 px-5 py-2.5 rounded bg-brand text-white font-head text-xs font-bold tracking-wider uppercase hover:bg-brand-dark transition"
              >
                Browse catalog
              </Link>
            </div>
          ) : (
            items.map((i) => (
              <div
                key={i.sku}
                className="grid grid-cols-[56px_1fr_auto] gap-3.5 py-3.5 border-b border-line items-center"
              >
                <Link
                  href={`/product/${encodeURIComponent(i.sku)}`}
                  onClick={() => setOpen(false)}
                  className="relative w-14 h-14 rounded bg-cream overflow-hidden grid place-items-center font-head font-bold text-brand"
                >
                  {i.imageUrl ? (
                    <Image
                      src={imgSrc(i.imageUrl)}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  ) : (
                    letter(i.name)
                  )}
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/product/${encodeURIComponent(i.sku)}`}
                    onClick={() => setOpen(false)}
                    className="block text-[13.5px] text-ink hover:text-brand line-clamp-2 leading-snug"
                  >
                    {i.name}
                  </Link>
                  <div className="text-[11.5px] text-muted mt-0.5">{i.sku}</div>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="font-bold text-[14px] text-ink">{inr(i.price)}</span>
                    {i.mrp && i.mrp > i.price && (
                      <span className="text-[11px] text-muted line-through">{inr(i.mrp)}</span>
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
                      setOpen(false);
                      openDrawer();
                    }}
                    className="text-[11.5px] font-head font-bold tracking-wider uppercase text-brand hover:underline mt-1"
                  >
                    Move to cart →
                  </button>
                </div>
                <button
                  onClick={() => removeFromWishlist(i.sku)}
                  title="Remove"
                  aria-label="Remove from wishlist"
                  className="w-7 h-7 rounded-full grid place-items-center text-muted text-lg hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line bg-bg-soft">
            {confirmClear ? (
              // Inline confirmation strip — replaces the native confirm()
              // dialog so users don't get pulled out of the drawer flow.
              <div className="px-6 py-4 flex items-center justify-between gap-3">
                <span className="text-xs text-ink font-medium">Clear all items?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="text-xs font-semibold text-muted hover:text-ink px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Remove one by one so the event fires and the list updates.
                      for (const i of items) removeFromWishlist(i.sku);
                      setConfirmClear(false);
                    }}
                    className="text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded px-3 py-1.5"
                  >
                    Remove all
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Link
                    href="/wishlist"
                    onClick={() => setOpen(false)}
                    className="text-[12px] font-head font-bold tracking-wider uppercase text-brand hover:underline"
                  >
                    View full page
                  </Link>
                  <span className="text-muted text-[11px]">·</span>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="text-[12px] font-head font-bold tracking-wider uppercase text-muted hover:text-red-600 transition"
                  >
                    Clear all
                  </button>
                </div>
                <Link
                  href="/shop"
                  onClick={() => setOpen(false)}
                  className="btn-small btn-small-primary inline-flex items-center justify-center"
                >
                  Continue shopping
                </Link>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
