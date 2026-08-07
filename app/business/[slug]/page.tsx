import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEFAULT_OG_IMAGES } from '@/lib/og';
import { getBusinessCategory, getBusinessCategories } from '@/lib/business-categories';
import { ProductCard } from '@/components/ProductCard';
import { buildCrumbsJsonLd, buildItemListJsonLd } from '@/lib/json-ld';

/**
 * A business-facing landing page — "Pizza Equipment", "Cafe Equipment".
 *
 * Distinct from /category/<slug>, which follows the product taxonomy. These
 * pages are how a buyer actually shops ("I am opening a pizzeria"), and they
 * deliberately overlap: the same fryer appears under Pizza, Burger and Cafe.
 *
 * The product list comes from lib/business-categories, which reuses the shop
 * grid's flattened list — so child variant rows, sold-out-last ordering and
 * real review ratings all carry over without being re-implemented here.
 */
interface Params {
  params: { slug: string };
  searchParams?: { page?: string };
}

const PER_PAGE = 48;

export const revalidate = 600;

function parsePage(sp?: { page?: string }): number {
  const n = parseInt(sp?.page ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function generateStaticParams() {
  const cats = await getBusinessCategories();
  return cats.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const cat = await getBusinessCategory(params.slug);
  if (!cat) return { title: 'Not found' };
  const page = parsePage(searchParams);
  // Page 1 canonicalises to the clean URL; deeper pages self-canonicalise so
  // they stay crawlable without duplicating the base URL.
  const canonical = page > 1 ? `/business/${cat.slug}?page=${page}` : `/business/${cat.slug}`;
  const suffix = page > 1 ? ` — Page ${page}` : '';
  // The root layout applies `%s — KitchenaryKart`, so the brand must NOT be
  // repeated here or every tab reads "… | KitchenaryKart — KitchenaryKart".
  const title = (cat.metaTitle || cat.name) + suffix;
  const description =
    cat.metaDescription ||
    cat.description ||
    `${cat.name} for commercial kitchens. Browse ${cat.products.length} products at KitchenaryKart.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, images: DEFAULT_OG_IMAGES },
  };
}

export default async function BusinessCategoryPage({ params, searchParams }: Params) {
  const cat = await getBusinessCategory(params.slug);
  if (!cat) notFound();

  const page = parsePage(searchParams);
  const total = cat.products.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const items = cat.products.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const crumbsLd = buildCrumbsJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: cat.name },
  ]);
  // Returns null for an empty list, so it must be guarded before stringifying.
  const itemListLd = buildItemListJsonLd(items, cat.name);

  return (
    <main className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }} />
      {itemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      )}

      <nav className="text-xs text-muted mb-4">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{cat.name}</span>
      </nav>

      <h1 className="font-head text-[clamp(1.5rem,3vw,2.1rem)] text-brand mb-2">{cat.name}</h1>
      {cat.description && (
        <p className="text-sm text-ink-soft max-w-3xl mb-2">{cat.description}</p>
      )}
      <p className="text-xs text-muted mb-6">
        {total} {total === 1 ? 'product' : 'products'}
        {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-muted py-12">
          No products in this category yet. Please{' '}
          <Link href="/contact" className="text-brand underline">contact us</Link> and we will help you directly.
        </p>
      ) : (
        <div className="grid kk-shop-grid">
          {items.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-10">
          {page > 1 && (
            <Link
              href={page - 1 === 1 ? `/business/${cat.slug}` : `/business/${cat.slug}?page=${page - 1}`}
              className="px-3 py-1.5 text-sm border border-line rounded hover:border-brand hover:text-brand"
            >
              Previous
            </Link>
          )}
          <span className="text-xs text-muted px-2">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/business/${cat.slug}?page=${page + 1}`}
              className="px-3 py-1.5 text-sm border border-line rounded hover:border-brand hover:text-brand"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
