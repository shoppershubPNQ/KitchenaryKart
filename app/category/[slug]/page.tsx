import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getCategoryContent,
  getAllCategoryContent,
} from '@/lib/category-content';
import { CATEGORY_SHORT } from '@/lib/categories';
import { getCategoryFeatured } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { buildCrumbsJsonLd } from '@/lib/json-ld';

interface Params {
  params: { slug: string };
}

export const revalidate = 600;

export function generateStaticParams() {
  return getAllCategoryContent().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const c = getCategoryContent(params.slug);
  if (!c) return { title: 'Not found' };
  const canonical = `/category/${c.slug}`;
  return {
    title: `${c.title} — KitchenaryKart`,
    description: c.metaDescription,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: `${c.title} — KitchenaryKart`,
      description: c.metaDescription,
      siteName: 'KitchenaryKart',
      locale: 'en_IN',
    },
  };
}

export default async function CategoryLandingPage({ params }: Params) {
  const content = getCategoryContent(params.slug);
  if (!content) notFound();

  const featured = await getCategoryFeatured(content.category, 12);

  const crumbsLd = buildCrumbsJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: content.title },
  ]);

  // Link into the existing client-filtered shop view for the full list.
  const shopHref = `/shop?cat=${encodeURIComponent(content.category)}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}
      />

      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-10 md:py-14">
        <nav className="text-xs text-muted flex items-center gap-2 mb-6 flex-wrap">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="opacity-60">/</span>
          <Link href="/shop" className="hover:text-brand">Shop</Link>
          <span className="opacity-60">/</span>
          <span className="text-ink font-medium">{content.title}</span>
        </nav>

        <header className="max-w-[68ch] mb-8">
          <h1 className="font-head text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold text-ink mb-4">
            {content.h1}
          </h1>
          {content.intro.map((para, i) => (
            <p key={i} className="text-[16px] leading-relaxed text-muted mb-4">
              {para}
            </p>
          ))}
          <Link
            href={shopHref}
            className="inline-flex items-center gap-2 mt-1 px-5 py-3 rounded-lg bg-brand text-white font-semibold text-[15px] hover:opacity-90 transition"
          >
            Browse all {content.title.toLowerCase()} <span aria-hidden="true">→</span>
          </Link>
        </header>

        {featured.length > 0 && (
          <section className="mb-12">
            <h2 className="font-head text-[clamp(1.25rem,2vw,1.6rem)] font-bold text-ink mb-5">
              Popular in {content.title}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {featured.map((p) => (
                <ProductCard key={p.sku} product={p} />
              ))}
            </div>
            <div className="mt-6">
              <Link href={shopHref} className="text-brand font-semibold hover:opacity-80">
                See all {content.title.toLowerCase()} →
              </Link>
            </div>
          </section>
        )}

        <section className="max-w-[68ch] bg-bg-soft rounded-xl p-6 md:p-8">
          <h2 className="font-head text-[clamp(1.2rem,1.8vw,1.5rem)] font-bold text-ink mb-4">
            {content.considerations.heading}
          </h2>
          <ul className="list-disc pl-5 space-y-2.5 text-[15px] leading-relaxed text-ink/85 mb-6">
            {content.considerations.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
          <p className="text-[15px] leading-relaxed text-muted">{content.closing}</p>
        </section>

        {/* Cross-links to the other category landing pages — keeps every
            category page internally linked (no orphans) and spreads
            crawl depth + link equity across the catalogue. */}
        <section className="mt-12">
          <h2 className="font-head text-[clamp(1.1rem,1.6vw,1.35rem)] font-bold text-ink mb-4">
            Browse other categories
          </h2>
          <div className="flex flex-wrap gap-3">
            {getAllCategoryContent()
              .filter((c) => c.slug !== content.slug)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="px-4 py-2 rounded-full border border-line text-[14px] font-medium text-ink hover:border-brand hover:text-brand transition"
                >
                  {CATEGORY_SHORT[c.category] ?? c.title}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}
