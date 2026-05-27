import { PrismaClient, Prisma } from '@prisma/client';

// Reuse the client across Next.js hot reloads in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Retry middleware for Prisma queries.
 *
 * Neon's serverless Postgres briefly throws PrismaClientInitializationError
 * with "Can't reach database" when:
 *   - Compute is waking up from auto-suspend (first request after idle)
 *   - Network blip between Vercel and Neon's edge
 *   - Transient connection-pool exhaustion under burst load
 *
 * All of these clear in 1-3 seconds. Without retry, the user sees a 500.
 * With this wrapper, we retry up to 2 times with exponential backoff
 * (250ms → 750ms) — total worst case ~1s added latency, which is fine
 * for a server-rendered page.
 *
 * Only retry on transient connection errors. Application errors (bad
 * input, unique constraint violations, P2002 etc.) are NOT retried —
 * those need to surface immediately.
 */
function isTransientConnectError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: string; message?: string };
  // Prisma's own init error class
  if (e.name === 'PrismaClientInitializationError') return true;
  // Prisma's rust-panic error sometimes wraps connection failures
  if (e.name === 'PrismaClientRustPanicError') return true;
  // Known transient codes
  const transientCodes = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
  if (e.code && transientCodes.has(e.code)) return true;
  // Generic network errors
  if (e.message && /can't reach database|connection.*closed|connection.*reset|ECONNRESET|ETIMEDOUT/i.test(e.message)) {
    return true;
  }
  return false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // $extends gives us the modern Prisma middleware. We wrap every
  // model query with retry logic so it's transparent to callers.
  return client.$extends({
    name: 'transient-retry',
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let lastErr: unknown;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              return await query(args);
            } catch (err) {
              lastErr = err;
              if (!isTransientConnectError(err) || attempt === 2) {
                throw err;
              }
              // 250ms then 750ms (3x backoff)
              const delay = 250 * Math.pow(3, attempt);
              if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.warn(
                  `[db] transient connect error, retrying in ${delay}ms (attempt ${attempt + 1}/3)`,
                  err instanceof Error ? err.message : err,
                );
              }
              await sleep(delay);
            }
          }
          throw lastErr;
        },
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
