/**
 * GET /api/auth/me — returns the currently signed-in customer, or 401.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth';

export async function GET() {
  const session = getCustomerSession();
  if (!session) return NextResponse.json({ customer: null }, { status: 401 });
  const customer = await prisma.customer.findUnique({
    where: { id: session.cid },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!customer) return NextResponse.json({ customer: null }, { status: 401 });
  return NextResponse.json({ customer });
}
