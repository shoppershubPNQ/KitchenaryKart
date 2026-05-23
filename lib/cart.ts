'use client';

/**
 * Client-side inquiry list backed by localStorage. Emits a `kk:cart-changed`
 * window event so any listening component can refresh.
 */
import { useEffect, useState } from 'react';
import { trackAddToCart } from './analytics';

export const STORE_KEY = 'kk_inquiry_cart';
export const CART_EVT = 'kk:cart-changed';

export interface CartItem {
  sku: string;
  name: string;
  /** Selling price (what the customer actually pays per unit). */
  price: number;
  /** Catalog MRP before discount, when the product has one. */
  mrp: number | null;
  imageUrl: string | null;
  category: string | null;
  qty: number;
}

function read(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVT));
}

export function addToCart(p: {
  sku: string;
  name: string;
  price: number;
  mrp?: number | null;
  imageUrl?: string | null;
  category?: string | null;
}) {
  const items = read();
  const found = items.find((i) => i.sku === p.sku);
  if (found) {
    found.qty = (found.qty || 1) + 1;
    // Refresh price/mrp in case the catalog changed since it was added.
    found.price = p.price;
    found.mrp = p.mrp ?? null;
  } else {
    items.push({
      sku: p.sku,
      name: p.name,
      price: p.price,
      mrp: p.mrp ?? null,
      imageUrl: p.imageUrl ?? null,
      category: p.category ?? null,
      qty: 1,
    });
  }
  write(items);
  showToast('Added to cart');
  trackAddToCart({
    sku: p.sku,
    name: p.name,
    price: p.price,
    category: p.category,
    quantity: 1,
  });
}

export function removeFromCart(sku: string) {
  write(read().filter((i) => i.sku !== sku));
}

export function setQty(sku: string, qty: number) {
  const items = read();
  const item = items.find((i) => i.sku === sku);
  if (!item) return;
  if (qty <= 0) {
    write(items.filter((i) => i.sku !== sku));
    return;
  }
  item.qty = qty;
  write(items);
}

export function increaseQty(sku: string) {
  const items = read();
  const item = items.find((i) => i.sku === sku);
  if (!item) return;
  item.qty = (item.qty || 1) + 1;
  write(items);
}

export function decreaseQty(sku: string) {
  const items = read();
  const item = items.find((i) => i.sku === sku);
  if (!item) return;
  const next = (item.qty || 1) - 1;
  if (next <= 0) {
    write(items.filter((i) => i.sku !== sku));
  } else {
    item.qty = next;
    write(items);
  }
}

export function clearCart() {
  write([]);
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    setItems(read());
    const h = () => setItems(read());
    window.addEventListener(CART_EVT, h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener(CART_EVT, h);
      window.removeEventListener('storage', h);
    };
  }, []);
  const count = items.reduce((s, i) => s + (i.qty || 1), 0);
  const total = items.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  return { items, count, total };
}

export function openDrawer() {
  window.dispatchEvent(new CustomEvent('kk:open-drawer'));
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
