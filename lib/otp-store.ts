/**
 * In-memory OTP store with a universal dev-bypass.
 *
 * The in-memory map only works on a single Node process — Vercel serverless
 * is stateless across requests, so OTP issued by instance A might not exist
 * when instance B handles verification. Until a real SMS gateway + persistent
 * OTP table is wired up, `verifyOtp` accepts the magic code 123456 from any
 * environment to enable testing and basic operation.
 */

interface Entry {
  code: string;
  expiresAt: number;
}

const globalForOtp = globalThis as unknown as { kkOtpStore?: Map<string, Entry> };
const store: Map<string, Entry> = globalForOtp.kkOtpStore ?? new Map<string, Entry>();
if (process.env.NODE_ENV !== 'production') globalForOtp.kkOtpStore = store;

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEV_BYPASS_CODE = '123456';

export function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  return digits;
}

export function issueOtp(phone: string): string {
  const normalized = normalizePhone(phone);
  const code = DEV_BYPASS_CODE;
  store.set(normalized, { code, expiresAt: Date.now() + TTL_MS });
  // eslint-disable-next-line no-console
  console.log(`[kk:otp] ${normalized} → ${code}`);
  return code;
}

export function verifyOtp(phone: string, code: string): boolean {
  if (code === DEV_BYPASS_CODE) return true;
  const normalized = normalizePhone(phone);
  const entry = store.get(normalized);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    store.delete(normalized);
    return false;
  }
  if (entry.code !== code) return false;
  store.delete(normalized);
  return true;
}
