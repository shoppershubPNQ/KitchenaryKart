/**
 * First-party visitor analytics — what each visitor looks at, for how long,
 * and how far into checkout they get. Feeds the admin Analytics dashboard.
 *
 * Deliberately small (no library): events queue in memory and go to
 * /api/track in batches — by sendBeacon when the page is being hidden or
 * closed, so the last page's time on screen is not lost.
 *
 * Privacy: an anonymous random visitor id in localStorage, no IP stored. A
 * visitor is only tied to a name when they place an order (the order number
 * rides on the checkout events). Do Not Track browsers and bots send nothing.
 */
import { looksLikeBot } from './bot';

// Not /api/track — that is the public order-lookup endpoint.
const ENDPOINT = '/api/collect';
const VID_KEY = 'kk_vid';
const SES_KEY = 'kk_ses';
/** A new session starts after 30 minutes without any activity. */
const SESSION_IDLE_MS = 30 * 60 * 1000;
const FLUSH_MS = 4000;

export interface TrackFields {
  path?: string;
  sku?: string | null;
  order?: string | null;
  /** Milliseconds (time on page). */
  dur?: number;
  d?: Record<string, unknown>;
}
interface QueuedEvent extends TrackFields {
  t: string;
  ts: number;
  s: string;
}

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let off: boolean | null = null;
let memVid = '';
let memSes: { id: string; last: number } | null = null;

export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  } catch {
    /* fall through */
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

function disabled(): boolean {
  if (off !== null) return off;
  if (typeof window === 'undefined') return true;
  const dnt =
    navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1';
  off = dnt || looksLikeBot();
  return off;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function visitorId(): string {
  if (memVid) return memVid;
  let v: string | null = null;
  try {
    v = storage()?.getItem(VID_KEY) ?? null;
  } catch {
    v = null;
  }
  if (!v) {
    v = newId();
    try {
      storage()?.setItem(VID_KEY, v);
    } catch {
      /* private mode — keep it in memory */
    }
  }
  memVid = v;
  return v;
}

/** Read from localStorage every time so tabs share one session clock. */
function session(): { id: string; isNew: boolean } {
  const now = Date.now();
  let cur: { id: string; last: number } | null = null;
  try {
    cur = JSON.parse(storage()?.getItem(SES_KEY) || 'null');
  } catch {
    cur = null;
  }
  if (!cur) cur = memSes;
  const isNew = !cur || typeof cur.id !== 'string' || now - Number(cur.last) > SESSION_IDLE_MS;
  const next = { id: isNew ? newId() : cur!.id, last: now };
  memSes = next;
  try {
    storage()?.setItem(SES_KEY, JSON.stringify(next));
  } catch {
    /* memory only */
  }
  return { id: next.id, isNew };
}

/** Where this visit came from, and on what — recorded once per session. */
function sessionInfo(): Record<string, unknown> {
  const p = new URLSearchParams(location.search);
  let ref = '';
  try {
    ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
  } catch {
    ref = '';
  }
  if (ref === location.hostname.replace(/^www\./, '')) ref = '';
  const src =
    p.get('utm_source') ||
    (p.get('gclid') ? 'google-ads' : '') ||
    (p.get('fbclid') ? 'facebook' : '') ||
    ref ||
    'direct';
  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
  return {
    src: src.slice(0, 80),
    ref: ref || undefined,
    medium: p.get('utm_medium') || undefined,
    campaign: p.get('utm_campaign') || undefined,
    device,
    screen: `${screen.width}x${screen.height}`,
    lang: navigator.language,
    landing: (location.pathname + location.search).slice(0, 300),
  };
}

export function track(t: string, f: TrackFields = {}): void {
  if (disabled()) return;
  try {
    const s = session();
    const path = f.path ?? location.pathname + location.search;
    if (s.isNew) queue.push({ t: 'session_start', ts: Date.now(), s: s.id, path, d: sessionInfo() });
    queue.push({ ...f, t, ts: Date.now(), s: s.id, path });
    if (queue.length >= 20) flush();
    else if (!timer) timer = setTimeout(() => flush(), FLUSH_MS);
  } catch {
    /* tracking must never break the page */
  }
}

/** Send what is queued. `beacon` when the page is being hidden or closed. */
export function flush(beacon = false): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (typeof window === 'undefined' || queue.length === 0) return;
  const batch = queue.splice(0, 50);
  const body = JSON.stringify({ v: visitorId(), now: Date.now(), e: batch });
  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
    } else {
      fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(
        () => {},
      );
    }
  } catch {
    /* ignore */
  }
  if (queue.length) flush(beacon);
}
