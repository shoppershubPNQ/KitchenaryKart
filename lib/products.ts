/**
 * Server-only data access for the public site.
 * Queries the same Neon DB as the admin app directly via Prisma so pages can
 * be fully server-rendered for SEO.
 */
import 'server-only';
import { cache as reactCache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';
import { getCollections } from './collections';

export interface PublicProduct {
  id: number;
  sku: string;
  name: string;
  /** Free-text product description from the admin. May be null for
   *  catalog rows that were imported without copy. */
  description: string | null;
  category: string | null;
  subcategory: string | null;
  leafCategory: string | null;
  dimensions: string | null;
  power: string | null;
  capacity: string | null;
  weight: string | null;
  color: string | null;
  hsnCode: string | null;
  price: number;
  mrp: number | null;
  taxPercent: number;
  /** Quantity in stock. 0 → out of stock. Drives JSON-LD availability
   *  and could power "Out of stock" UI in the future. */
  stock: number;
  imageUrl: string | null;
  images: string[];
  isBestseller: boolean;
  isNewArrival: boolean;
  metaKeywords: string | null;
  /** Per-product FAQ pairs, stored as JSON in the DB. Normalised to a
   *  {q,a} array (accepts {question,answer} too). Empty array when the
   *  product has no custom FAQs — the PDP falls back to generated ones. */
  faqs: ProductFaq[];
}

export interface ProductFaq {
  q: string;
  a: string;
}

/** Normalise the stored faqs JSON (which may use q/a or question/answer
 *  keys, and may be a stringified array) into a clean {q,a}[] list. */
function parseFaqs(raw: unknown): ProductFaq[] {
  let val = raw;
  if (typeof val === 'string') {
    try {
      val = JSON.parse(val);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(val)) return [];
  const out: ProductFaq[] = [];
  for (const item of val) {
    if (!item || typeof item !== 'object') continue;
    const q = (item as any).q ?? (item as any).question;
    const a = (item as any).a ?? (item as any).answer;
    if (typeof q === 'string' && typeof a === 'string' && q.trim() && a.trim()) {
      out.push({ q: q.trim(), a: a.trim() });
    }
  }
  return out;
}

/**
 * One variant of a product. A variant has its own SKU (in `skuSuffix`, an
 * abuse of the column name from the original schema where it really did hold
 * just a suffix), its own price (parent.price + priceModifier) and its own
 * stock. `axisValues` is the parsed form of variantValue — either a single
 * string ("Big") or an object ({Size: "Big", Color: "Red"}) for 2-axis.
 */
export interface PublicVariant {
  sku: string;
  variantType: string; // "Size" | "Color" | "Capacity" | "Power" | "Multi" | "Variant"
  axisValues: Record<string, string> | string; // string for 1-axis, object for multi-axis
  price: number;
  stock: number;
  /** Per-variant primary image. Null → inherit parent.imageUrl. */
  imageUrl: string | null;
  /** Per-variant gallery. Non-empty → PDP shows this instead of
   *  parent.images on variant select. Empty → inherit parent.images. */
  images: string[];
}

export interface PublicProductWithVariants extends PublicProduct {
  variants: PublicVariant[];
}

function parseAxisValues(variantType: string, raw: string | null): Record<string, string> | string {
  if (!raw) return '';
  if (variantType === 'Multi') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // fall through
    }
  }
  return raw;
}

function toPublic(p: any): PublicProduct {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description ?? null,
    category: p.category,
    subcategory: p.subcategory,
    leafCategory: p.leafCategory,
    dimensions: p.dimensions,
    power: p.power,
    capacity: p.capacity,
    weight: p.weight,
    color: p.color ?? null,
    hsnCode: p.hsnCode,
    price: Number(p.price),
    mrp: p.mrp ? Number(p.mrp) : null,
    taxPercent: Number(p.taxPercent),
    stock: typeof p.stock === 'number' ? p.stock : 0,
    imageUrl: p.imageUrl,
    images: Array.isArray(p.images) ? (p.images as string[]) : [],
    isBestseller: Boolean(p.isBestseller),
    isNewArrival: Boolean(p.isNewArrival),
    metaKeywords: p.metaKeywords ?? null,
    faqs: parseFaqs(p.faqs),
  };
}

const commonSelect = {
  id: true,
  sku: true,
  name: true,
  description: true,
  category: true,
  subcategory: true,
  leafCategory: true,
  dimensions: true,
  power: true,
  capacity: true,
  weight: true,
  color: true,
  hsnCode: true,
  price: true,
  mrp: true,
  taxPercent: true,
  stock: true,
  imageUrl: true,
  images: true,
  isBestseller: true,
  isNewArrival: true,
  metaKeywords: true,
  faqs: true,
} as const;

export async function getAllActiveProducts(): Promise<PublicProduct[]> {
  const rows = await prisma.product.findMany({
    where: { status: 'active' },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: commonSelect,
  });
  return rows.map(toPublic);
}

/**
 * Shop-grid + sitemap + search source.
 *
 * Returns a flattened list where every product variant appears as
 * its own row (Amazon-style independent variation listings), while
 * variant-less products show up as the parent. Each variant inherits
 * the parent's category / subcategory / hsnCode / keywords but
 * overrides sku / price / mrp / stock / imageUrl / name so it can be
 * searched, indexed and displayed independently.
 *
 * Composed name: "<parent.name> — <variant.variantValue>" so search
 * by either parent name OR the variant qualifier resolves the right
 * card.
 *
 * Parents with at least one variant are HIDDEN from the result (the
 * variants represent them). Without this, customers would see a
 * "Chocolate Mealting Machine" tile next to "Chocolate Mealting
 * Machine — 2 Compartment" and "Chocolate Mealting Machine — 3
 * Compartment" — three tiles for one product line.
 */
export async function getAllShopProducts(): Promise<PublicProduct[]> {
  const rows = await prisma.product.findMany({
    where: { status: 'active' },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: { ...commonSelect, variants: true },
  });

  const out: PublicProduct[] = [];

  for (const row of rows) {
    const parent = toPublic(row);
    // The shop grid (ProductCard) + search filter + sitemap never read these
    // heavy fields — but they were serialized into the /shop page's SSR/RSC
    // payload for all ~2,000 rows, pushing it past Googlebot's 2 MB limit and
    // slowing hydration. Clear them here so the shop payload stays lean.
    // (Variants below spread `...parent`, so they inherit this automatically.)
    parent.description = null;
    parent.faqs = [];
    parent.images = [];
    const variants = (row as any).variants as
      | Array<{
          variantType: string | null;
          variantValue: string | null;
          skuSuffix: string | null;
          priceModifier: unknown;
          stock: number;
          imageUrl: string | null;
        }>
      | undefined;

    if (!variants || variants.length === 0) {
      // No variants — parent is the searchable product.
      out.push(parent);
      continue;
    }

    // Scale MRP by the variant's price ratio so the SAVE % stays
    // consistent across variants (mirrors the PDP's mrpRatio logic).
    const parentPrice = parent.price;
    const mrpRatio =
      parent.mrp && parentPrice > 0 ? Number(parent.mrp) / parentPrice : 0;

    for (const v of variants) {
      if (!v.skuSuffix) continue; // skip malformed rows
      const variantPrice = parentPrice + Number(v.priceModifier ?? 0);
      const variantMrp =
        mrpRatio > 1 ? Math.round(variantPrice * mrpRatio) : parent.mrp;
      const qualifier = (v.variantValue || '').trim();
      const composedName = qualifier
        ? `${parent.name} — ${qualifier}` // em-dash
        : parent.name;

      out.push({
        ...parent,
        sku: v.skuSuffix,
        name: composedName,
        price: variantPrice,
        mrp: variantMrp,
        stock: v.stock,
        imageUrl: v.imageUrl ?? parent.imageUrl,
        // images stays as parent's gallery — variant.imageUrl is just
        // the primary; the rest of the gallery (specs photos, etc.)
        // are still shared across variants on the PDP.
      });
    }
  }

  return out;
}

/**
 * Data bundle the home page needs. Targeted queries instead of pulling the
 * full catalog — each is capped at 8–12 rows so the response payload stays
 * small.
 *
 * Resolution order for Best Seller / New Arrival:
 *   1. Admin-curated **product SKUs** from the Collection table (preferred).
 *   2. Legacy: subcategory names from Collection.subcategories.
 *   3. `isBestseller` / `isNewArrival` flags set on individual products.
 *   4. Built-in heuristics (price ≥ 2500, recent, etc.) — last-resort
 *      fallback so the home page never ships empty.
 */
export async function getHomePageData(): Promise<{
  bestsellers: PublicProduct[];
  newArrivals: PublicProduct[];
  watchShop: PublicProduct[];
}> {
  const collections = await getCollections();
  const bestSkus = collections['bestsellers']?.productSkus ?? [];
  const newSkus = collections['new-arrivals']?.productSkus ?? [];
  const bestSubs = collections['bestsellers']?.subcategories ?? [];
  const newSubs = collections['new-arrivals']?.subcategories ?? [];
  const bestActive = collections['bestsellers']?.isActive !== false;
  const newActive = collections['new-arrivals']?.isActive !== false;

  // Find products by explicit SKU list — used by the new per-product curation.
  const findByCuratedSkus = (skus: string[]) =>
    prisma.product.findMany({
      where: { status: 'active', sku: { in: skus } },
      take: 24, // generous cap — admin-controlled list
      select: commonSelect,
    });

  // Legacy subcategory-based fetch.
  const findCurated = (subs: string[]) =>
    prisma.product.findMany({
      where: { status: 'active', subcategory: { in: subs } },
      orderBy: [{ updatedAt: 'desc' }],
      take: 10,
      select: commonSelect,
    });

  const [
    curatedBestBySku,
    curatedBestBySub,
    flaggedBest,
    fallbackBest,
    curatedNewBySku,
    curatedNewBySub,
    flaggedNew,
    fallbackNew,
    photoPool,
  ] = await Promise.all([
    bestActive && bestSkus.length > 0 ? findByCuratedSkus(bestSkus) : Promise.resolve([]),
    bestActive && bestSkus.length === 0 && bestSubs.length > 0 ? findCurated(bestSubs) : Promise.resolve([]),
    prisma.product.findMany({
      where: { status: 'active', isBestseller: true },
      orderBy: [{ updatedAt: 'desc' }],
      take: 10,
      select: commonSelect,
    }),
    prisma.product.findMany({
      where: {
        status: 'active',
        price: { gte: 2500 },
        mrp: { not: null },
      },
      orderBy: [{ price: 'desc' }],
      take: 10,
      select: commonSelect,
    }),
    newActive && newSkus.length > 0 ? findByCuratedSkus(newSkus) : Promise.resolve([]),
    newActive && newSkus.length === 0 && newSubs.length > 0 ? findCurated(newSubs) : Promise.resolve([]),
    prisma.product.findMany({
      where: { status: 'active', isNewArrival: true },
      orderBy: [{ updatedAt: 'desc' }],
      take: 10,
      select: commonSelect,
    }),
    prisma.product.findMany({
      where: { status: 'active' },
      orderBy: [{ createdAt: 'desc' }],
      take: 10,
      select: commonSelect,
    }),
    prisma.product.findMany({
      where: { status: 'active', imageUrl: { not: null } },
      orderBy: [{ updatedAt: 'desc' }],
      take: 40,
      select: commonSelect,
    }),
  ]);

  // Preserve admin's manual SKU order when curated by SKU.
  function orderBySkuList(rows: any[], order: string[]) {
    const m = new Map(rows.map((r) => [r.sku, r]));
    const out: any[] = [];
    for (const sku of order) { const r = m.get(sku); if (r) out.push(r); }
    return out;
  }
  const bestRows = curatedBestBySku.length
    ? orderBySkuList(curatedBestBySku, bestSkus)
    : curatedBestBySub.length
    ? curatedBestBySub
    : flaggedBest.length
    ? flaggedBest
    : fallbackBest;
  const newRows = curatedNewBySku.length
    ? orderBySkuList(curatedNewBySku, newSkus)
    : curatedNewBySub.length
    ? curatedNewBySub
    : flaggedNew.length
    ? flaggedNew
    : fallbackNew;

  const bestsellers = bestRows.map(toPublic);
  const newArrivals = newRows.map(toPublic);

  // Watch & Shop — one photo-rich product per category, up to 4.
  const seenCats = new Set<string>();
  const watchShop: PublicProduct[] = [];
  for (const p of photoPool) {
    const cat = p.category ?? '';
    if (cat && !seenCats.has(cat)) {
      seenCats.add(cat);
      watchShop.push(toPublic(p));
      if (watchShop.length >= 4) break;
    }
  }
  // Pad if we didn't find 4 distinct categories.
  for (const p of photoPool) {
    if (watchShop.length >= 4) break;
    if (!watchShop.find((x) => x.sku === p.sku)) watchShop.push(toPublic(p));
  }

  return { bestsellers, newArrivals, watchShop };
}

// Uncached core DB fetch — supports BOTH parent SKUs and variant SKUs.
// Variant SKUs are stored on ProductVariant.skuSuffix (we re-purposed it to
// hold the full child SKU instead of just a suffix).
async function _getProductBySku(sku: string): Promise<PublicProductWithVariants | null> {
  // Try parent SKU first
  let p = await prisma.product.findUnique({
    where: { sku },
    select: { ...commonSelect, variants: true },
  });

  // Fallback: maybe this is a variant SKU pointing at a parent
  if (!p) {
    const variant = await prisma.productVariant.findFirst({
      where: { skuSuffix: sku },
      select: { productId: true },
    });
    if (variant) {
      p = await prisma.product.findUnique({
        where: { id: variant.productId },
        select: { ...commonSelect, variants: true },
      });
    }
  }
  if (!p) return null;

  const parentPrice = Number(p.price);
  const variants: PublicVariant[] = (p.variants as Array<{ variantType: string | null; variantValue: string | null; skuSuffix: string | null; priceModifier: unknown; stock: number; imageUrl: string | null; images: unknown }> | undefined)?.map((v) => ({
    sku: v.skuSuffix ?? '',
    variantType: v.variantType ?? 'Variant',
    axisValues: parseAxisValues(v.variantType ?? '', v.variantValue),
    price: parentPrice + Number(v.priceModifier ?? 0),
    stock: v.stock,
    imageUrl: v.imageUrl ?? null,
    images: Array.isArray(v.images) ? (v.images as string[]) : [],
  })) ?? [];

  // strip variants from the toPublic input to avoid leaking raw rows
  const { variants: _drop, ...rest } = p as any;
  return { ...toPublic(rest), variants };
}

// Cross-request cache: same SKU on the same Next.js server reuses the result
// for 5 min. Admin mutations call /api/revalidate?tag=products to bust it.
const _getProductBySkuCached = unstable_cache(
  _getProductBySku,
  ['kk:product-by-sku-v2'],
  { revalidate: 300, tags: ['products'] },
);

// React.cache() dedupes within a single render — so generateMetadata and the
// page body share one DB hit instead of two when both call getProductBySku.
export const getProductBySku = reactCache(_getProductBySkuCached);

/**
 * Other active products in the same main category, excluding the current
 * SKU. Used by the product detail page's Similar Products section.
 */
async function _getSimilarProducts(
  category: string,
  excludeSku: string,
  limit = 24,
): Promise<PublicProduct[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: 'active',
      category,
      sku: { not: excludeSku },
    },
    orderBy: [{ subcategory: 'asc' }, { name: 'asc' }],
    take: limit,
    select: commonSelect,
  });
  return rows.map(toPublic);
}

const _getSimilarProductsCached = unstable_cache(
  _getSimilarProducts,
  ['kk:similar-products'],
  { revalidate: 300, tags: ['products'] },
);

export const getSimilarProducts = reactCache(_getSimilarProductsCached);

/**
 * Featured products for a category landing page (/category/[slug]).
 * Prefers rows that have an image so the grid looks complete, ordered
 * by stock-in first then name. Capped at `limit`.
 */
async function _getCategoryFeatured(category: string, limit = 12): Promise<PublicProduct[]> {
  const rows = await prisma.product.findMany({
    where: { status: 'active', category, imageUrl: { not: null } },
    orderBy: [{ stock: 'desc' }, { name: 'asc' }],
    take: limit,
    select: commonSelect,
  });
  return rows.map(toPublic);
}

export const getCategoryFeatured = unstable_cache(
  _getCategoryFeatured,
  ['kk:category-featured'],
  { revalidate: 600, tags: ['products'] },
);

// Uncached core — exported under a different name so callers can pick.
async function _getCategoryCounts(): Promise<Record<string, number>> {
  const rows = await prisma.product.groupBy({
    by: ['category'],
    where: { status: 'active', category: { not: null } },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) if (r.category) out[r.category] = r._count._all;
  return out;
}

/**
 * Category counts keyed by category name. Runs in the root layout on every
 * page — wrapped in unstable_cache with a 10-min TTL since categories barely
 * change. On-demand revalidation can be added via `revalidateTag('category-counts')`
 * from an admin mutation later.
 */
export const getCategoryCounts = unstable_cache(
  _getCategoryCounts,
  ['kk:category-counts'],
  { revalidate: 600, tags: ['category-counts'] },
);

/**
 * Lean nav-tree used by the mega menu: category → list of { subName, count, thumb }.
 * Avoids pulling full product rows; just aggregates + picks one image per subcategory.
 */
export interface CategoryTreeNode {
  subName: string;
  count: number;
  thumb: string | null;
}

async function _getCategoryTree(): Promise<Record<string, CategoryTreeNode[]>> {
  const [groups, thumbs, customThumbs] = await Promise.all([
    prisma.product.groupBy({
      by: ['category', 'subcategory'],
      where: { status: 'active', category: { not: null } },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ category: string; subcategory: string; image_url: string | null }>>`
      SELECT DISTINCT ON (category, subcategory) category, subcategory, image_url
      FROM products
      WHERE status = 'active' AND image_url IS NOT NULL AND category IS NOT NULL
      ORDER BY category, subcategory, id
    `,
    // Admin-managed subcategory thumbnails (web/public/subcategories/*) live
    // in the `categories` table where `name` matches the subcategory string
    // exactly. When set they override the auto-derived product image.
    prisma.category.findMany({
      where: { imageUrl: { not: null }, isActive: true },
      select: { name: true, imageUrl: true },
    }),
  ]);

  const thumbMap = new Map<string, string | null>();
  for (const t of thumbs) thumbMap.set(`${t.category}|${t.subcategory}`, t.image_url);
  const overrideThumbBySub = new Map<string, string>();
  for (const c of customThumbs) {
    if (c.imageUrl) overrideThumbBySub.set(c.name, c.imageUrl);
  }

  const tree: Record<string, CategoryTreeNode[]> = {};
  for (const g of groups) {
    const cat = g.category as string;
    const sub = g.subcategory;
    if (!sub || !sub.trim()) continue;   // skip products with no subcategory
    (tree[cat] ||= []).push({
      subName: sub,
      count: g._count._all,
      // Curated subcategory image first; fall back to the first product image.
      thumb:
        overrideThumbBySub.get(sub) ?? thumbMap.get(`${cat}|${sub}`) ?? null,
    });
  }
  for (const cat of Object.keys(tree)) tree[cat].sort((a, b) => a.subName.localeCompare(b.subName));
  return tree;
}

/**
 * Mega-menu / slide-nav tree. Same caching treatment as `getCategoryCounts`.
 * Revalidate with `revalidateTag('category-tree')` on product create/update.
 */
export const getCategoryTree = unstable_cache(
  _getCategoryTree,
  ['kk:category-tree'],
  { revalidate: 600, tags: ['category-tree'] },
);
