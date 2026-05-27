/**
 * GET /api/cron/keepalive
 *
 * Vercel Cron hits this endpoint on a schedule (see vercel.json crons
 * array). The handler does a single trivial Prisma query to keep the
 * Neon Launch-plan compute warm — so the first real user request
 * doesn't wait 1-3 seconds for cold-start.
 *
 * Neon Launch still auto-suspends after ~5 min of no requests. By
 * pinging every 4 minutes during business hours (10 AM - 11 PM IST
 * = 04:30 - 17:30 UTC), the compute never gets a chance to sleep
 * while real shoppers are likely browsing.
 *
 * Why business-hours-only: keeping the compute awake 24/7 costs
 * actual compute hours on the Launch plan. Sleeping overnight when
 * no one's browsing saves money without hurting UX.
 *
 * Security: Vercel signs all cron requests with the CRON_SECRET env
 * var. We verify the Authorization header to prevent randos from
 * pinging the endpoint to inflate our compute usage.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

// Don't pre-render or cache — must hit the DB every invocation.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  // Set CRON_SECRET in Vercel env vars to enable signature check.
  const authHeader = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  if (expected && authHeader !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  try {
    // Cheapest possible query that still touches Postgres. Don't use
    // SELECT 1 via $queryRaw because Prisma still needs to spin up
    // its query engine — count() is similar cost but uses the model
    // layer (warms the connection Prisma will actually use later).
    const productCount = await prisma.product.count({
      where: { status: 'active' },
    });
    const ms = Date.now() - t0;
    return NextResponse.json({
      ok: true,
      productCount,
      durationMs: ms,
      at: new Date().toISOString(),
    });
  } catch (err) {
    const ms = Date.now() - t0;
    return NextResponse.json(
      {
        ok: false,
        durationMs: ms,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
