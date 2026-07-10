'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { openDrawer, useCart } from '@/lib/cart';
import { openAuth, useAuth } from '@/lib/useAuth';
import { openWishlist, useWishlist } from '@/lib/wishlist';

/**
 * Right-hand icon rail: account · wishlist · cart.
 * Profile icon opens the auth modal when signed out, or a small menu
 * (name, Account link, Logout) when signed in.
 */
export function HeaderActions() {
  const { count } = useCart();
  const { count: wlCount } = useWishlist();
  const { customer, loggedIn, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-1">
      {/* Account — desktop only; on mobile, sign-in lives in the hamburger menu */}
      <div ref={wrapRef} className="relative hidden md:block">
        <button
          type="button"
          onClick={() => {
            if (loggedIn) setMenuOpen((o) => !o);
            else openAuth();
          }}
          aria-label={loggedIn ? 'Account menu' : 'Login'}
          className="w-11 h-11 rounded-full grid place-items-center text-ink hover:bg-bg-soft hover:text-brand transition"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

        {loggedIn && menuOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] w-[220px] bg-white border border-line rounded-md shadow-lg py-1 z-[150]">
            <div className="px-4 py-2 border-b border-line">
              <div className="text-[13px] font-semibold text-ink truncate">{customer?.name}</div>
              <div className="text-[11px] text-muted truncate">{customer?.phone || customer?.email}</div>
            </div>
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-sm text-ink hover:bg-bg-soft hover:text-brand"
            >
              My Account
            </Link>
            <Link
              href="/account/orders"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-sm text-ink hover:bg-bg-soft hover:text-brand"
            >
              My Orders
            </Link>
            <button
              type="button"
              onClick={async () => {
                setMenuOpen(false);
                await logout();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-ink hover:bg-bg-soft hover:text-brand"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={openWishlist}
        aria-label="Wishlist"
        className="relative w-11 h-11 rounded-full grid place-items-center text-ink hover:bg-bg-soft hover:text-brand transition"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <CountBadge n={wlCount} />
      </button>

      <button
        type="button"
        onClick={openDrawer}
        aria-label="Inquiry list"
        className="relative w-11 h-11 rounded-full grid place-items-center text-ink hover:bg-bg-soft hover:text-brand transition"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <CountBadge n={count} dark />
      </button>
    </div>
  );
}

function CountBadge({ n, dark = false }: { n: number; dark?: boolean }) {
  if (n <= 0) return null;
  return (
    <span className={`absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[11px] font-bold border-2 border-white ${dark ? 'bg-ink text-white' : 'bg-brand text-white'}`}>
      {n}
    </span>
  );
}
