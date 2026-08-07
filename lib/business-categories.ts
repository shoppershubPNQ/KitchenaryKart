/**
 * Business categories on the storefront — "Pizza Equipment", "Cafe Equipment".
 *
 * These cross-cut the product taxonomy, so membership can never be a column on
 * the product: one deep fryer belongs to Pizza, Burger and Cafe at once.
 * Instead each category holds a CURATED `productSkus` list, arranged by the
 * owner in the admin.
 *
 * Products are taken from `getAllShopProducts`, the same flattened list the
 * shop grid uses, so a business category inherits the listing rules already
 * agreed: child variant rows (not parents) and REAL review ratings on the
 * cards. Re-deriving the list here would have quietly dropped both.
 *
 * Ordering: the curator's order wins, with sold-out items pushed to the end.
 * Both passes are stable, so the arrangement inside each group is preserved —
 * the same property that lets the shop's sold-out-last and variety sorts
 * compose without undoing each other.
 *
 * A picked SKU is matched against `ratingSku` (the PARENT sku) as well as
 * `sku`, because the admin picker lists PARENT products while the shop list is
 * expanded into variant rows. Matching only `sku` would make every pick on a
 * variant-bearing product silently show nothing.
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

function asSkuList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
}

async function _getBusinessCategories(): Promise<BusinessCategoryMeta[]> {
  return prisma.businessCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      slug: true, name: true, description: true, imageUrl: true,
      metaTitle: true, metaDescription: true, sortOrder: true,
    },
  });
}

export const getBusinessCategories = unstable_cache(
  _getBusinessCategories,
  ['kk:business-categories'],
  { revalidate: 600, tags: ['products'] },
);

async function _getBusinessCategory(slug: string): Promise<
  (BusinessCategoryMeta & { products: PublicProduct[] }) | null
> {
  const row = await prisma.businessCategory.findFirst({ where: { slug, isActive: true } });
  if (!row) return null;

  const picked = asSkuList(row.productSkus);
  const rank = new Map<string, number>();
  picked.forEach((s, i) => { if (!rank.has(s)) rank.set(s, i); });

  const all = await getAllShopProducts();
  const chosen = all.filter((p) => rank.has(p.sku) || rank.has(p.ratingSku));

  const orderOf = (p: PublicProduct) =>
    rank.get(p.sku) ?? rank.get(p.ratingSku) ?? Number.MAX_SAFE_INTEGER;

  const products = chosen
    .slice()
    .sort((a, b) => orderOf(a) - orderOf(b))
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));

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
