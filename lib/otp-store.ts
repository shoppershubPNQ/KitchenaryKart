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

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  if (isBypassEnabled() && code === DEV_BYPASS_CODE) return true;

  const normalized = normalizePhone(phone);
  const client = getRedis();

  if (client) {
    const key = KEY_PREFIX + normalized;
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
