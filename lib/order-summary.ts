/**
 * Single source of truth for the order price breakdown shown to customers
 * and on the invoice. Storefront prices are GST-INCLUSIVE; this backs the
 * tax out so we can present a clean, GST-compliant ladder:
 *
 *   Excluding GST Price (Net Price)  — ex-GST, before discount
 *   Discount (%)                     — coupon discount, as a percentage
 *   Net Value                        — ex-GST, AFTER discount  (GST base)
 *   GST (%)                          — charged on Net Value (discounted)
 *   Shipping                         — flat fee below the free threshold
 *   Net Payable Amount               — Net Value + GST + Shipping
 *
 * GST is computed on the DISCOUNTED net value (not the original price), and
 * `netPayable` equals the server's binding charge (the discount + shipping
 * rules mirror admin /api/public/checkout), so every surface — cart,
 * checkout, invoice, admin, print — shows the same numbers.
 *
 * Keep in sync with admin/lib/order-summary.ts.
 */
export const FREE_SHIPPING_THRESHOLD = 3000;
export const SHIPPING_FEE = 399;

export interface SummaryItem {
  price: number; // GST-inclusive unit price
  qty: number;
  taxPercent?: number | null;
}

export interface OrderSummary {
  /** Ex-GST value before discount. */
  netPrice: number;
  /** Discount percentage (0 when no coupon). */
  discountPct: number;
  /** Ex-GST discount amount (netPrice − netValue). */
  discountAmount: number;
  /** Ex-GST value after discount — the GST base. */
  netValue: number;
  /** GST charged on netValue. */
  gstAmount: number;
  /** "18%" when every line shares a rate, else "" (mixed). */
  gstRateLabel: string;
  /** Flat fee, or 0 when free. */
  shipping: number;
  /** netValue + gstAmount + shipping. */
  netPayable: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * @param items            cart lines (GST-inclusive prices)
 * @param discountInclusive coupon discount expressed on the GST-inclusive
 *                          total (0 in the cart drawer — coupons apply at
 *                          checkout). Converted to an ex-GST discount here.
 */
export function computeOrderSummary(
  items: SummaryItem[],
  discountInclusive = 0,
): OrderSummary {
  const inclusiveTotal = items.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const discountPct = inclusiveTotal > 0 ? (discountInclusive / inclusiveTotal) * 100 : 0;

  let netPrice = 0;
  let netValue = 0;
  let gstAmount = 0;
  for (const i of items) {
    const rate = i.taxPercent ?? 18;
    const lineInclusive = i.price * (i.qty || 1);
    const lineNet = lineInclusive / (1 + rate / 100); // ex-GST, before discount
    const lineNetDiscounted = lineNet * (1 - discountPct / 100); // ex-GST, after discount
    netPrice += lineNet;
    netValue += lineNetDiscounted;
    gstAmount += lineNetDiscounted * (rate / 100); // GST on the DISCOUNTED value
  }

  // Free shipping is decided on the after-discount amount (threshold kept at
  // ₹3,000 inclusive to match the live policy + the server's binding charge).
  const afterDiscountInclusive = inclusiveTotal - discountInclusive;
  const shipping = afterDiscountInclusive >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  const rates = [...new Set(items.map((i) => i.taxPercent ?? 18))];
  const gstRateLabel = rates.length === 1 ? `${rates[0]}%` : '';

  return {
    netPrice: round2(netPrice),
    discountPct: round2(discountPct),
    discountAmount: round2(netPrice - netValue),
    netValue: round2(netValue),
    gstAmount: round2(gstAmount),
    gstRateLabel,
    shipping: round2(shipping),
    netPayable: round2(netValue + gstAmount + shipping),
  };
}
