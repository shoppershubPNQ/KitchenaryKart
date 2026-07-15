/**
 * Shared renderer for supplier/intent landing pages and the Pune local
 * page (see lib/landing-pages.ts). Each thin route file calls
 * <SupplierLanding slug="..."/> and exports supplierMetadata(slug) from
 * generateMetadata.
 *
 * Server component. Emits Breadcrumb + FAQPage JSON-LD (and
 * LocalBusiness for the Pune page), renders unique copy, a cross-
 * category featured product grid, trust block, internal links to
 * category landing pages, and CTAs.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEFAULT_OG_IMAGES } from '@/lib/og';
import { getLandingPage } from '@/lib/landing-pages';
import { getCategoryFeatured } from '@/lib/products';
import { slugForCategory } from '@/lib/category-content';
import { CATEGORY_SHORT } from '@/lib/categories';
import { ProductCard } from '@/components/ProductCard';
import { ProductFaqSection } from '@/components/ProductFaq';
import {
  buildCrumbsJsonLd,
  buildFaqJsonLd,
  buildLocalBusinessJsonLd,
} from '@/lib/json-ld';

const WHATSAPP_HREF =
  'https://wa.me/919890352455?text=' +
  encodeURIComponent("Hi Kitchenary Kart, I'd like a quote for commercial kitchen equipment.");

export function supplierMetadata(slug: string): Metadata {
  const p = getLandingPage(slug);
  if (!p) return { title: 'Not found' };
  const canonical = `/${p.slug}`;
  return {
    title: `${p.title} — KitchenaryKart`,
    description: p.metaDescription,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: `${p.title} — KitchenaryKart`,
      description: p.metaDescription,
      siteName: 'KitchenaryKart',
      locale: 'en_IN',
      images: DEFAULT_OG_IMAGES,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${p.title} — KitchenaryKart`,
      description: p.metaDescription,
    },
  };
}

export async function SupplierLanding({ slug }: { slug: string }) {
  const page = getLandingPage(slug);
  if (!page) notFound();

  // Pull a few featured products from each relevant category, then
  // merge + dedupe by sku and cap the grid.
  const perCat = await Promise.all(
    page.featuredCategories.map((c) => getCategoryFeatured(c, 4)),
  );
  const seen = new Set<string>();
  const featured = [];
  for (const list of perCat) {
    for (const p of list) {
      if (seen.has(p.sku)) continue;
      seen.add(p.sku);
      featured.push(p);
      if (featured.length >= 8) break;
    }
    if (featured.length >= 8) break;
  }

  // Internal links to category landing pages (only those that have one).
  const catLinks = page.featuredCategories
    .map((c) => ({ category: c, slug: slugForCategory(c) }))
    .filter((x): x is { category: string; slug: string } => !!x.slug);

  const crumbsLd = buildCrumbsJsonLd([
    { name: 'Home', path: '/' },
    { name: page.h1 },
  ]);
  const faqLd = buildFaqJsonLd(page.faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      {page.isLocal && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildLocalBusinessJsonLd(page.slug)),
          }}
        />
      )}

      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-10 md:py-14">
        <nav className="text-xs text-muted flex items-center gap-2 mb-6 flex-wrap">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="opacity-60">/</span>
          <span className="text-ink font-medium">{page.h1}</span>
        </nav>

        <header className="max-w-[70ch] mb-8">
          <h1 className="font-head text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold text-ink mb-4">
            {page.h1}
          </h1>
          {page.intro.map((para, i) => (
            <p key={i} className="text-[16px] leading-relaxed text-muted mb-4">
              {para}
            </p>
          ))}
          <div className="flex flex-wrap gap-3 mt-2">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-brand text-white font-semibold text-[15px] hover:opacity-90 transition"
            >
              Browse the catalogue <span aria-hidden="true">→</span>
            </Link>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-line text-ink font-semibold text-[15px] hover:border-brand hover:text-brand transition"
            >
              WhatsApp for a quote
            </a>
          </div>
        </header>

        {/* What we supply */}
        <section className="max-w-[70ch] mb-12">
          <h2 className="font-head text-[clamp(1.25rem,2vw,1.6rem)] font-bold text-ink mb-4">
            {page.supplies.heading}
          </h2>
          <ul className="list-disc pl-5 space-y-2.5 text-[15px] leading-relaxed text-ink/85">
            {page.supplies.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </section>

        {/* Featured products across relevant categories */}
        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="font-head text-[clamp(1.25rem,2vw,1.6rem)] font-bold text-ink mb-5">
              Popular products
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {featured.map((p) => (
                <ProductCard key={p.sku} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Internal links to category landing pages */}
        {catLinks.length > 0 && (
          <section className="mb-12">
            <h2 className="font-head text-[clamp(1.1rem,1.6vw,1.35rem)] font-bold text-ink mb-4">
              Shop by category
            </h2>
            <div className="flex flex-wrap gap-3">
              {catLinks.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="px-4 py-2 rounded-full border border-line text-[14px] font-medium text-ink hover:border-brand hover:text-brand transition"
                >
                  {CATEGORY_SHORT[c.category] ?? c.category}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Keyword-rich internal links — specific equipment + location
            long-tail phrases (e.g. the Pune page). */}
        {page.intentLinks && page.intentLinks.links.length > 0 && (
          <section className="max-w-[70ch] mb-12">
            <h2 className="font-head text-[clamp(1.1rem,1.6vw,1.35rem)] font-bold text-ink mb-4">
              {page.intentLinks.heading}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-[15px] leading-relaxed">
              {page.intentLinks.links.map((l) => (
                <li key={l.href + l.label} className="list-disc ml-5">
                  <Link href={l.href} className="text-ink/85 hover:text-brand transition">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Why buy from us — shared, factual trust block */}
        <section className="max-w-[70ch] bg-bg-soft rounded-xl p-6 md:p-8 mb-4">
          <h2 className="font-head text-[clamp(1.2rem,1.8vw,1.5rem)] font-bold text-ink mb-4">
            Why buy from Kitchenary Kart
          </h2>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-[15px] leading-relaxed text-ink/85">
            <li><strong className="text-ink">GST invoice</strong> on every order — full Input Tax Credit</li>
            <li><strong className="text-ink">Direct brand pricing</strong> — no middleman markup</li>
            <li><strong className="text-ink">Free pan-India delivery</strong> above ₹5,000</li>
            <li><strong className="text-ink">Bulk &amp; HORECA pricing</strong> on request</li>
            <li><strong className="text-ink">Secure payments</strong> — UPI, Card &amp; EMI</li>
            <li><strong className="text-ink">7-day returns</strong> on manufacturing defects</li>
          </ul>
        </section>
      </div>

      {/* FAQ — reuses the PDP accordion; content matches the FAQ JSON-LD. */}
      <ProductFaqSection faqs={page.faqs} />
    </>
  );
}
