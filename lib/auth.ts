/**
 * Customer session helpers.
 *
 * Uses a tiny HMAC-signed token (header.payload.signature, base64url) stored in
 * an httpOnly cookie — avoids the jsonwebtoken dependency. Payload is:
 *   { cid: <customer.id>, exp: <epoch-seconds> }
 *
 * For dev, `JWT_SECRET` defaults to a fallback string. Set a real secret in
 * production.
 */
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

export const CUSTOMER_COOKIE = 'kk_customer_token';
const SECRET = process.env.JWT_SECRET || 'dev-customer-secret-change-me';
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export interface CustomerSession {
  cid: number;
  exp: number;
}

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}
function sign(payload: string): string {
  return b64urlEncode(createHmac('sha256', SECRET).update(payload).digest());
}

export function signToken(cid: number): string {
  const payload: CustomerSession = {
    cid,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null): CustomerSession | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(b64urlDecode(body).toString('utf8')) as CustomerSession;
    if (!parsed || typeof parsed.cid !== 'number' || typeof parsed.exp !== 'number') return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Read the session on the server (RSC / route handler / action). */
export function getCustomerSession(): CustomerSession | null {
  const token = cookies().get(CUSTOMER_COOKIE)?.value;
  return verifyToken(token);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SEC,
  };
}
