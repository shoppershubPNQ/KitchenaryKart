/**
 * POST /api/track
 *
 * Public order lookup endpoint. Body: { orderNumber, phone }.
 * Returns the same PublicOrder shape as /account/orders/[number] so
 * the storefront can reuse <OrderDetailView>.
 *
 * Ownership check: the last 4 digits of `phone` must match the phone
 * stored on the order. We never reveal whether an order exists with
 * a different phone — both branches return the same generic 404.
 *
 * Rate limited at 20/10 min per IP via Upstash so the endpoint can't
 * be used to enumerate order numbers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadPublicOrder } from '@/lib/orders';
import { checkLimit, getClientIp, tooManyRequests, trackLookupByIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = await checkLimit(trackLookupByIp, ip);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  let body: { orderNumber?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const orderNumber = (body.orderNumber || '').trim();
  const phone = (body.phone || '').trim();
  if (!orderNumber || !phone) {
    return NextResponse.json(
      { error: 'Order number and phone are both required.' },
      { status: 400 },
    );
  }

  const order = await loadPublicOrder(orderNumber, { requirePhoneSuffix: phone });
  if (!order) {
    // Generic 404 — never disclose whether the order number exists
    // with a different phone, to make enumeration useless.
    return NextResponse.json(
      {
        error:
          'No order found matching that order number and phone. Check both and try again.',
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ order });
}
