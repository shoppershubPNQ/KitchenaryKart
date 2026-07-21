import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpotlightBySlug } from '@/lib/spotlight';
import { ProductGallery } from '@/components/ProductGallery';
import { AddToInquiryButton } from '@/components/AddToInquiryButton';
import { pseudoRating, Stars } from '@/lib/rating';
import { inr, savingsPercent } from '@/lib/format';

type Params = { params: { slug: string } };

export const revalidate = 300;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getSpotlightBySlug(params.slug);
  if (!data) return { title: 'Featured — KitchenaryKart' };
  const name = data.content.headline || data.product?.name || 'Featured product';
  const desc =
    data.content.description?.slice(0, 160) ||
    `${name} — a KitchenaryKart best-seller. Commercial-grade, GST invoice, pan-India delivery.`;
  return {
    // Bare name — the root layout's title.template appends "— KitchenaryKart"
    // once. Adding it here too produces the "… — KitchenaryKart — KitchenaryKart"
    // double-brand bug.
    title: name,
    description: desc,
    alternates: { canonical: `/featured/${params.slug}` },
    openGraph: {
      title: name,
      description: desc,
      images: data.product?.imageUrl ? [{ url: data.product.imageUrl }] : undefined,
    },
  };
}

/* ---------- tiny presentational helpers (no new deps) ---------- */

function Check({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/** A brand check inside a filled circle — used for feature lists. */
function CheckDot() {
  return (
    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
      <Check className="h-3 w-3" />
    </span>
  );
}

/** Section shell: a brand accent bar + heading so every block reads the same. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <span className="h-6 w-1.5 rounded-full bg-brand" />
        <h2 className="font-head text-xl md:text-2xl font-bold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default async function FeaturedPage({ params }: Params) {
  const data = await getSpotlightBySlug(params.slug);
  if (!data) notFound();
  const { content: c, product: p } = data;

  const name = c.headline || p?.name || 'Featured product';
  const rating = pseudoRating(p?.sku || c.slug);
  const price = p ? p.price : null;
  const mrp = p?.mrp ?? null;
  const save = price != null ? savingsPercent(price, mrp) : 0;
  const outOfStock = !!p && p.stock <= 0;
  const galleryImages = p?.images?.length ? p.images : p?.imageUrl ? [p.imageUrl] : [];

  const trust = [
    'GST Invoice',
    'Pan-India Delivery',
    'Certified & Leak-Tested',
    'Bulk / Wholesale Pricing',
  ];

  return (
    <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-6 md:py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted mb-6 flex items-center gap-1.5">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span>/</span>
        <span className="text-brand font-semibold">Featured</span>
        <span>/</span>
        <span className="text-ink font-medium truncate">{name}</span>
      </nav>

      {/* Hero: media + buy box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">
        {/* Media column — the spotlight video is listed inside the gallery
            (first thumbnail, plays in the main viewer), not a separate player. */}
        <div className="lg:sticky lg:top-24">
          {p && (galleryImages.length > 0 || c.videoUrl) && (
            <div className="rounded-2xl border border-line bg-white p-3 sm:p-4 shadow-sm">
              <ProductGallery
                name={name}
                images={galleryImages}
                imageUrl={p.imageUrl}
                sku={p.sku}
                price={price ?? 0}
                mrp={mrp}
                category={p.category}
                videoUrl={c.videoUrl}
                videoPoster={c.videoPoster}
              />
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="lg:pt-1">
          {c.eyebrow && (
            <span className="inline-flex items-center gap-1.5 bg-brand text-white text-[11px] font-head font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
              {c.eyebrow}
            </span>
          )}
          <h1 className="font-head text-2xl md:text-[2rem] font-extrabold text-ink leading-[1.15]">{name}</h1>

          <div className="flex items-center gap-2.5 mt-3.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Stars value={rating.stars} />
              <span className="text-sm text-ink font-semibold">{rating.stars.toFixed(1)}</span>
              <span className="text-sm text-muted">({rating.count})</span>
            </div>
            {p && <code className="text-xs text-muted bg-bg-soft border border-line rounded px-2 py-0.5">SKU {p.sku}</code>}
          </div>

          {/* Price card — the anchor of the buy box */}
          {price != null ? (
            <div className="mt-5 rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex items-end gap-3 flex-wrap">
                  <span className="font-head text-[2.6rem] sm:text-5xl leading-[0.95] font-extrabold text-ink tracking-tight">
                    {inr(price)}
                  </span>
                  {mrp != null && mrp > price && (
                    <span className="text-lg text-muted line-through pb-1">{inr(mrp)}</span>
                  )}
                  {save > 0 && (
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success text-sm font-head font-bold px-3.5 py-1.5 border border-success/20">
                      {save}% OFF
                    </span>
                  )}
                </div>

                {mrp != null && mrp > price && (
                  <p className="mt-2.5 text-sm font-semibold text-success">You save {inr(mrp - price)}</p>
                )}

                <div className="mt-4 pt-4 border-t border-line flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-xs text-ink-soft">
                    <Check className="h-3.5 w-3.5 text-success shrink-0" /> Inclusive of all taxes · GST invoice provided
                  </span>
                  <span className="flex items-center gap-2 text-xs text-ink-soft">
                    <Check className="h-3.5 w-3.5 text-success shrink-0" /> Ex-works price available for bulk orders
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">This featured product is being updated.</p>
          )}

          {/* Key features — headline bullets in a 2-col grid */}
          {c.keyFeatures.length > 0 && (
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
              {c.keyFeatures.map((f, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-soft leading-snug">
                  <CheckDot />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Buy actions — reuses the same cart flow as the PDP, incl. out-of-stock */}
          {p && (
            <div className="mt-7">
              <div className="flex gap-3">
                <AddToInquiryButton product={p} stock={p.stock} />
              </div>
              {outOfStock && <p className="text-xs text-muted mt-2">Currently out of stock — check back soon.</p>}
            </div>
          )}

          {/* Trust row — quick reassurance under the CTA */}
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line pt-5">
            {trust.map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                  <Check className="h-3 w-3" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Rich content — grouped on a soft panel so it doesn't read as empty white */}
      <div className="mt-12 rounded-3xl bg-bg-soft border border-line p-5 sm:p-8 md:p-10 space-y-12">
        {c.description && (
          <Section title="Product Overview">
            <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <p className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-line">{c.description}</p>
            </div>
          </Section>
        )}

        {c.specifications.length > 0 && (
          <Section title="Specifications">
            <div className="rounded-2xl border border-line bg-white overflow-hidden">
              <dl className="grid grid-cols-1 sm:grid-cols-2">
                {c.specifications.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-4 px-4 sm:px-5 py-3.5 border-b border-line odd:sm:border-r"
                  >
                    <dt className="text-[13px] font-medium text-muted uppercase tracking-wide">{s.label}</dt>
                    <dd className="text-sm font-semibold text-ink text-right">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Section>
        )}

        {c.packagingIncludes.length > 0 && (
          <Section title="What's in the Box">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {c.packagingIncludes.map((it, i) => (
                <li key={i} className="flex gap-3 items-start rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-soft">
                  <CheckDot /><span>{it}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {c.idealFor.length > 0 && (
          <Section title="Ideal For">
            <div className="flex flex-wrap gap-2.5">
              {c.idealFor.map((it, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-white text-ink font-medium text-sm px-4 py-2 rounded-full border border-line shadow-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  {it}
                </span>
              ))}
            </div>
          </Section>
        )}

        {c.whyBuy.length > 0 && (
          <Section title="Why Buy from KitchenaryKart">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {c.whyBuy.map((w, i) => (
                <div key={i} className="group rounded-2xl border border-line bg-white p-5 transition hover:shadow-md hover:-translate-y-0.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand mb-3">
                    <Check className="h-5 w-5" />
                  </span>
                  <div className="font-head font-bold text-ink text-sm mb-1">{w.title}</div>
                  <div className="text-[13.5px] text-ink-soft leading-relaxed">{w.text}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {c.comparison.rows.length > 0 && (
          <Section title="KitchenaryKart vs Others">
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3.5 text-left font-head font-bold text-ink bg-bg-soft">Feature</th>
                    <th className="px-4 py-3.5 text-left font-head font-bold text-white bg-brand">KitchenaryKart</th>
                    <th className="px-4 py-3.5 text-left font-head font-bold text-muted bg-bg-soft">Others</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {c.comparison.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-ink">{r.feature}</td>
                      <td className="px-4 py-3 text-ink font-semibold bg-brand/5">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-brand"><Check className="h-3.5 w-3.5" /></span>
                          {r.kk}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{r.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {c.careDisposal && (
          <Section title="Care & Disposal">
            <div className="flex gap-3.5 rounded-2xl border border-gold/40 bg-cream/40 p-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                   strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-gold mt-0.5" aria-hidden>
                <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" />
              </svg>
              <p className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-line">{c.careDisposal}</p>
            </div>
          </Section>
        )}
      </div>

      {/* Closing CTA band */}
      {p && price != null && (
        <div className="mt-10 rounded-3xl bg-cream border border-cream-dark p-6 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6 md:justify-between">
          <div>
            <h2 className="font-head text-xl md:text-2xl font-extrabold text-ink">Ready to order?</h2>
            <p className="text-sm text-ink-soft mt-1.5 max-w-md">
              {outOfStock
                ? 'This item is currently out of stock — check back soon or contact us for bulk availability.'
                : 'Add to cart for fast pan-India delivery, or contact us for wholesale pricing on bulk quantities.'}
            </p>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="font-head text-2xl font-extrabold text-brand">{inr(price)}</span>
              {mrp != null && mrp > price && <span className="text-base text-muted line-through">{inr(mrp)}</span>}
              {save > 0 && <span className="text-xs font-bold text-success">SAVE {save}%</span>}
            </div>
          </div>
          <div className="shrink-0 w-full md:w-auto md:min-w-[280px] flex gap-3">
            <AddToInquiryButton product={p} stock={p.stock} />
          </div>
        </div>
      )}
    </div>
  );
}
