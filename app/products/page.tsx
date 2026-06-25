import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllShopProducts } from '@/lib/products';
import { CATEGORY_SHORT } from '@/lib/categories';

// HTML sitemap / browse-all page. Server-rendered list of EVERY product and
// variant as a plain <a>, grouped by category. This guarantees one static,
// crawlable internal link to every product/variant URL — the shop grid is
// client-rendered + paginated, so deep products/variants were orphaned. Linked
// from the footer.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'All Products — Commercial Kitchen Equipment',
  description:
    'Browse the full KitchenaryKart catalogue of commercial kitchen equipment by category — every product and size in one place.',
  alternates: { canonical: '/products' },
  openGraph: {
    type: 'website',
    url: '/products',
    title: 'All Products — KitchenaryKart',
    description: 'Browse the full commercial kitchen equipment catalogue by category.',
    siteName: 'KitchenaryKart',
    locale: 'en_IN',
  },
};

export default async function AllProductsPage() {
  const products = await getAllShopProducts();

  // Group by category, preserving first-seen order.
  const byCat = new Map<string, typeof products>();
  for (const p of products) {
    const c = p.category || 'Other';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(p);
  }

  return (
    <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-10 md:py-14">
      <nav className="text-xs text-muted flex items-center gap-2 mb-6 flex-wrap">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span className="opacity-60">/</span>
        <span className="text-ink font-medium">All Products</span>
      </nav>

      <h1 className="font-head text-[clamp(1.6rem,3vw,2.2rem)] font-bold text-ink mb-2">
        All Products
      </h1>
      <p className="text-[15px] text-muted mb-8 max-w-[70ch]">
        The complete KitchenaryKart catalogue of commercial kitchen equipment, by category.
        Tap any item to view details, pricing and sizes.
      </p>

      {[...byCat.entries()].map(([cat, items]) => (
        <section key={cat} className="mb-9">
          <h2 className="font-head text-[clamp(1.1rem,1.8vw,1.4rem)] font-bold text-ink mb-3">
            {CATEGORY_SHORT[cat] ?? cat}{' '}
            <span className="text-muted text-sm font-normal">({items.length})</span>
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1.5 text-sm">
            {items.map((p) => (
              <li key={p.sku} className="leading-snug">
                <Link
                  href={`/product/${encodeURIComponent(p.sku)}`}
                  className="text-ink/80 hover:text-brand transition"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
