'use client';

/**
 * Client-side wishlist backed by localStorage. Mirrors the shape of `lib/cart`
 * but is a separate list (heart icon, not bag icon). Emits `kk:wishlist-changed`
 * so anything rendering the count or list can refresh.
 *
 * Anonymous-first: survives across pages without requiring a login. When a
 * customer signs in we could sync this list to the server, but for now it
 * stays local.
 */
import { useEffect, useState } from 'react';

export const STORE_KEY = 'kk_wishlist';
export const WL_EVT = 'kk:wishlist-changed';
export const WL_OPEN_EVT = 'kk:open-wishlist';

export interface WishlistItem {
  sku: string;
  name: string;
  price: number;
  mrp: number | null;
  imageUrl: string | null;
  category: string | null;
}

function read(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

function write(items: WishlistItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(WL_EVT));
}

export function isInWishlist(sku: string): boolean {
  return !!read().find((i) => i.sku === sku);
}

export function addToWishlist(p: {
  sku: string;
  name: string;
  price: number;
  mrp?: number | null;
  imageUrl?: string | null;
  category?: string | null;
}) {
  const items = read();
  if (items.find((i) => i.sku === p.sku)) return;
  items.unshift({
    sku: p.sku,
    name: p.name,
    price: p.price,
    mrp: p.mrp ?? null,
    imageUrl: p.imageUrl ?? null,
    category: p.category ?? null,
  });
  write(items);
  showToast('Saved to wishlist');
}

export function removeFromWishlist(sku: string) {
  write(read().filter((i) => i.sku !== sku));
}

export function toggleWishlist(p: {
  sku: string;
  name: string;
  price: number;
  mrp?: number | null;
  imageUrl?: string | null;
  category?: string | null;
}): boolean {
  if (isInWishlist(p.sku)) {
    removeFromWishlist(p.sku);
    return false;
  }
  addToWishlist(p);
  return true;
}

export function clearWishlist() {
  write([]);
}

export function openWishlist() {
  window.dispatchEvent(new CustomEvent(WL_OPEN_EVT));
}

/**
 * Read the wishlist from localStorage. Starts as [] so SSR + first
 * client render match (no localStorage on the server), then the
 * effect populates the real value. Components that need to wait for
 * the real data can check the `ready` flag.
 */
export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setItems(read());
    setReady(true);
    const h = () => setItems(read());
    window.addEventListener(WL_EVT, h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener(WL_EVT, h);
      window.removeEventListener('storage', h);
    };
  }, []);
  const count = items.length;
  return { items, count, ready };
}

export function useIsInWishlist(sku: string): boolean {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    setFlag(isInWishlist(sku));
    const h = () => setFlag(isInWishlist(sku));
    window.addEventListener(WL_EVT, h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener(WL_EVT, h);
      window.removeEventListener('storage', h);
    };
  }, [sku]);
  return flag;
}

function showToast(msg: string) {
  if (typeof document === 'undefined') return;
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout((t as any)._t);
  (t as any)._t = setTimeout(() => (t!.style.opacity = '0'), 1800);
}
