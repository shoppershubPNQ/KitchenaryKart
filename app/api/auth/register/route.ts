/**
 * POST /api/auth/register
 *
 * Body: { phone, name, email }
 *
 * Step 1 of registration. Validates input, checks for duplicates, and sends
 * a verification OTP to the entered email. The customer record is NOT
 * created here — that happens in /api/auth/register-confirm after the user
 * proves email ownership by entering the OTP.
 *
 * Response: { verifyEmail: true, deliveredTo: 'sh****@gmail.com' }
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { discardOtp, issueOtp, normalizePhone } from '@/lib/otp-store';
import { maskEmail, sendOtpEmail } from '@/lib/email';
import {
  checkLimit,
  getClientIp,
  registerByEmail,
  registerByIp,
  tooManyRequests,
} from '@/lib/rate-limit';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawPhone = (body?.phone ?? '').toString();
  const phone = normalizePhone(rawPhone);
  const name = (body?.name ?? '').toString().trim();
  const email = (body?.email ?? '').toString().trim().toLowerCase();

  if (phone.length < 10) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const ipRl = await checkLimit(registerByIp, getClientIp(req));
  if (!ipRl.ok) return tooManyRequests(ipRl.retryAfterSec);
  const emailRl = await checkLimit(registerByEmail, email);
  if (!emailRl.ok) return tooManyRequests(emailRl.retryAfterSec);

  // Duplicate check — email is unique in the schema, phone is enforced here
  // to avoid two accounts per number.
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

  // Issue an OTP keyed on phone (Redis), then deliver it to the entered
  // email. The /register-confirm endpoint will validate phone+otp before
  // creating the customer.
  const code = await issueOtp(phone);

  const sent = await sendOtpEmail({
    to: email,
    code,
    customerName: name,
    purpose: 'register',
  });

  if (!sent) {
    // Email delivery failed — clean up the pending OTP so the dev bypass
    // can't be used to bypass email verification with an invalid address.
    await discardOtp(phone);
    return NextResponse.json(
      { error: "Couldn't send verification email — please check the address and try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ verifyEmail: true, deliveredTo: maskEmail(email) });
}
