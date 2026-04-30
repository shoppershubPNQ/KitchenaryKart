/**
 * In-memory OTP store for dev.
 *
 * Keyed by normalized phone ("919503766388"), holds the 6-digit code and
 * expiry. For production, swap for an SMS gateway (MSG91, Twilio, etc.) and
 * persist OTP attempts / throttle per phone.
 *
 * Lives in module scope so it survives across requests in a single Node
 * process. Not shared across serverless instances — fine for Vercel dev /
 * single-server hosting, not for multi-instance production.
 */

interface Entry {
  code: string;
  expiresAt: number;
}

// Survive Next.js hot reloads in dev by pinning the Map on globalThis —
// otherwise every source edit wipes any OTP issued since the server started,
// which shows up as a mystifying "Invalid or expired code".
const globalForOtp = globalThis as unknown as { kkOtpStore?: Map<string, Entry> };
const store: Map<string, Entry> = globalForOtp.kkOtpStore ?? new Map<string, Entry>();
if (process.env.NODE_ENV !== 'production') globalForOtp.kkOtpStore = store;

const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function normalizePhone(raw: string): string {
  // Keep only digits; prepend country code if user typed 10 digits.
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  return digits;
}

export function issueOtp(phone: string): string {
  const normalized = normalizePhone(phone);
  // Dev code — always 123456 so you can log in without real SMS.
  // Flip to `Math.floor(100000 + Math.random() * 900000).toString()` when
  // wiring up a real SMS gateway.
  const code = process.env.NODE_ENV === 'production'
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : '123456';
  store.set(normalized, { code, expiresAt: Date.now() + TTL_MS });
  // Log it so you can copy it when testing.
  // eslint-disable-next-line no-console
  console.log(`[kk:otp] ${normalized} → ${code}`);
  return code;
}

export function verifyOtp(phone: string, code: string): boolean {
  const normalized = normalizePhone(phone);
  const entry = store.get(normalized);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    store.delete(normalized);
    return false;
  }
  if (entry.code !== code) return false;
  store.delete(normalized); // single use
  return true;
}
