import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { getProductBySku, getSimilarProducts } from '@/lib/products';
import { ProductGallery } from '@/components/ProductGallery';
import { AddToInquiryButton } from '@/components/AddToInquiryButton';
import { MobileBuyBar } from '@/components/MobileBuyBar';
import { SimilarProducts } from '@/components/SimilarProducts';
import { VariantSelector } from '@/components/VariantSelector';
import { pseudoRating, Stars } from '@/lib/rating';
import { imgSrc, inr, savingsPercent, clampDescription } from '@/lib/format';
import { CATEGORY_SHORT } from '@/lib/categories';
import { getReviewSummary, listReviews } from '@/lib/reviews';
import { ReviewsSection } from '@/components/ReviewsSection';
import { buildProductJsonLd, buildBreadcrumbJsonLd, buildFaqJsonLd } from '@/lib/json-ld';
import { PdpViewTracker } from '@/components/PdpViewTracker';
import { ScrollToTopOnMount } from '@/components/ScrollToTopOnMount';
import { PdpTrustBadges } from '@/components/PdpTrustBadges';
import { ProductFaqSection } from '@/components/ProductFaq';
import { resolveProductFaqs } from '@/lib/product-faqs';

interface Params {
  params: { sku: string };
}

// ISR: cache the rendered HTML for 5 min server-side. Admin mutations bust it
// via /api/revalidate?tag=products, so users still see fresh data after edits.
export const revalidate = 300;

/**
 * PDP <title> with the primary buyer keyword.
 *
 * Most product names already carry the product type ("Electric UFO Burger
 * Machine", "Bain Marie with Glass"), but the one high-intent modifier they
 * all lack is "Commercial" — the term restaurant/hotel buyers actually
 * search. We prepend it (unless the name already has it) so every PDP title
 * targets "commercial <product>", and keep the clean product name as the
 * on-page H1. Uses an absolute title so the layout's "%s — KitchenaryKart"
 * template doesn't double the brand.
 *
 * Length: Google truncates titles past ~60–65 chars. We keep the brand
 * suffix only when the whole title fits; for long product names we drop
 * the suffix (the brand is still in OG siteName + the domain) and, if the
 * name itself is over budget, trim it at a word boundary. This stops the
 * "title too long" Ahrefs flags without losing the keyword-first opening.
 */
const PDP_TITLE_MAX = 60;
const PDP_BRAND_SUFFIX = ' — KitchenaryKart';

function pdpSeoTitle(displayName: string): string {
  const name = displayName.trim();
  const withKeyword = /\bcommercial\b/i.test(name) ? name : `Commercial ${name}`;
  if (withKeyword.length + PDP_BRAND_SUFFIX.length <= PDP_TITLE_MAX) {
    return `${withKeyword}${PDP_BRAND_SUFFIX}`;
  }
  if (withKeyword.length <= PDP_TITLE_MAX) return withKeyword;
  const cut = withKeyword.slice(0, PDP_TITLE_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[\s–—-]+$/, '').trim();
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const requestedSku = decodeURIComponent(params.sku);
  const p = await getProductBySku(requestedSku);
  if (!p) return { title: 'Not found' };

  // Variant-aware metadata: if the URL is a variant SKU, build the
  // title from "<parent name> — <variant value>" so search engines
  // index each variant with a distinct title and OG card. This is
  // what makes per-variant SKU listings appear as their own results
  // on Google + when shared on WhatsApp / IG.
  const selectedVariant = p.variants.find((v) => v.sku === requestedSku);
  const displayName = selectedVariant
    ? `${p.name}${selectedVariant.variantType !== 'Multi' && typeof selectedVariant.axisValues === 'string' && selectedVariant.axisValues
        ? ` — ${selectedVariant.axisValues}`
        : ''}`
    : p.name;
  const productCategory = p.subcategory || p.category || 'kitchen equipment';
  const seoTitle = pdpSeoTitle(displayName);
  // Prefer the product's real description for the meta tag — unique per
  // product (better for SEO than a repeated template), cleaned and
  // clamped to ~160 chars at a word boundary. Fall back to a concise,
  // accurate template only when the product has no description.
  const fallbackDesc = `${displayName} — commercial-grade ${productCategory}. GST invoice for full Input Tax Credit. Free pan-India delivery above ₹5,000.`;
  // Prefer the product's own description; clamp WHATEVER we use (real desc or
  // the fallback template — a long product name could push the fallback over
  // 160 too) to keep every PDP under the meta-description length limit.
  const description = clampDescription(
    p.description && p.description.trim() ? p.description : fallbackDesc,
  );
  const canonicalPath = `/product/${encodeURIComponent(requestedSku)}`;
  // Prefer variant image in OG when on a variant URL, so social
  // shares show the right photo.
  const ogImageSrc = selectedVariant?.imageUrl || p.imageUrl;
  const ogImage = ogImageSrc ? imgSrc(ogImageSrc) : '/logo.png';

  return {
    title: { absolute: seoTitle },
    description,
    keywords: p.metaKeywords ?? undefined,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      url: canonicalPath,
      title: seoTitle,
      description,
      siteName: 'KitchenaryKart',
      locale: 'en_IN',
      images: [{ url: ogImage, alt: displayName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const requestedSku = decodeURIComponent(params.sku);
  const p = await getProductBySku(requestedSku);
  if (!p) {
    // Old WooCommerce product URLs used descriptive slugs (e.g.
    // /product/heavy-duty-ss-rice-strainer-...), not SKUs, so they 404'd after
    // the migration. Rather than a dead end, send the visitor (and the old link
    // equity) to a relevant search built from the slug words — a live, relevant
    // page instead of a hard 404. Falls back to /shop when the slug has no usable
    // words (e.g. /product/180). Valid SKUs never reach here (p is truthy).
    const q = requestedSku
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !/^\d+$/.test(w))
      .slice(0, 5)
      .join(' ');
    permanentRedirect(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  }

  // Find the currently selected variant (if URL matches a variant SKU)
  const selectedVariant = p.variants.find((v) => v.sku === requestedSku);
  // When the parent's own price is 0, the real price lives on the variants
  // (effective = parent price + priceModifier). Fall back to the cheapest
  // variant's price so the parent PDP never shows "₹0" — mirrors the home
  // card's withVariantDisplay and keeps the Product JSON-LD valid.
  const variantPrices = p.variants.map((v) => v.price).filter((n) => n > 0);
  const basePrice = p.price > 0 ? p.price : variantPrices.length ? Math.min(...variantPrices) : p.price;
  const displayPrice = selectedVariant?.price ?? basePrice;

  // Variant-aware gallery resolution:
  //   1. If the variant has its own images[] populated, use that
  //      ENTIRELY as the gallery (variant has dedicated photoshoot).
  //   2. Otherwise, if the variant has just an imageUrl, prepend it
  //      to the parent's gallery (variant shares the parent's other
  //      angles but has a distinct primary).
  //   3. Otherwise, fall back to the parent's gallery as-is.
  const variantImages = selectedVariant?.images ?? [];
  const variantImage = selectedVariant?.imageUrl ?? null;
  // Always surface the designated MAIN image (variant imageUrl, else parent
  // imageUrl) as BOTH the hero AND the first thumbnail — so "set as main" in
  // the admin is reflected at the front of the gallery, not buried mid-strip.
  const mainFirst = (main: string | null, imgs: string[]): string[] =>
    main ? [main, ...imgs.filter((u) => u !== main)] : imgs;
  let galleryImageUrl: string | null;
  let galleryImages: string[];
  if (variantImages.length > 0) {
    galleryImageUrl = variantImage ?? variantImages[0];
    galleryImages = mainFirst(variantImage, variantImages);
  } else if (variantImage) {
    galleryImageUrl = variantImage;
    galleryImages = mainFirst(variantImage, p.images);
  } else {
    galleryImageUrl = p.imageUrl;
    galleryImages = mainFirst(p.imageUrl, p.images);
  }

  // MRP shown on the page should match the variant's price (so the "SAVE %"
  // stays consistent across variants). We scale the parent's MRP by the
  // variant's price ratio; for the parent itself this is a no-op.
  // Per-variant MRP: prefer the shown variant's own mrp (the selected one, or
  // the variant matching the displayed base price when none is selected); fall
  // back to the product's own mrp for variant-less products.
  const shownVariant = selectedVariant ?? p.variants.find((v) => v.price === basePrice);
  const displayMrp = shownVariant ? shownVariant.mrp : p.mrp;

  // Similar products — capped at 12 (was 24) to keep the PDP payload
  // small. The SimilarProducts UI shows 5 by default and "View all"
  // expands the rest, so 12 is plenty for the carousel without
  // shipping a long JSON list + 12 product images down on every PDP
  // request. Bigger lists were noticeably slowing the page on mobile.
  const [similar, reviewSummary, reviews] = await Promise.all([
    p.category ? getSimilarProducts(p.category, p.sku, 12) : Promise.resolve([]),
    getReviewSummary(p.sku),
    listReviews(p.sku),
  ]);

  const save = savingsPercent(displayPrice, displayMrp);
  // Show real review averages when at least one approved review exists.
  // Fall back to pseudoRating only when the product has no real reviews
  // yet — keeps cold-start products from looking like they have zero
  // social proof.
  const pseudo = pseudoRating(p.sku);
  const rating = reviewSummary.count > 0
    ? { stars: reviewSummary.average, count: reviewSummary.count }
    : pseudo;

  // Variant-aware display name for h1 + breadcrumb + JSON-LD title.
  // When the URL is a variant SKU, "<parent> — <variant value>" so
  // each variant page reads as a distinct product.
  const variantQualifier =
    selectedVariant && typeof selectedVariant.axisValues === 'string'
      ? selectedVariant.axisValues
      : '';
  const displayName = variantQualifier
    ? `${p.name} — ${variantQualifier}`
    : p.name;

  // Structured data — Product + BreadcrumbList. Google parses these
  // and shows the price, stock, and (real) review stars as a rich
  // snippet under the search result. We pass the verified review
  // count/average (NOT the pseudo rating) into buildProductJsonLd so
  // we never expose fake stars to Google.
  const productLd = buildProductJsonLd({
    sku: requestedSku, // variant SKU when on a variant URL — Google attributes the snippet to the right product
    name: displayName,
    description: p.description,
    category: p.category,
    subcategory: p.subcategory,
    hsnCode: p.hsnCode,
    price: displayPrice,
    mrp: displayMrp,
    imageUrl: selectedVariant?.imageUrl ?? p.imageUrl,
    images: galleryImages,
    stock: selectedVariant?.stock ?? p.stock,
    reviewCount: reviewSummary.count,
    reviewAverage: reviewSummary.average,
  });
  const breadcrumbLd = buildBreadcrumbJsonLd({
    category: p.category,
    productName: displayName,
    productSku: requestedSku,
  });
  const specs: Array<[string, string | null]> = [
    ['SKU', requestedSku],
    ['Category', p.subcategory || p.category || null],
    ['Dimensions', p.dimensions],
    ['Power', p.power],
    ['Capacity', p.capacity],
    ['Weight', p.weight],
    ['HSN code', p.hsnCode],
    ['GST', `${p.taxPercent}%`],
  ];

  // FAQ — custom admin-authored FAQs when present, else a generated set
  // from this product's real attributes. Rendered visibly via
  // <ProductFaqSection> AND mirrored into FAQPage JSON-LD (the markup
  // must match the on-page text, so both come from the same list).
  const faqs = resolveProductFaqs(
    {
      name: displayName,
      category: p.category,
      subcategory: p.subcategory,
      dimensions: p.dimensions,
      power: p.power,
      capacity: p.capacity,
      hsnCode: p.hsnCode,
      taxPercent: p.taxPercent,
      stock: selectedVariant?.stock ?? p.stock,
    },
    p.faqs,
  );
  const faqLd = buildFaqJsonLd(faqs);

  return (
    <>
      {/* Preload the LCP image (the gallery main) so the browser starts
          fetching it before the body parser hits the <img> tag. Has to
          be the same URL string the <img> ends up using — Next.js hoists
          this <link> into <head> automatically. */}
      {galleryImageUrl && (
        <link
          rel="preload"
          as="image"
          href={imgSrc(galleryImageUrl)}
          // fetchpriority hints the network layer to send it first
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore -- fetchpriority is valid but TS DOM types lag
          fetchPriority="high"
        />
      )}

      {/* schema.org JSON-LD — Product + BreadcrumbList. dangerouslySetInnerHTML
          is the standard React way to emit a script body without escaping. */}
      {productLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* Fires Meta Pixel ViewContent + GA4 view_item once on mount.
          Pass the variant SKU + composed display name so the conversion
          event reports the actual variant the customer is viewing. */}
      <PdpViewTracker
        sku={requestedSku}
        name={displayName}
        price={displayPrice}
        category={p.category}
      />

      {/* Force scroll-to-top on every PDP entry / inter-PDP navigation
          so buyers never land at the footer when coming from a long
          shop list. Pathname-aware: also resets when clicking a
          Similar Product card from inside another PDP. */}
      <ScrollToTopOnMount />

      <nav className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-4 text-xs text-muted flex items-center gap-2 flex-wrap">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span className="opacity-60">/</span>
        <Link href="/shop" className="hover:text-brand">Shop</Link>
        {p.category && (
          <>
            <span className="opacity-60">/</span>
            <Link href={`/shop?cat=${encodeURIComponent(p.category)}`} className="hover:text-brand">
              {CATEGORY_SHORT[p.category] ?? p.category}
            </Link>
          </>
        )}
        <span className="opacity-60">/</span>
        <span className="text-ink font-medium">{displayName}</span>
      </nav>

      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] pb-6 md:pb-12 grid md:grid-cols-[1.1fr_1fr] grid-cols-1 gap-6 md:gap-12">
        <ProductGallery
          name={p.name}
          images={galleryImages}
          imageUrl={galleryImageUrl}
          sku={selectedVariant?.sku ?? p.sku}
          price={displayPrice}
          mrp={displayMrp}
          category={p.category}
        />

        <div>
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand mb-3">
            Kitchenary Kart
          </div>
          <h1 className="text-[clamp(1.5rem,2.4vw,2rem)] mb-3.5">{displayName}</h1>
                   <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-5 pb-5 border-b border-line">
            <Stars value={rating.stars} size="lg" />
            <span className="text-[14px] text-ink font-medium whitespace-nowrap">
              {rating.stars.toFixed(1)} ({rating.count})
            </span>
            <span className="text-muted text-xs">
              · Verified commercial-kitchen grade
            </span>
          </div>
          <div className="flex items-baseline gap-3.5 mb-1.5">
            <span className="font-head text-[2rem] font-bold text-ink">{inr(displayPrice)}</span>
            {(displayMrp ?? 0) > displayPrice && (
              <span className="text-base text-muted line-through">{inr(displayMrp)}</span>
            )}
            {save > 0 && (
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-success text-white tracking-wider">
                SAVE {save}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-2 mb-2">
            Price is inclusive of GST. Ex-works price available for bulk orders.
          </p>

          {/* Trust badges — sit directly under the price so buyers see
              GST/ITC, shipping, payment safety, returns, WhatsApp before
              they even look at the variant selector. Highest-conversion
              real estate on the PDP. */}
          <PdpTrustBadges />

          {p.variants.length > 1 && (
            <VariantSelector variants={p.variants} currentSku={requestedSku} />
          )}

          <div className="bg-bg-soft rounded-lg p-5 mb-6">
            <h3 className="text-[13px] font-bold tracking-wider uppercase text-brand mb-3.5">
              Specifications
            </h3>
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-4 text-[13.5px]">
              {specs.filter(([, v]) => v).map(([k, v]) => (
                <Fragment key={k}>
                  <dt className="text-muted font-bold">{k}</dt>
                  <dd className="m-0 text-ink font-medium">{v}</dd>
                </Fragment>
              ))}
            </dl>
          </div>

          <div id="pdp-buybox" className="flex flex-wrap gap-3 mb-2">
            <AddToInquiryButton
              product={p}
              stock={selectedVariant?.stock ?? p.stock}
              cartItem={{
                sku: requestedSku,
                name: displayName,
                price: displayPrice,
                mrp: displayMrp,
                taxPercent: p.taxPercent,
                imageUrl: selectedVariant?.imageUrl ?? p.imageUrl,
                category: p.category,
              }}
            />
          </div>
        </div>
      </div>

      {/* Sticky mobile buy bar — pinned price + CTA that appears once the
          in-page buy box (#pdp-buybox) scrolls out of view on phones. */}
      <MobileBuyBar
        stock={selectedVariant?.stock ?? p.stock}
        cartItem={{
          sku: requestedSku,
          name: displayName,
          price: displayPrice,
          mrp: displayMrp,
          taxPercent: p.taxPercent,
          imageUrl: selectedVariant?.imageUrl ?? p.imageUrl,
          category: p.category,
        }}
      />

      {/* Product description — admin free-text copy. Rendered as a
          full-width prose block under the main grid so it reads on
          mobile and gives the page indexable body content. Skipped
          entirely when empty. Specifications live once in the right
          column above — not repeated here. */}
      {p.description && p.description.trim() && (
        <section className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] pb-6 md:pb-12">
          <h2 className="font-head text-[clamp(1.25rem,2vw,1.6rem)] font-bold text-ink mb-3 md:mb-4">
            Product Description
          </h2>
          <div className="max-w-[1100px] text-[15.5px] leading-relaxed text-ink/85 whitespace-pre-line">
            {p.description.trim()}
          </div>
        </section>
      )}

      {/* Section order: Similar Products first (encourages cross-sell while
          the buyer is still in browse mode), then Customer Reviews (read
          before final decision). Matches Amazon / Flipkart PDP convention. */}
      <SimilarProducts products={similar} />

      <ReviewsSection
        productSku={p.sku}
        productName={p.name}
        summary={reviewSummary}
        reviews={reviews}
      />

      {/* FAQ — visible accordion whose content matches the FAQPage
          JSON-LD emitted above. Helps long-tail SEO + AI search (SGO). */}
      <ProductFaqSection faqs={faqs} />
    </>
  );
}
