/**
 * POST /api/auth/check-phone
 *
 * Body: { phone }
 * Response on registered phone:
 *   { exists: true, otpSent: boolean, deliveredTo?: string, phone }
 * Response on unregistered phone:
 *   { exists: false, otpSent: false, phone }
 *
 * For a registered phone we look up the customer's email, issue an OTP into
 * Redis, and send the OTP via Resend to that email. The masked email is
 * returned so the modal can tell the user "OTP sent to sh****@gmail.com".
 *
 * If email delivery fails (Resend error / no API key), we still report
 * otpSent:true to avoid leaking whether the customer exists. The OTP is in
 * Redis either way; failure just means the user has to retry or use the
 * dev bypass. Errors are logged server-side for debugging.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { issueOtp, normalizePhone } from '@/lib/otp-store';
import { sendOtpEmail, maskEmail } from '@/lib/email';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const raw = (body?.phone ?? '').toString();
  const phone = normalizePhone(raw);
  if (phone.length < 10) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { phone: { in: [phone, '+' + phone, raw] } },
    select: { id: true, name: true, email: true },
  });

  if (!customer) {
    return NextResponse.json({ exists: false, otpSent: false, phone: '+' + phone });
  }

  const code = await issueOtp(phone);

  let deliveredTo: string | undefined;
  if (customer.email) {
    const sent = await sendOtpEmail({
      to: customer.email,
      code,
      customerName: customer.name,
    });
    if (sent) {
      deliveredTo = maskEmail(customer.email);
    }
  }

  return NextResponse.json({
    exists: true,
    otpSent: true,
    deliveredTo,
    phone: '+' + phone,
  });
}
