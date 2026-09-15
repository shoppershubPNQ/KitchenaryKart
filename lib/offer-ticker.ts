import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

/**
 * Offer ticker — the scrolling red strip under the home hero. Edited in the
 * admin (Content → Offer ticker), stored as one JSON settings row
 * `offer_ticker`: { enabled, speed, items: [{ text, href }] }.
 */
export type OfferTickerSpeed = 'slow' | 'normal' | 'fast';
export interface OfferTickerItem {
  text: string;
  href: string | null;
}
export interface OfferTickerData {
  speed: OfferTickerSpeed;
  items: OfferTickerItem[];
}

const SPEEDS: OfferTickerSpeed[] = ['slow', 'normal', 'fast'];

/** Null when switched off, empty, or unreadable — the strip then just isn't rendered. */
async function _getOfferTicker(): Promise<OfferTickerData | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'offer_ticker' } });
    if (!row?.value) return null;
    const v = JSON.parse(row.value) as { enabled?: unknown; speed?: unknown; items?: unknown };
    if (v.enabled !== true || !Array.isArray(v.items)) return null;
    const items = v.items
      .map((i) => {
        const it = (i ?? {}) as { text?: unknown; href?: unknown };
        const text = typeof it.text === 'string' ? it.text.trim().slice(0, 140) : '';
        const href =
          typeof it.href === 'string' && (it.href.startsWith('/') || /^https?:\/\//i.test(it.href)) ? it.href : null;
        return { text, href };
      })
      .filter((i) => i.text);
    if (items.length === 0) return null;
    const speed = SPEEDS.includes(v.speed as OfferTickerSpeed) ? (v.speed as OfferTickerSpeed) : 'normal';
    return { speed, items };
  } catch {
    // The strip is decoration — never let it break the home page.
    return null;
  }
}

/** 5-min cache; the admin busts it on save via /api/revalidate?tag=offer-ticker. */
export const getOfferTicker = unstable_cache(_getOfferTicker, ['kk:offer-ticker'], {
  revalidate: 300,
  tags: ['offer-ticker'],
});
