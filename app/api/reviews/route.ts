/**
 * POST /api/reviews
 *
 * Write or update a product review. Requires:
 *   - Customer must be signed in (kk_customer_token cookie)
 *   - Customer must have at least one paid+shipped order containing the SKU
 *     (verified-buyer-only writes for v1 — silences fake-review concerns)
 *
 * Re-submitting overwrites the existing review (one per customer per SKU).
 *
 * Defaults to isApproved=true under the customer-trust model; admin
 * can unapprove via /dashboard/reviews if a review is abusive.
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth';
import { findEligibleOrder } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

interface PostBody {
  productSku?: string;
  rating?: number;
  title?: string;
  body?: string;
}

export async function POST(req: NextRequest) {
  const session = getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in to leave a review.' }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const productSku = (body.productSku || '').trim();
  const rating = Number(body.rating);
  const title = (body.title || '').trim();
  const reviewBody = (body.body || '').trim();

  if (!productSku) {
    return NextResponse.json({ error: 'productSku is required.' }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be an integer 1-5.' }, { status: 400 });
  }
  if (reviewBody.length < 10) {
    return NextResponse.json(
      { error: 'Review body must be at least 10 characters.' },
      { status: 400 },
    );
  }
  if (reviewBody.length > 2000) {
    return NextResponse.json(
      { error: 'Review body must be under 2000 characters.' },
      { status: 400 },
    );
  }
  if (title.length > 80) {
    return NextResponse.json({ error: 'Title must be under 80 characters.' }, { status: 400 });
  }

  // Verified-buyer check
  const eligible = await findEligibleOrder(session.cid, productSku);
  if (!eligible) {
    return NextResponse.json(
      {
        error:
          'You can only review products you have purchased and that have been shipped.',
      },
      { status: 403 },
    );
  }

  // Customer snapshot for stable attribution
  const customer = await prisma.customer.findUnique({
    where: { id: session.cid },
    select: { name: true },
  });
  const customerName = (customer?.name || 'A customer').trim();

  // Look up productId if the product still exists in the catalog
  const product = await prisma.product.findUnique({
    where: { sku: productSku },
    select: { id: true },
  });

  // Upsert — re-reviewing replaces the prior review.
  const review = await prisma.review.upsert({
    where: { review_sku_customer_unique: { productSku, customerId: session.cid } },
    create: {
      productSku,
      productId: product?.id ?? null,
      customerId: session.cid,
      customerName,
      rating,
      title: title || null,
      body: reviewBody,
      isApproved: true,
    },
    update: {
      productId: product?.id ?? null,
      customerName,
      rating,
      title: title || null,
      body: reviewBody,
      // Re-approving on edit — admin would have to unapprove again if abusive.
      isApproved: true,
    },
    select: { id: true, rating: true, title: true, body: true, createdAt: true },
  });

  // Bust the storefront's review caches so the new review shows up
  // immediately on the PDP without waiting for the 5-min revalidate.
  revalidateTag('reviews');

  return NextResponse.json({ review });
}
