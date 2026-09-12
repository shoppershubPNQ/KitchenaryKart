/**
 * POST /api/collect — receives batches from lib/track.ts and stores them in
 * analytics_events for the admin Analytics dashboard.
 *
 * (Not /api/track — that path is the public order-lookup endpoint.)
 *
 * Untrusted input from any browser, so: allow-listed event types, every
 * string capped, at most 50 events and 20 KB per request, a light per-IP
 * limit, bot user-agents dropped. The IP itself is never stored — only the
 * city/region/country Vercel derives from it, on the session's first event.
 *
 * Always answers 204: a tracking failure must never surface in the shop.
 */
import { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { BOT_UA_RE } from '@/lib/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = new Set([
  'session_start',
  'page_view',
  'page_leave',
  'product_view',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'checkout_submitted',
  'payment_opened',
  'payment_failed',
  'payment_dismissed',
  'purchase',
  'whatsapp_click',
  'call_click',
  'click',
]);
const ID_RE = /^[a-z0-9]{8,40}$/i;
const MAX_BODY = 20_000;
const MAX_DURATION_MS = 6 * 3_600_000;

// Per-instance limit (no Redis call per page view — Upstash is metered).
// Generous for a real shopper, enough to blunt a script hammering the endpoint.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 300;
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

const cut = (v: unknown, n: number) => (typeof v === 'string' && v ? v.slice(0, n) : null);

function cleanData(d: unknown): Record<string, unknown> | undefined {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d as Record<string, unknown>).slice(0, 20)) {
    if (!/^[a-z_]{1,20}$/i.test(k)) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 300);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) {
      out[k] = v
        .filter((x) => typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x)))
        .slice(0, 30)
        .map((x) => (typeof x === 'string' ? x.slice(0, 80) : x));
    }
  }
  return Object.keys(out).length ? out : undefined;
}

const noContent = () => new Response(null, { status: 204 });

export async function POST(req: NextRequest) {
  try {
    if (BOT_UA_RE.test(req.headers.get('user-agent') || '')) return noContent();
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (limited(ip)) return noContent();

    const text = await req.text();
    if (!text || text.length > MAX_BODY) return noContent();
    const body = JSON.parse(text) as { v?: unknown; now?: unknown; e?: unknown };
    const visitorId = typeof body.v === 'string' && ID_RE.test(body.v) ? body.v : null;
    if (!visitorId || !Array.isArray(body.e)) return noContent();

    // Client clocks drift; keep each event's order but anchor to server time.
    const serverNow = Date.now();
    const clientNow = typeof body.now === 'number' ? body.now : serverNow;
    const geo = {
      country: cut(req.headers.get('x-vercel-ip-country'), 4),
      region: cut(req.headers.get('x-vercel-ip-country-region'), 10),
      city: (() => {
        try {
          return cut(decodeURIComponent(req.headers.get('x-vercel-ip-city') || ''), 60);
        } catch {
          return null;
        }
      })(),
    };

    const rows: Prisma.AnalyticsEventCreateManyInput[] = [];
    for (const raw of body.e.slice(0, 50)) {
      if (!raw || typeof raw !== 'object') continue;
      const e = raw as Record<string, unknown>;
      const t = typeof e.t === 'string' ? e.t : '';
      if (!TYPES.has(t)) continue;
      const sessionId = typeof e.s === 'string' && ID_RE.test(e.s) ? e.s : null;
      if (!sessionId) continue;
      const ts = typeof e.ts === 'number' ? e.ts : clientNow;
      const at = Math.min(serverNow, Math.max(serverNow - 3_600_000, serverNow - (clientNow - ts)));
      let meta = cleanData(e.d);
      if (t === 'session_start') {
        meta = { ...(meta ?? {}), ...Object.fromEntries(Object.entries(geo).filter(([, v]) => v)) };
      }
      rows.push({
        eventType: t,
        visitorId,
        sessionId,
        path: cut(e.path, 300),
        sku: cut(e.sku, 60),
        orderNumber: cut(e.order, 40),
        durationMs:
          typeof e.dur === 'number' && Number.isFinite(e.dur)
            ? Math.round(Math.min(MAX_DURATION_MS, Math.max(0, e.dur)))
            : null,
        metadata: meta as Prisma.InputJsonValue | undefined,
        createdAt: new Date(at),
      });
    }
    if (rows.length) await prisma.analyticsEvent.createMany({ data: rows });
  } catch (err) {
    console.error('[collect] failed', err instanceof Error ? err.message : err);
  }
  return noContent();
}
