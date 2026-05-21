/**
 * Product review helpers — storefront side.
 *
 * Reviews are tied to a productSku string (not a productId FK) so they
 * survive catalog re-imports the same way orders + reels do.
 *
 * Aggregates and lists are cached with unstable_cache (5 min) under a
 * `reviews` tag — the admin's revalidateWeb('reviews') ping busts the
 * cache when a review is approved/unapproved/deleted.
 */
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

export interface ReviewSummary {
  count: number;
  /** 0 if count = 0 — caller can fall back to pseudoRating for display. */
  average: number;
  /** Counts per star (1-5). Always 5 entries, even with 0 reviews. */
  distribution: [number, number, number, number, number];
}

export interface PublicReview {
  id: number;
  customerName: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  verifiedBuyer: boolean; // always true today (verified-buyer-only writes)
}

/**
 * Aggregate stats for one SKU. Cached for 5 min — keep this fast so
 * the PDP render path doesn't slow down.
 */
export const getReviewSummary = unstable_cache(
  async (productSku: string): Promise<ReviewSummary> => {
    const rows = await prisma.review.findMany({
      where: { productSku, isApproved: true },
      select: { rating: true },
    });
    if (rows.length === 0) {
      return { count: 0, average: 0, distribution: [0, 0, 0, 0, 0] };
    }
    const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const r of rows) {
      const i = Math.max(0, Math.min(4, r.rating - 1));
      distribution[i]++;
      sum += r.rating;
    }
    return {
      count: rows.length,
      average: Math.round((sum / rows.length) * 10) / 10,
      distribution,
    };
  },
  ['kk-review-summary'],
  { revalidate: 300, tags: ['reviews'] },
);

/** Approved reviews for a SKU, newest first. Capped at 20 for the PDP. */
export const listReviews = unstable_cache(
  async (productSku: string, limit = 20): Promise<PublicReview[]> => {
    const rows = await prisma.review.findMany({
      where: { productSku, isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        customerName: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      verifiedBuyer: true,
    }));
  },
  ['kk-review-list'],
  { revalidate: 300, tags: ['reviews'] },
);

/**
 * Has the given customer purchased this SKU and had it delivered?
 * Used by the review-write endpoint to enforce verified-buyer-only.
 * Returns the first matching order's number for surfacing in the UI
 * ("You purchased this on order KKxxxx").
 */
export async function findEligibleOrder(
  customerId: number,
  productSku: string,
): Promise<{ orderNumber: string } | null> {
  // The product reference on OrderItem is by productId — but the SKU
  // is denormalised onto OrderItem.productSku, so we match that
  // directly. Survives the case where a product was deleted but the
  // order item still has the SKU snapshot.
  const row = await prisma.orderItem.findFirst({
    where: {
      productSku,
      order: {
        customerId,
        orderStatus: { in: ['shipped', 'delivered'] },
        paymentStatus: 'completed',
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { order: { select: { orderNumber: true } } },
  });
  return row?.order ? { orderNumber: row.order.orderNumber } : null;
}

/** Returns the current customer's review for a SKU, if any. */
export async function getMyReview(
  customerId: number,
  productSku: string,
): Promise<{ rating: number; title: string | null; body: string } | null> {
  const r = await prisma.review.findUnique({
    where: {
      review_sku_customer_unique: { productSku, customerId },
    },
    select: { rating: true, title: true, body: true },
  });
  return r;
}
