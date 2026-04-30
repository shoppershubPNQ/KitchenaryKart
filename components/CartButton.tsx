'use client';

import { openDrawer, useCart } from '@/lib/cart';

export function CartButton() {
  const { count } = useCart();
  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label="Inquiry list"
      className="relative inline-flex items-center justify-center w-11 h-11 rounded-full text-ink hover:bg-bg-soft hover:text-brand transition"
    >
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-bold grid place-items-center border-2 border-white">
          {count}
        </span>
      )}
    </button>
  );
}
