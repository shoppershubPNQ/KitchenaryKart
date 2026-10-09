import { Suspense } from 'react';
import { getAllShopProducts, getCategoryCounts } from '@/lib/products';
import { getCollections } from '@/lib/collections';
import { ShopView } from '@/components/ShopView';

export const metadata = {
  title: 'Shop',
  description:
    'Browse 2,000+ commercial kitchen equipment SKUs — filter by category, search by name or SKU, and build your inquiry list.',
  alternates: { canonical: '/shop' },
};

export const revalidate = 300;

interface SearchParams {
  collection?: string;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const collectionSlug = searchParams?.collection;
  const [products, counts, collections] = await Promise.all([
    // Shop list is variant-aware: variants of the same parent appear
    // as separate cards (Amazon-style) so each is individually
    // searchable + shoppable. See lib/products.getAllShopProducts.
    getAllShopProducts(),
    getCategoryCounts(),
    getCollections(),
  ]);

  // When the URL carries `?collection=bestsellers` (or `new-arrivals`),
  // pre-filter the catalog to the matching curated SKUs (with a fallback to
  // the `isBestseller` / `isNewArrival` product flags if the curated list is
  // empty), so the shop grid shows only that collection.
  let scoped = products;
  let collectionLabel: string | null = null;
  if (collectionSlug) {
    const rule = collections[collectionSlug];
    if (rule) {
      collectionLabel = rule.name;
      const curatedSkus = new Set(rule.productSkus);
      if (curatedSkus.size > 0) {
        // ratingSku = the parent SKU, so every size of a curated product shows.
        scoped = products.filter((p) => curatedSkus.has(p.ratingSku) || curatedSkus.has(p.sku));
      } else {
        // No curated SKUs yet — fall back to the per-product flag.
        const flagKey =
          collectionSlug === 'bestsellers' ? 'isBestseller' : 'isNewArrival';
        scoped = products.filter((p: any) => p[flagKey]);
      }
    }
  }

  // The curated Best Seller / New Arrival SKUs the home page shows — for a search that asks for the list
  // ("top selling", "बेस्ट सेलर", "new arrivals") and for the two tick boxes. Empty = the product flags.
  const curated = (slug: 'bestsellers' | 'new-arrivals') => {
    const rule = collections[slug];
    return rule && rule.isActive !== false ? rule.productSkus : [];
  };
  const collectionSkus = { bestsellers: curated('bestsellers'), 'new-arrivals': curated('new-arrivals') };
  // A search that finds nothing we sell shows our own brands instead of an empty page (owner 2026-10-09,
  // "branding ke liye"): the VAMA cream charger and the Veratti immersion blenders, in-stock first.
  const brandPicks = [
    ...products.filter((p) => /\bvama\b/i.test(p.name) && /cream charger/i.test(p.name)),
    ...products.filter((p) => /\bveratti\b/i.test(p.name) && /immersion blender/i.test(p.name)),
  ]
    .sort((a, b) => (a.stock > 0 ? 0 : 1) - (b.stock > 0 ? 0 : 1))
    .slice(0, 8);
  const collectionNames = {
    bestsellers: collections['bestsellers']?.name || 'Best Seller',
    'new-arrivals': collections['new-arrivals']?.name || 'New Arrival',
  };

  return (
    <Suspense
      fallback={
        <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-10 text-muted">Loading catalog…</div>
      }
    >
      <ShopView
        products={scoped}
        categoryCounts={counts}
        collectionLabel={collectionLabel}
        collectionSlug={collectionSlug ?? null}
        collectionSkus={collectionSkus}
        collectionNames={collectionNames}
        brandPicks={brandPicks}
      />
    </Suspense>
  );
}
