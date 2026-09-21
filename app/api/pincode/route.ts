/**
 * GET /api/pincode?pin=411048 — the product page's "Check delivery".
 *
 * Rate-limited per visitor here, then answered by the admin's
 * /api/public/pincode (the Delhivery token lives only in the admin). That
 * answer is cached for a day per pincode, so Delhivery sees about one lookup
 * per pincode per day however many shoppers type it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkLimit, getClientIp, pincodeByIp, tooManyRequests } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ADMIN = process.env.ADMIN_API_BASE || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const pin = new URL(req.url).searchParams.get('pin')?.trim() ?? '';
  if (!/^[1-9]\d{5}$/.test(pin)) {
    return NextResponse.json({ error: 'Enter a valid 6-digit pincode' }, { status: 400 });
  }
  const limit = await checkLimit(pincodeByIp, getClientIp(req));
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  try {
    // no-store: the admin caches successful answers itself (a day, per
    // pincode). Caching here as well would also pin an ERROR for a day — e.g.
    // a check made before Delhivery was connected.
    const res = await fetch(`${ADMIN}/api/public/pincode?pin=${pin}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Could not check this pincode right now — please try again' }, { status: 502 });
  }
}
