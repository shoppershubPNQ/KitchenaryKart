/**
 * Rate limiting for auth endpoints, backed by Upstash Redis (same instance as
 * the OTP store). Sliding-window limits keyed by phone, email, or IP.
 *
 * Fail-open: if Upstash env vars are missing (local dev), rate limiting is
 * skipped and a warning is logged. Production deploys must have the env vars
 * set — without them, the auth endpoints are exposed to spam and brute force.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('[kk:rl] Upstash env vars missing — rate limiting is DISABLED.');
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

function makeLimiter(
  name: string,
  max: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;
  return new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix: `kk:rl:${name}`,
    analytics: false,
  });
}

// OTP request — 3 per 5 min per phone. Stops Resend quota burn.
export const otpRequestByPhone = makeLimiter('otp-request', 3, '5 m');

// OTP verify — 5 per 15 min per phone. Stops brute force.
export const otpVerifyByPhone = makeLimiter('otp-verify', 5, '15 m');

// Registration — 3 per hour per IP. Stops mass signup spam.
export const registerByIp = makeLimiter('register-ip', 3, '1 h');

// Registration — 1 per hour per email. Stops the same address being re-sent.
export const registerByEmail = makeLimiter('register-email', 1, '1 h');

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Check a rate-limit key. Returns { ok: true } if under the limit (or if the
 * limiter is disabled). On limit hit, returns { ok: false, retryAfterSec }.
 */
export async function checkLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  if (!limiter) return { ok: true };
  const result = await limiter.limit(key);
  if (result.success) return { ok: true };
  const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return { ok: false, retryAfterSec };
}

/**
 * Build a 429 response with the standard Retry-After header.
 */
export function tooManyRequests(retryAfterSec: number) {
  return new Response(
    JSON.stringify({
      error: `Too many requests. Try again in ${retryAfterSec} seconds.`,
      retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    },
  );
}
