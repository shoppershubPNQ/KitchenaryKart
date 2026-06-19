/**
 * Conversion tracking helpers — Meta Pixel + Google Ads / GA4.
 *
 * All three integrations are env-gated. If `NEXT_PUBLIC_META_PIXEL_ID`,
 * `NEXT_PUBLIC_GOOGLE_ADS_ID` or `NEXT_PUBLIC_GA4_ID` is unset, the
 * corresponding tag never loads and these helpers become no-ops. That
 * lets us ship the code before the marketing team has created the
 * pixel/account.
 *
 * Standard e-commerce events mirrored across all three:
 *   PageView         — auto-fired by the base pixel
 *   ViewContent      — PDP load
 *   AddToCart        — heart click + Add to cart
 *   InitiateCheckout — Checkout button on the cart drawer / page
 *   Purchase         — after Razorpay verifies the payment
 *
 * We intentionally avoid an external dependency (react-facebook-pixel,
 * etc.) — the wrapper is tiny and removing a runtime dep keeps the JS
 * bundle leaner.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || '';

export function hasMetaPixel(): boolean {
  return Boolean(META_PIXEL_ID);
}
export function hasGoogleTag(): boolean {
  return Boolean(GOOGLE_ADS_ID || GA4_ID);
}

interface ProductPayload {
  sku: string;
  name: string;
  price: number;
  category?: string | null;
  quantity?: number;
}

/** ViewContent — fires on every PDP load (called from a client effect). */
export function trackViewContent(p: ProductPayload) {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_ids: [p.sku],
      content_name: p.name,
      content_type: 'product',
      content_category: p.category ?? undefined,
      value: p.price,
      currency: 'INR',
    });
  }

  if (window.gtag) {
    window.gtag('event', 'view_item', {
      currency: 'INR',
      value: p.price,
      items: [
        {
          item_id: p.sku,
          item_name: p.name,
          item_category: p.category ?? undefined,
          price: p.price,
          quantity: 1,
        },
      ],
    });
  }
}

/** AddToCart — fires from lib/cart.addToCart. */
export function trackAddToCart(p: ProductPayload) {
  if (typeof window === 'undefined') return;
  const qty = p.quantity ?? 1;

  if (window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [p.sku],
      content_name: p.name,
      content_type: 'product',
      value: p.price * qty,
      currency: 'INR',
    });
  }

  if (window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: 'INR',
      value: p.price * qty,
      items: [
        {
          item_id: p.sku,
          item_name: p.name,
          item_category: p.category ?? undefined,
          price: p.price,
          quantity: qty,
        },
      ],
    });
  }
}

interface CartPayload {
  items: Array<{ sku: string; name: string; price: number; quantity: number }>;
  total: number;
}

/** InitiateCheckout — fires when the user clicks "Checkout". */
export function trackInitiateCheckout(c: CartPayload) {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      content_ids: c.items.map((i) => i.sku),
      contents: c.items.map((i) => ({ id: i.sku, quantity: i.quantity })),
      num_items: c.items.reduce((s, i) => s + i.quantity, 0),
      value: c.total,
      currency: 'INR',
    });
  }

  if (window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'INR',
      value: c.total,
      items: c.items.map((i) => ({
        item_id: i.sku,
        item_name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    });
  }
}

interface PurchasePayload {
  orderNumber: string;
  /** True amount the customer was charged — after-discount subtotal +
   *  shipping. This is the value GA4/Ads revenue must reflect, NOT the
   *  bare line-item subtotal (which omits the ₹399 shipping fee). */
  total: number;
  /** Shipping fee charged on this order (0 when free). Reported to GA4 as
   *  the `shipping` param so it's broken out of `value` in reporting. */
  shipping?: number;
  /** Coupon code applied at checkout, if any. */
  coupon?: string | null;
  items: Array<{ sku: string; name: string; price: number; quantity: number }>;
}

/** Purchase — fires after Razorpay verifies payment. */
export function trackPurchase(p: PurchasePayload) {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      content_ids: p.items.map((i) => i.sku),
      contents: p.items.map((i) => ({ id: i.sku, quantity: i.quantity })),
      num_items: p.items.reduce((s, i) => s + i.quantity, 0),
      value: p.total,
      currency: 'INR',
    });
  }

  if (window.gtag) {
    // GA4 purchase event. `value` is the full charged total (incl.
    // shipping); `shipping` and `coupon` are broken out per the GA4
    // recommended-event spec so reporting attributes them correctly.
    window.gtag('event', 'purchase', {
      transaction_id: p.orderNumber,
      currency: 'INR',
      value: p.total,
      shipping: p.shipping ?? undefined,
      coupon: p.coupon || undefined,
      items: p.items.map((i) => ({
        item_id: i.sku,
        item_name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    });
    // Google Ads conversion (only fires if AW- ID is configured)
    if (GOOGLE_ADS_ID) {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_ADS_ID}/purchase`,
        transaction_id: p.orderNumber,
        value: p.total,
        currency: 'INR',
      });
    }
  }
}
