import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getCategoryContent,
  getAllCategoryContent,
} from '@/lib/category-content';
import { CATEGORY_SHORT } from '@/lib/categories';
import { getCategoryProductsPage } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { buildCrumbsJsonLd, buildItemListJsonLd } from '@/lib/json-ld';

const PER_PAGE = 48;

interface Params {
  params: { slug: string };
  searchParams?: { page?: string };
}

function parsePage(sp?: { page?: string }): number {
  const n = parseInt(sp?.page ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export const revalidate = 600;

export function generateStaticParams() {
  return getAllCategoryContent().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params, searchParams }: Params): Metadata {
  const c = getCategoryContent(params.slug);
  if (!c) return { title: 'Not found' };
  const page = parsePage(searchParams);
  // Page 1 canonicalises to the clean /category/<slug>; deeper pages
  // self-canonicalise (so paginated URLs stay crawlable and distinct, but
  // ?page=1 never duplicates the base URL).
  const canonical = page > 1 ? `/category/${c.slug}?page=${page}` : `/category/${c.slug}`;
  const titleSuffix = page > 1 ? ` — Page ${page}` : '';
  return {
    title: `${c.title}${titleSuffix} — KitchenaryKart`,
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
    twitter: {
      card: 'summary_large_image',
      title: `${c.title} — KitchenaryKart`,
      description: c.metaDescription,
    },
  };
}

export default async function CategoryLandingPage({ params, searchParams }: Params) {
  const content = getCategoryContent(params.slug);
  if (!content) notFound();

  const page = parsePage(searchParams);
  const { products, total } = await getCategoryProductsPage(content.category, page, PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  // Out-of-range page (e.g. ?page=999) → 404, not a thin 200 (avoids soft-404).
  if (page > 1 && products.length === 0) notFound();

  const crumbsLd = buildCrumbsJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: content.title },
  ]);

  const itemListLd = buildItemListJsonLd(products, `${content.title}`);

  // Link into the client-filtered shop view (search/sort). The full product
  // list is now rendered + paginated ON this page so every product is a
  // crawlable link (no orphans).
  const shopHref = `/shop?cat=${encodeURIComponent(content.category)}`;
  const pageHref = (n: number) => (n <= 1 ? `/category/${content.slug}` : `/category/${content.slug}?page=${n}`);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}
      />
      {itemListLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
        />
      )}

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

        {products.length > 0 && (
          <section className="mb-12">
            <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5">
              <h2 className="font-head text-[clamp(1.25rem,2vw,1.6rem)] font-bold text-ink">
                All {content.title}{' '}
                <span className="text-muted text-base font-normal">({total})</span>
              </h2>
              {totalPages > 1 && (
                <span className="text-sm text-muted">Page {page} of {totalPages}</span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {products.map((p) => (
                <ProductCard key={p.sku} product={p} />
              ))}
            </div>

            {/* Crawlable pagination — every page is a real <a href> so Google
                reaches (and indexes) every product page. This is the fix for
                the orphan-product indexation gap. */}
            {totalPages > 1 && (
              <nav
                className="mt-8 flex flex-wrap items-center justify-center gap-2"
                aria-label={`${content.title} pages`}
              >
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    rel="prev"
                    className="px-3 py-2 rounded-md border border-line text-sm font-medium text-ink hover:border-brand hover:text-brand transition"
                  >
                    ← Prev
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={pageHref(n)}
                    aria-current={n === page ? 'page' : undefined}
                    className={`px-3.5 py-2 rounded-md border text-sm font-medium transition ${
                      n === page
                        ? 'border-brand bg-brand text-white'
                        : 'border-line text-ink hover:border-brand hover:text-brand'
                    }`}
                  >
                    {n}
                  </Link>
                ))}
                {page < totalPages && (
                  <Link
                    href={pageHref(page + 1)}
                    rel="next"
                    className="px-3 py-2 rounded-md border border-line text-sm font-medium text-ink hover:border-brand hover:text-brand transition"
                  >
                    Next →
                  </Link>
                )}
              </nav>
            )}

            <div className="mt-6 text-center">
              <Link href={shopHref} className="text-brand font-semibold hover:opacity-80">
                Search &amp; filter all {content.title.toLowerCase()} →
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

        {/* Related buying guides — category → blog internal links, so the
            guides get crawled and the category page gains topical depth. */}
        {content.relatedGuides && content.relatedGuides.length > 0 && (
          <section className="mt-12 max-w-[68ch]">
            <h2 className="font-head text-[clamp(1.1rem,1.6vw,1.35rem)] font-bold text-ink mb-4">
              Related buying guides
            </h2>
            <ul className="space-y-2">
              {content.relatedGuides.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/blog/${g.slug}`}
                    className="text-brand underline underline-offset-2 hover:opacity-80"
                  >
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

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
