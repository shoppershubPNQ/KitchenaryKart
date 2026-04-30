/**
 * POST /api/auth/verify-otp
 *
 * Body: { phone, otp }
 * Sets the kk_customer_token cookie on success and returns the customer.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizePhone, verifyOtp } from '@/lib/otp-store';
import { CUSTOMER_COOKIE, cookieOptions, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone((body?.phone ?? '').toString());
  const otp = (body?.otp ?? '').toString();

  if (!verifyOtp(phone, otp)) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
  }

  const customer = await prisma.customer.findFirst({
    where: { phone: { in: [phone, '+' + phone] } },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!customer) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const token = signToken(customer.id);
  const res = NextResponse.json({ customer });
  res.cookies.set(CUSTOMER_COOKIE, token, cookieOptions());
  return res;
}
