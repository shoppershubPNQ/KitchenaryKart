/**
 * Shipping fee rule — single source of truth for the storefront.
 *
 * Free shipping once the payable amount (after any coupon discount) reaches
 * the threshold; a flat fee below it. The AUTHORITATIVE charge is recomputed
 * server-side in the admin /api/public/checkout endpoint — these constants
 * must be kept in sync with that route (and with the Merchant Center
 * shipping policy).
 */
export const FREE_SHIPPING_THRESHOLD = 3000;
export const SHIPPING_FEE = 399;

/**
 * Shipping charge for an order whose payable amount (after discount) is
 * `amountAfterDiscount`. Returns 0 (free) at/above the threshold.
 */
export function shippingFor(amountAfterDiscount: number): number {
  return amountAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
