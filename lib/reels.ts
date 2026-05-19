import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

/**
 * Public-facing reel shape consumed by the WatchAndShop component.
 * Joined with the linked product (when productSku is set) so the card can
 * render the small product row underneath without a second round-trip.
 */
export interface PublicReel {
  id: number;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  productSku: string | null;
  viewCount: number;
  product: {
    sku: string;
    name: string;
    price: number;
    imageUrl: string | null;
  } | null;
}

async function _getActiveReels(): Promise<PublicReel[]> {
  const rows = await prisma.reel.findMany({
    where: { isActive: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    take: 8, // home page only renders the first 4 — fetch a few extra so
             // hiding one in admin doesn't immediately empty a slot before
             // the next ISR cycle.
  });
  if (rows.length === 0) return [];

  const skus = rows.map((r) => r.productSku).filter((s): s is string => !!s);
  const products = skus.length
    ? await prisma.product.findMany({
        where: { sku: { in: skus } },
        select: { sku: true, name: true, price: true, imageUrl: true },
      })
    : [];
  const bySku = new Map(products.map((p) => [p.sku, p]));

  return rows.map((r) => {
    const p = r.productSku ? bySku.get(r.productSku) : undefined;
    return {
      id: r.id,
      videoUrl: r.videoUrl,
      thumbnailUrl: r.thumbnailUrl,
      caption: r.caption,
      productSku: r.productSku,
      viewCount: r.viewCount,
      product: p
        ? {
            sku: p.sku,
            name: p.name,
            price: Number(p.price),
            imageUrl: p.imageUrl,
          }
        : null,
    };
  });
}

/** 5-min ISR cache; busted by admin's revalidateWeb('reels') on save. */
export const getActiveReels = unstable_cache(
  _getActiveReels,
  ['kk:active-reels'],
  { revalidate: 300, tags: ['reels'] },
);
