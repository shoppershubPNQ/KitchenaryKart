/**
 * GET /api/reviews/eligibility?sku=KK...
 *
 * Used by the PDP's "Write a review" CTA to decide which state to
 * render. Returns:
 *   { eligible: false } — not signed in, or hasn't bought this SKU
 *   { eligible: true, orderNumber?, existing? } — can write a new
 *     review, or edit an existing one
 *
 * Same auth gate as POST /api/reviews so the CTA's behaviour matches
 * what the submit endpoint will accept.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/auth';
import { findEligibleOrder, getMyReview } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = getCustomerSession();
  if (!session) return NextResponse.json({ eligible: false });

  const sku = (req.nextUrl.searchParams.get('sku') || '').trim();
  if (!sku) return NextResponse.json({ eligible: false });

  const eligible = await findEligibleOrder(session.cid, sku);
  if (!eligible) return NextResponse.json({ eligible: false });

  const existing = await getMyReview(session.cid, sku);
  return NextResponse.json({
    eligible: true,
    orderNumber: eligible.orderNumber,
    existing: existing ?? undefined,
  });
}
