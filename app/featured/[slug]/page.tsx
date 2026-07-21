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

/** Small section shell so every block reads the same. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="font-head text-xl md:text-2xl font-bold text-ink mb-5">{title}</h2>
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

  return (
    <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-6 md:py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted mb-6 flex items-center gap-1.5">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span>/</span>
        <span className="text-ink font-medium truncate">{name}</span>
      </nav>

      {/* Hero: media + buy box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Media column */}
        <div className="space-y-5">
          {c.videoUrl && (
            <div className="rounded-xl overflow-hidden bg-black border border-line" style={{ aspectRatio: '16 / 9' }}>
              {/* Native video — spotlight demo. Poster shows before play. */}
              <video
                src={c.videoUrl}
                poster={c.videoPoster || undefined}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain bg-black"
              />
            </div>
          )}
          {p && galleryImages.length > 0 && (
            <ProductGallery
              name={name}
              images={galleryImages}
              imageUrl={p.imageUrl}
              sku={p.sku}
              price={price ?? 0}
              mrp={mrp}
              category={p.category}
            />
          )}
        </div>

        {/* Buy box */}
        <div className="lg:pt-2">
          {c.eyebrow && (
            <span className="inline-block bg-brand/10 text-brand text-[11px] font-head font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              {c.eyebrow}
            </span>
          )}
          <h1 className="font-head text-2xl md:text-3xl font-bold text-ink leading-tight">{name}</h1>

          <div className="flex items-center gap-2 mt-3">
            <Stars value={rating.stars} />
            <span className="text-sm text-ink font-medium">{rating.stars.toFixed(1)} ({rating.count})</span>
            {p && <code className="text-xs text-muted ml-2">SKU {p.sku}</code>}
          </div>

          {price != null ? (
            <div className="mt-5 flex items-baseline gap-3 flex-wrap">
              <span className="font-head text-3xl font-bold text-ink">{inr(price)}</span>
              {mrp != null && mrp > price && (
                <span className="text-lg text-muted line-through">{inr(mrp)}</span>
              )}
              {save > 0 && (
                <span className="text-sm font-bold text-success tracking-wide">SAVE {save}%</span>
              )}
              <span className="w-full text-xs text-muted mt-1">Price inclusive of GST. Ex-works price available for bulk orders.</span>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">This featured product is being updated.</p>
          )}

          {/* Key features — the headline bullets, right under the price */}
          {c.keyFeatures.length > 0 && (
            <ul className="mt-6 space-y-2">
              {c.keyFeatures.map((f, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-soft">
                  <span className="text-brand mt-0.5 shrink-0">✓</span>
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
        </div>
      </div>

      {/* Rich content sections */}
      <div className="mt-12 space-y-10 max-w-4xl">
        {c.description && (
          <Section title="Description">
            <p className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-line">{c.description}</p>
          </Section>
        )}

        {c.specifications.length > 0 && (
          <Section title="Specifications">
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {c.specifications.map((s, i) => (
                    <tr key={i} className={i % 2 ? 'bg-bg-soft' : 'bg-white'}>
                      <td className="px-4 py-2.5 font-semibold text-ink w-1/3">{s.label}</td>
                      <td className="px-4 py-2.5 text-ink-soft">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {c.packagingIncludes.length > 0 && (
          <Section title="Packaging includes">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {c.packagingIncludes.map((it, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-soft">
                  <span className="text-brand mt-0.5 shrink-0">▪</span><span>{it}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {c.idealFor.length > 0 && (
          <Section title="Ideal for">
            <div className="flex flex-wrap gap-2">
              {c.idealFor.map((it, i) => (
                <span key={i} className="bg-cream text-ink text-sm px-3.5 py-1.5 rounded-full border border-line">{it}</span>
              ))}
            </div>
          </Section>
        )}

        {c.whyBuy.length > 0 && (
          <Section title="Why buy from KitchenaryKart">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {c.whyBuy.map((w, i) => (
                <div key={i} className="rounded-lg border border-line p-4 bg-white">
                  <div className="font-head font-bold text-ink text-sm mb-1">{w.title}</div>
                  <div className="text-sm text-ink-soft leading-relaxed">{w.text}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {c.careDisposal && (
          <Section title="Care & disposal">
            <p className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-line">{c.careDisposal}</p>
          </Section>
        )}

        {c.comparison.rows.length > 0 && (
          <Section title="KitchenaryKart vs Others">
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-ink text-white">
                    <th className="px-4 py-3 text-left font-semibold">Feature</th>
                    <th className="px-4 py-3 text-left font-semibold text-white bg-brand">KitchenaryKart</th>
                    <th className="px-4 py-3 text-left font-semibold">Others</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {c.comparison.rows.map((r, i) => (
                    <tr key={i} className={i % 2 ? 'bg-bg-soft' : 'bg-white'}>
                      <td className="px-4 py-2.5 font-medium text-ink">{r.feature}</td>
                      <td className="px-4 py-2.5 text-ink font-semibold bg-brand/5">{r.kk}</td>
                      <td className="px-4 py-2.5 text-muted">{r.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
