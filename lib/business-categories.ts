/**
 * Business categories on the storefront — "Pizza Equipment", "Cafe Equipment".
 *
 * These cross-cut the product taxonomy, so membership is a RULE evaluated at
 * read time rather than a column on the product:
 *
 *     (products whose subcategory is in `subcategories`)
 *   + (products whose sku — or PARENT sku — is in `productSkus`)
 *   - (products whose sku or parent sku is in `excludeSkus`)
 *
 * Products are taken from `getAllShopProducts`, the same flattened list the
 * shop grid uses, so a business category inherits every listing rule already
 * agreed: child variant rows (not parents), sold-out items last, and REAL
 * review ratings on the cards. Re-deriving the list here would have quietly
 * dropped all three.
 *
 * Manual SKUs are matched against `ratingSku` as well as `sku` because the
 * curator picks from the admin product list, which holds PARENT skus, while
 * the shop list is expanded into variant rows. Matching only `sku` would make
 * every manual pick on a variant-bearing product silently do nothing.
 */
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import { getAllShopProducts, type PublicProduct } from '@/lib/products';

export interface BusinessCategoryMeta {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
}

function asList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
}

async function _getBusinessCategories(): Promise<BusinessCategoryMeta[]> {
  const rows = await prisma.businessCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      slug: true, name: true, description: true, imageUrl: true,
      metaTitle: true, metaDescription: true, sortOrder: true,
    },
  });
  return rows;
}

export const getBusinessCategories = unstable_cache(
  _getBusinessCategories,
  ['kk:business-categories'],
  { revalidate: 600, tags: ['products'] },
);

async function _getBusinessCategory(slug: string): Promise<
  (BusinessCategoryMeta & { products: PublicProduct[] }) | null
> {
  const row = await prisma.businessCategory.findFirst({
    where: { slug, isActive: true },
  });
  if (!row) return null;

  const subs = new Set(asList(row.subcategories));
  const include = new Set(asList(row.productSkus));
  const exclude = new Set(asList(row.excludeSkus));

  const all = await getAllShopProducts();
  const products = all.filter((p) => {
    if (exclude.has(p.sku) || exclude.has(p.ratingSku)) return false;
    if (include.has(p.sku) || include.has(p.ratingSku)) return true;
    return !!p.subcategory && subs.has(p.subcategory);
  });

  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    sortOrder: row.sortOrder,
    products,
  };
}

export function getBusinessCategory(slug: string) {
  return unstable_cache(
    () => _getBusinessCategory(slug),
    ['kk:business-category', slug],
    { revalidate: 600, tags: ['products'] },
  )();
}
