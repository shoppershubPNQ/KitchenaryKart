/**
 * Persistent OTP store backed by Upstash Redis (REST API).
 *
 * Why Redis: Vercel serverless is stateless across invocations, so an in-memory
 * Map can't reliably keep an OTP between the issue request and the verify
 * request. Upstash REST works over HTTPS, so there's no TCP connection to
 * pool — safe for serverless cold starts.
 *
 * Falls back to an in-memory Map only when Upstash env vars are missing
 * (single-process local dev). A warning is logged so misconfigured prod
 * deploys are obvious.
 *
 * Dev bypass: when OTP_DEV_BYPASS=true, the code "123456" is always accepted.
 * Disable this in production once a real SMS gateway is wired up.
 */
import { Redis } from '@upstash/redis';

const TTL_SECONDS = 5 * 60;
const DEV_BYPASS_CODE = '123456';
const KEY_PREFIX = 'kk:otp:';

const isBypassEnabled = () => process.env.OTP_DEV_BYPASS === 'true';

let redis: Redis | null = null;
const memoryStore = new Map<string, { code: string; expiresAt: number }>();

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn('[kk:otp] Upstash env vars missing — using in-memory fallback (NOT SAFE on serverless).');
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

export function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  return digits;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function issueOtp(phone: string): Promise<string> {
  const normalized = normalizePhone(phone);
  const code = isBypassEnabled() ? DEV_BYPASS_CODE : generateCode();
  const client = getRedis();

  if (client) {
    await client.set(KEY_PREFIX + normalized, code, { ex: TTL_SECONDS });
  } else {
    memoryStore.set(normalized, { code, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  }

  console.log(`[kk:otp] issued ${normalized} → ${code}`);
  return code;
}

/**
 * Discard any pending OTP for this phone. Called when an email-send failure
 * means the OTP we just issued is unreachable — we must not leave it in
 * Redis because the dev bypass would still accept '123456' and let an
 * attacker complete registration with an unverified address.
 */
export async function discardOtp(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  const client = getRedis();
  if (client) {
    await client.del(KEY_PREFIX + normalized);
  } else {
    memoryStore.delete(normalized);
  }
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const client = getRedis();
  const key = KEY_PREFIX + normalized;

  // Dev bypass: code "123456" is accepted, BUT only if a prior issueOtp call
  // actually stored an OTP for this phone. This prevents attackers from
  // creating accounts (or logging in) without an issued+delivered OTP — e.g.
  // registration where the verification email failed, or random phones.
  if (isBypassEnabled() && code === DEV_BYPASS_CODE) {
    if (client) {
      const stored = await client.get<string>(key);
      if (!stored) return false;
      await client.del(key);
      return true;
    }
    const entry = memoryStore.get(normalized);
    if (!entry || entry.expiresAt < Date.now()) {
      memoryStore.delete(normalized);
      return false;
    }
    memoryStore.delete(normalized);
    return true;
  }

  if (client) {
    const stored = await client.get<string>(key);
    if (!stored || stored !== code) return false;
    await client.del(key);
    return true;
  }

  const entry = memoryStore.get(normalized);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    memoryStore.delete(normalized);
    return false;
  }
  if (entry.code !== code) return false;
  memoryStore.delete(normalized);
  return true;
}
