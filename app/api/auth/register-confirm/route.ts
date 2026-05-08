/**
 * POST /api/auth/register-confirm
 *
 * Body: { phone, name, email, otp }
 *
 * Step 2 of registration. The user has received the OTP at the email they
 * entered in step 1 (/register). We verify the OTP, re-check for duplicates
 * (in case someone registered the same email/phone in between steps), then
 * create the customer record and set the session cookie.
 *
 * Response: { customer } — same shape as /verify-otp.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizePhone, verifyOtp } from '@/lib/otp-store';
import { CUSTOMER_COOKIE, cookieOptions, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawPhone = (body?.phone ?? '').toString();
  const phone = normalizePhone(rawPhone);
  const name = (body?.name ?? '').toString().trim();
  const email = (body?.email ?? '').toString().trim().toLowerCase();
  const otp = (body?.otp ?? '').toString();

  if (phone.length < 10) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 400 });
  }

  // Verify OTP first — also deletes it on success (single-use).
  const ok = await verifyOtp(phone, otp);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 401 });
  }

  // Re-check duplicates after OTP verification, in case another signup
  // landed the same email between /register and now.
  const dup = await prisma.customer.findFirst({
    where: {
      OR: [{ email }, { phone: { in: [phone, '+' + phone] } }],
    },
    select: { id: true, email: true, phone: true },
  });
  if (dup) {
    if (dup.email === email) {
      return NextResponse.json({ error: 'That email is already registered.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'That phone number is already registered.' }, { status: 409 });
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      email,
      phone: '+' + phone,
      customerType: 'retail',
      isActive: true,
      signupSource: 'web',
    },
    select: { id: true, name: true, email: true, phone: true },
  });

  const token = signToken(customer.id);
  const res = NextResponse.json({ customer });
  res.cookies.set(CUSTOMER_COOKIE, token, cookieOptions());
  return res;
}
