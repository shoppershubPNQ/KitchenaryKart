/**
 * POST /api/auth/register
 *
 * Body: { phone, name, email }
 * Creates a new Customer and sets the session cookie. Rejects duplicate
 * phone or email.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizePhone } from '@/lib/otp-store';
import { CUSTOMER_COOKIE, cookieOptions, signToken } from '@/lib/auth';

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

  // Duplicate check — email is unique in the schema, phone is not but we
  // enforce it here to avoid two accounts per number.
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
