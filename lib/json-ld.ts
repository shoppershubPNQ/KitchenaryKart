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

/**
 * Sitewide Organization JSON-LD. Defines the brand entity for Google
 * (logo, contact, social profiles) — feeds the knowledge panel and
 * brand-name search signals. `sameAs` should be the live social-profile
 * URLs (pass only non-empty ones; omit the array when there are none).
 */
export function buildOrganizationJsonLd(sameAs: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    name: 'Kitchenary Kart',
    legalName: 'Shoppers Hub',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      'D2C supplier of commercial kitchen equipment — bain maries, fryers, snowflake ice machines, mixers and HORECA essentials — with GST invoicing and pan-India delivery.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-98903-52455',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
  };
  const clean = sameAs.filter((u) => !!u && /^https?:/i.test(u));
  if (clean.length > 0) out.sameAs = clean;
  return out;
}

/**
 * Sitewide WebSite JSON-LD with a SearchAction so Google can show the
 * sitelinks search box. The target maps to the shop page's `?q=` filter,
 * which ShopView reads on mount — so the box actually performs a search.
 */
export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org/',
    '@type': 'WebSite',
    name: 'Kitchenary Kart',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

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
 * LocalBusiness JSON-LD for the Pune location page. Reinforces the NAP
 * (must match Google Business Profile exactly) and feeds the local
 * pack / Maps relevance. Used ONLY on the real registered location
 * page — never on generic/other-city pages.
 */
export function buildLocalBusinessJsonLd(pageSlug: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Store',
    name: 'Kitchenary Kart',
    image: `${SITE_URL}/logo.png`,
    url: `${SITE_URL}/${pageSlug}`,
    telephone: '+91 98903 52455',
    email: 'support@kitchenarykart.com',
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'A2/103, Parshwanagar, Opp. Swami Vivekanand Garden, Kondhwa Budruk',
      addressLocality: 'Pune',
      addressRegion: 'Maharashtra',
      postalCode: '411048',
      addressCountry: 'IN',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '19:00',
      },
    ],
    areaServed: 'IN',
  };
}

export interface ArticleJsonLdInput {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author: string;
}

/**
 * Build BlogPosting (Article) JSON-LD for a blog post. Drives the
 * article rich result + establishes the page as editorial content,
 * which helps it rank for informational long-tail queries.
 */
export function buildArticleJsonLd(a: ArticleJsonLdInput): Record<string, unknown> {
  const url = `${SITE_URL}/blog/${a.slug}`;
  return {
    '@context': 'https://schema.org/',
    '@type': 'BlogPosting',
    headline: a.title,
    description: a.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: a.datePublished,
    dateModified: a.dateModified || a.datePublished,
    author: { '@type': 'Organization', name: a.author, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Kitchenary Kart',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
  };
}

/**
 * Build a generic BreadcrumbList from an ordered list of crumbs. The
 * last crumb omits its URL per Google guidance (the user is already
 * there). Used by blog + category pages.
 */
export function buildCrumbsJsonLd(
  crumbs: Array<{ name: string; path?: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: `${SITE_URL}${c.path}` } : {}),
    })),
  };
}

/**
 * Build the FAQPage JSON-LD from a list of question/answer pairs.
 *
 * Google renders these as an expandable FAQ accordion directly in the
 * search result, and AI search engines (SGO) lift the answers verbatim.
 * Only emit when the SAME questions+answers are visible on the page —
 * Google requires the on-page content to match the markup, so the PDP
 * renders the identical list via <ProductFaq>.
 *
 * Returns null for an empty list so callers can skip the <script> tag.
 */
export function buildFaqJsonLd(
  faqs: Array<{ q: string; a: string }>,
): Record<string, unknown> | null {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org/',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/**
 * Build an ItemList of products for a category landing page. Each entry
 * is a full Product node (Google prefers inline Product over bare URLs
 * for merchant list results). Only emit products actually rendered on
 * the page so the markup matches visible content.
 */
export interface ItemListEntry {
  sku: string;
  name: string;
  imageUrl: string | null;
  price: number;
}

export function buildItemListJsonLd(
  items: ItemListEntry[],
  listName: string,
): Record<string, unknown> | null {
  if (!items || items.length === 0) return null;
  return {
    '@context': 'https://schema.org/',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((p, i) => {
      const pdpUrl = `${SITE_URL}/product/${encodeURIComponent(p.sku)}`;
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          sku: p.sku,
          url: pdpUrl,
          image: p.imageUrl ? toAbsoluteUrl(p.imageUrl) : `${SITE_URL}/logo.png`,
          brand: { '@type': 'Brand', name: 'Kitchenary Kart' },
          offers: {
            '@type': 'Offer',
            url: pdpUrl,
            priceCurrency: 'INR',
            price: Number(p.price.toFixed(2)),
          },
        },
      };
    }),
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
