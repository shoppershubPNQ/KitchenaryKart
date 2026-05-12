import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySku, getSimilarProducts } from '@/lib/products';
import { ProductGallery } from '@/components/ProductGallery';
import { AddToInquiryButton } from '@/components/AddToInquiryButton';
import { SimilarProducts } from '@/components/SimilarProducts';
import { VariantSelector } from '@/components/VariantSelector';
import { pseudoRating, Stars } from '@/lib/rating';
import { imgSrc, inr, savingsPercent } from '@/lib/format';
import { CATEGORY_SHORT } from '@/lib/categories';

interface Params {
  params: { sku: string };
}

// ISR: cache the rendered HTML for 5 min server-side. Admin mutations bust it
// via /api/revalidate?tag=products, so users still see fresh data after edits.
export const revalidate = 300;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getProductBySku(decodeURIComponent(params.sku));
  if (!p) return { title: 'Not found' };

  const productCategory = p.subcategory || p.category || 'kitchen equipment';
  // Just the product name — the root layout's title.template appends " — KitchenaryKart".
  const title = p.name;
  const description = `${p.name} — commercial-grade ${productCategory}. GST-invoiced, 12-month warranty. Pan-India delivery.`;
  const canonicalPath = `/product/${encodeURIComponent(p.sku)}`;
  const ogImage = p.imageUrl ? imgSrc(p.imageUrl) : '/logo.png';

  return {
    title,
    description,
    keywords: p.metaKeywords ?? undefined,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'website',
      url: canonicalPath,
      title,
      description,
      siteName: 'KitchenaryKart',
      locale: 'en_IN',
      images: [{ url: ogImage, alt: p.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const requestedSku = decodeURIComponent(params.sku);
  const p = await getProductBySku(requestedSku);
  if (!p) notFound();

  // Find the currently selected variant (if URL matches a variant SKU)
  const selectedVariant = p.variants.find((v) => v.sku === requestedSku);
  const displayPrice = selectedVariant?.price ?? p.price;
  const displayStock = selectedVariant?.stock ?? null;

  // MRP shown on the page should match the variant's price (so the "SAVE %"
  // stays consistent across variants). We scale the parent's MRP by the
  // variant's price ratio; for the parent itself this is a no-op.
  const mrpRatio = p.mrp && p.price > 0 ? Number(p.mrp) / p.price : 0;
  const displayMrp = mrpRatio > 1 ? Math.round(displayPrice * mrpRatio) : p.mrp;

  // Similar products — capped at 24 (was 40) to halve the payload. The
  // SimilarProducts UI shows 5 by default and "View all" expands the rest,
  // so 24 is still plenty of headroom.
  const similar = p.category
    ? await getSimilarProducts(p.category, p.sku, 24)
    : [];

  const save = savingsPercent(displayPrice, displayMrp);
  const rating = pseudoRating(p.sku);
  const specs: Array<[string, string | null]> = [
    ['SKU', p.sku],
    ['Category', p.subcategory || p.category || null],
    ['Dimensions', p.dimensions],
    ['Power', p.power],
    ['Capacity', p.capacity],
    ['Weight', p.weight],
    ['HSN code', p.hsnCode],
    ['GST', `${p.taxPercent}%`],
  ];

  return (
    <>
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
        <span className="text-ink font-medium">{p.name}</span>
      </nav>

      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] pb-14 grid md:grid-cols-[1.1fr_1fr] grid-cols-1 gap-12">
        <ProductGallery
          name={p.name}
          images={p.images}
          imageUrl={p.imageUrl}
          sku={p.sku}
          price={p.price}
          mrp={p.mrp}
          category={p.category}
        />

        <div>
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand mb-3">
            Kitchenary Kart
          </div>
          <h1 className="text-[clamp(1.5rem,2.4vw,2rem)] mb-3.5">{p.name}</h1>
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
            {displayMrp && displayMrp > displayPrice && (
              <span className="text-base text-muted line-through">{inr(displayMrp)}</span>
            )}
            {save > 0 && (
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-success text-white tracking-wider">
                SAVE {save}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-2 mb-6">
            Price is inclusive of GST. Ex-works price available for bulk orders.
          </p>

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

          <div className="flex flex-wrap gap-3 mb-6">
            <AddToInquiryButton product={p} />
          </div>
        </div>
      </div>

      <SimilarProducts products={similar} />
    </>
  );
}
