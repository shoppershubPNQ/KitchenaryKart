/**
 * GET /api/auth/me — returns the currently signed-in customer, or 401.
 *
 * Sliding-window persistence: every successful auth check refreshes the
 * cookie's 30-day expiry. As long as the user visits the site at least once
 * within 30 days they stay signed in indefinitely — same UX as Blinkit/Zepto.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CUSTOMER_COOKIE, cookieOptions, getCustomerSession, signToken } from '@/lib/auth';

export async function GET() {
  const session = getCustomerSession();
  if (!session) return NextResponse.json({ customer: null }, { status: 401 });
  const customer = await prisma.customer.findUnique({
    where: { id: session.cid },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!customer) return NextResponse.json({ customer: null }, { status: 401 });

  // Sliding window: re-issue a fresh 30-day cookie on every authenticated check.
  const res = NextResponse.json({ customer });
  res.cookies.set(CUSTOMER_COOKIE, signToken(customer.id), cookieOptions());
  return res;
}
