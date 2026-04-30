/**
 * POST /api/auth/check-phone
 *
 * Body: { phone }
 * Response: { exists: boolean, otpSent: boolean }
 *
 * If the phone is registered, issues an OTP (dev: always 123456) so the client
 * can prompt for it. If not registered, skips OTP and the client should show
 * the register form directly.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { issueOtp, normalizePhone } from '@/lib/otp-store';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const raw = (body?.phone ?? '').toString();
  const phone = normalizePhone(raw);
  if (phone.length < 10) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { phone: { in: [phone, '+' + phone, raw] } },
    select: { id: true },
  });

  const exists = !!customer;
  let otpSent = false;
  if (exists) {
    issueOtp(phone);
    otpSent = true;
  }

  return NextResponse.json({ exists, otpSent, phone: '+' + phone });
}
