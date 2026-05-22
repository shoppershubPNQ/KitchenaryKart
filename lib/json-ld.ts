/**
 * schema.org JSON-LD builders for product pages.
 *
 * Two structured-data blocks per PDP:
 *   1. Product — drives Google's product rich result (price + stock
 *      tile, review stars when present)
 *   2. BreadcrumbList — drives the breadcrumb chip under the page
 *      title in search results
 *
 * Important: `aggregateRating` is only included when there are real
 * customer reviews. We never expose the pseudo / cold-start rating
 * as structured data — Google penalises fake review markup, and
 * pseudo ratings are deterministic hashes that would lock us in.
 *
 * All URLs in the output are absolute (Google requires this); the
 * SITE_URL constant matches the canonical defined in app/layout.tsx.
 */
import { CATEGORY_SHORT } from './categories';
import { imgSrc } from './format';

const SITE_URL = 'https://kitchenarykart.com';

export interface ProductJsonLdInput {
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  hsnCode: string | null;
  /** Effective customer-facing price including any selected variant. */
  price: number;
  /** Pre-discount MRP, if any. Optional in the schema. */
  mrp: number | null;
  /** Primary image URL (DB-relative or absolute). */
  imageUrl: string | null;
  /** Additional gallery images (DB-relative or absolute). */
  images?: string[];
  /** Stock level. > 0 → InStock, else OutOfStock. */
  stock: number;
  /** Real reviews only — pass count=0 to omit the AggregateRating. */
  reviewCount: number;
  reviewAverage: number;
}

/**
 * Build the Product JSON-LD object. Returns null only if the input
 * is missing the absolute essentials (name + price) — callers can
 * conditionally skip rendering.
 */
export function buildProductJsonLd(p: ProductJsonLdInput): Record<string, unknown> | null {
  if (!p.name || p.price <= 0) return null;

  const pdpUrl = `${SITE_URL}/product/${encodeURIComponent(p.sku)}`;
  const absoluteImages = [p.imageUrl, ...(p.images ?? [])]
    .filter((u): u is string => !!u)
    .map((u) => toAbsoluteUrl(u))
    .slice(0, 5);

  // priceValidUntil is required by Google for Offer. Roll a year forward;
  // the actual price is re-cached on every revalidate so this is just a
  // hint that the listing is current.
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const out: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    mpn: p.sku,
    url: pdpUrl,
    brand: { '@type': 'Brand', name: 'Kitchenary Kart' },
    category: p.subcategory || p.category || undefined,
    description:
      p.description ||
      `${p.name} — commercial-grade ${p.subcategory || p.category || 'kitchen equipment'}. GST-invoiced, 12-month warranty. Pan-India delivery.`,
    image: absoluteImages.length > 0 ? absoluteImages : [`${SITE_URL}/logo.png`],
    offers: {
      '@type': 'Offer',
      url: pdpUrl,
      priceCurrency: 'INR',
      // Numeric, not string — Google's validator complains about
      // strings even though they're technically allowed.
      price: Number(p.price.toFixed(2)),
      priceValidUntil: validUntil,
      availability:
        p.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Kitchenary Kart' },
    },
  };

  if (p.mrp && p.mrp > p.price) {
    // priceSpecification with a list-price hint lets Google show the
    // "was ₹X, now ₹Y" strikethrough in some results.
    (out.offers as Record<string, unknown>).priceSpecification = {
      '@type': 'UnitPriceSpecification',
      priceType: 'https://schema.org/ListPrice',
      price: Number(p.mrp.toFixed(2)),
      priceCurrency: 'INR',
    };
  }

  // Real reviews only. Google can demote / manually penalise pages
  // that surface fake review stars in rich results.
  if (p.reviewCount > 0 && p.reviewAverage > 0) {
    out.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(p.reviewAverage.toFixed(1)),
      reviewCount: p.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return out;
}

export interface BreadcrumbJsonLdInput {
  category: string | null;
  productName: string;
  productSku: string;
}

/**
 * Build the BreadcrumbList JSON-LD. Always emits Home → Shop →
 * [Category] → Product (the category step is skipped if unknown).
 */
export function buildBreadcrumbJsonLd(b: BreadcrumbJsonLdInput): Record<string, unknown> {
  const items: Array<Record<string, unknown>> = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
  ];
  if (b.category) {
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: CATEGORY_SHORT[b.category] ?? b.category,
      item: `${SITE_URL}/shop?cat=${encodeURIComponent(b.category)}`,
    });
  }
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: b.productName,
    // The last item omits `item` per Google guidance (the user is
    // already on this page).
  });
  return {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

/**
 * Resolve a stored image URL (which may be `/images/...` or already
 * an absolute https URL) to an absolute one suitable for JSON-LD.
 */
function toAbsoluteUrl(url: string): string {
  const src = imgSrc(url);
  if (/^https?:/i.test(src)) return src;
  return `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}
