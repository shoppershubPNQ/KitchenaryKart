import { NextResponse, type NextRequest } from 'next/server';

/**
 * Website chatbot ONLY (see `config.matcher`): vouch for the visitor's IP.
 *
 * The chat widget posts to /admin-api/public/chat, which reaches the ADMIN
 * deployment through a rewrite. Behind that hop the admin may see the
 * storefront proxy's address instead of the shopper's, and then every
 * customer would share one per-visitor rate limit. So, when
 * CHATBOT_PROXY_SECRET is set (the SAME value of 32+ characters in BOTH Vercel
 * projects), this adds the IP this deployment saw plus a timestamp and an
 * HMAC-SHA256 of both (x-kk-client-ip / -ts / -sig). The admin trusts only a
 * correctly signed, fresh header (admin/lib/chatbot/limits.ts) - the message
 * format below must stay identical to signClientIp() there.
 *
 * Without the secret this is a no-op: the request continues to the
 * next.config.js rewrite exactly as before.
 */
export const config = { matcher: ['/admin-api/public/chat'] };

const enc = new TextEncoder();
let cached: { secret: string; key: Promise<CryptoKey> } | null = null;

function proxySecret(): string | null {
  const s = process.env.CHATBOT_PROXY_SECRET?.trim();
  return s && s.length >= 32 ? s : null;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  if (!cached || cached.secret !== secret) {
    cached = {
      secret,
      key: crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    };
  }
  const sig = await crypto.subtle.sign('HMAC', await cached.key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function middleware(req: NextRequest) {
  const secret = proxySecret();
  if (!secret || req.method !== 'POST') return NextResponse.next();

  const ip = (req.ip || req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '').trim();
  const headers = new Headers(req.headers);
  // A client-supplied value is never passed on.
  headers.delete('x-kk-client-ip');
  headers.delete('x-kk-client-ts');
  headers.delete('x-kk-client-sig');
  if (ip && ip.length <= 64) {
    const ts = String(Math.floor(Date.now() / 1000));
    headers.set('x-kk-client-ip', ip);
    headers.set('x-kk-client-ts', ts);
    headers.set('x-kk-client-sig', await hmacHex(secret, `kk-chat-ip-v1|${ip}|${ts}`));
  }

  // Same destination as the next.config.js rewrite, with the headers above.
  const base = process.env.ADMIN_API_BASE;
  if (base) {
    try {
      return NextResponse.rewrite(new URL(`${base.replace(/\/+$/, '')}/api/public/chat`), { request: { headers } });
    } catch {
      /* malformed ADMIN_API_BASE - fall through to the config rewrite */
    }
  }
  return NextResponse.next({ request: { headers } });
}
