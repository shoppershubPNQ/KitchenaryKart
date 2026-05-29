/**
 * POST /api/coupons/validate
 *
 * Read-only coupon preview for the checkout page. Returns the discount
 * the customer WOULD get, so the UI can show "−₹500" before they pay.
 *
 * This is NOT authoritative — the binding discount is recomputed at
 * checkout time (admin /api/public/checkout) before the Razorpay
 * amount is set. This endpoint never mutates the coupon's usageCount.
 *
 * Body: { code: string, subtotal: number, phone?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/coupon';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code : '';
    const subtotal = Number(body.subtotal) || 0;
    const phone = typeof body.phone === 'string' ? body.phone : null;

    const result = await validateCoupon({ code, subtotal, customerPhone: phone });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        valid: false,
        discountAmount: 0,
        message: 'Could not validate the coupon right now. Please try again.',
        coupon: null,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 200 },
    );
  }
}
