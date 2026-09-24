/**
 * POST /api/checkout-feedback — one answer from the exit popup on checkout.
 *
 * Untrusted input from any browser, so it is treated like /api/collect:
 * the reason must be one of the known keys, every string is capped, the body
 * is small, bots are dropped and there is a light per-IP limit. The IP itself
 * is never stored.
 *
 * Always answers 204. A shopper on their way out must never be shown an error
 * from a feedback form, and the popup does not wait on the response.
 */
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { BOT_UA_RE } from '@/lib/bot';
import { MAX_NOTE, OTHER_KEY, REASON_KEYS } from '@/lib/checkout-feedback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 2_000;
const ID_RE = /^[a-z0-9]{8,40}$/i;

// Per-instance, like /api/collect: no Redis round trip for a form that a
// single visitor submits once.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { n: number; start: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const h = hits.get(ip);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(ip, { n: 1, start: now });
    return false;
  }
  h.n++;
  return h.n > MAX_PER_WINDOW;
}

const noContent = () => new Response(null, { status: 204 });

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get('user-agent') || '';
    if (BOT_UA_RE.test(ua)) return noContent();

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (limited(ip)) return noContent();

    const text = await req.text();
    if (!text || text.length > MAX_BODY) return noContent();

    const body = JSON.parse(text) as {
      reason?: unknown;
      note?: unknown;
      sessionId?: unknown;
      cartValue?: unknown;
      itemCount?: unknown;
    };

    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (!REASON_KEYS.includes(reason)) return noContent();

    // Free text belongs to "other" alone — anywhere else it is noise, or a
    // way to write whatever it likes into the table.
    const note =
      reason === OTHER_KEY && typeof body.note === 'string' && body.note.trim()
        ? body.note.trim().slice(0, MAX_NOTE)
        : null;

    const sessionId =
      typeof body.sessionId === 'string' && ID_RE.test(body.sessionId) ? body.sessionId : null;

    const cartValue =
      typeof body.cartValue === 'number' && Number.isFinite(body.cartValue) && body.cartValue >= 0
        ? Math.min(Math.round(body.cartValue * 100) / 100, 99_999_999)
        : null;

    const itemCount =
      typeof body.itemCount === 'number' && Number.isInteger(body.itemCount) && body.itemCount >= 0
        ? Math.min(body.itemCount, 9999)
        : null;

    await prisma.checkoutFeedback.create({
      data: { reason, note, sessionId, cartValue, itemCount, userAgent: ua.slice(0, 300) || null },
    });

    return noContent();
  } catch {
    return noContent();
  }
}
