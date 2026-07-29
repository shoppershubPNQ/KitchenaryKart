/**
 * "Notify me when available" — records a customer's request for a sold-out
 * product and alerts the team.
 *
 * The SKU may be a parent product SKU or a variant SKU; we accept whichever the
 * shopper was looking at and store it as-is, so the customer is emailed about
 * the exact size/colour they wanted. The admin app's restock cron reads this
 * table and sends the back-in-stock email.
 *
 * Deliberately does NOT require login — asking to hear about a product is a
 * lower bar than buying, and forcing an account here loses the demand signal.
 * Rate-limited per IP instead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendRestockRequestAlert, sendRestockRequestConfirmation } from '@/lib/email';
import { checkLimit, getClientIp, notifyMeByIp, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Pragmatic email check — the real validation is the delivery attempt. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const limit = await checkLimit(notifyMeByIp, getClientIp(req));
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  let body: { sku?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!sku) return NextResponse.json({ error: 'Product missing.' }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  // Resolve the SKU against the catalog so we never store junk, and so the
  // team alert can name the product. Try the parent, then the variant table.
  const product = await prisma.product.findUnique({ where: { sku }, select: { name: true } });
  let productName = product?.name ?? null;
  if (!productName) {
    const variant = await prisma.productVariant.findFirst({
      where: { skuSuffix: sku },
      select: { variantValue: true, product: { select: { name: true } } },
    });
    if (variant?.product) {
      productName = variant.variantValue
        ? `${variant.product.name} — ${variant.variantValue}`
        : variant.product.name;
    }
  }
  if (!productName) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  // Upsert: a repeat request re-arms an already-notified row rather than
  // duplicating it (the unique key is sku+email).
  await prisma.stockNotification.upsert({
    where: { stock_notify_sku_email_unique: { productSku: sku, email } },
    create: { productSku: sku, email },
    update: { notifiedAt: null, createdAt: new Date() },
  });

  const waiting = await prisma.stockNotification.count({
    where: { productSku: sku, notifiedAt: null },
  });

  // AWAITED on purpose: Vercel can freeze the function the moment the response
  // is returned, so a fire-and-forget send silently never leaves (the same
  // gotcha the order-confirmation email hit). Errors are swallowed — the row is
  // already saved and the restock cron reads the table, not these emails.
  // Both go out together: the customer gets an immediate "you're on the list"
  // (the on-page thanks alone left people waiting for a mail that only arrives
  // on restock), the team gets the demand signal.
  await Promise.allSettled([
    sendRestockRequestConfirmation({ to: email, sku, productName }),
    sendRestockRequestAlert({ sku, productName, email, waiting }),
  ]);

  return NextResponse.json({ ok: true, waiting });
}
