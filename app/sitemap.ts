/**
 * Dynamic sitemap.xml served at /sitemap.xml.
 *
 * Next.js routes any default-export from app/sitemap.ts to /sitemap.xml at
 * build/render time. We list:
 *   - the homepage, shop and contact/about pages (static, high priority)
 *   - every active product (high priority, weekly change)
 *   - every active top-level category as a shop?category=… URL
 *   - every active policy page
 *
 * Submit https://kitchenarykart.com/sitemap.xml to Google Search Console once
 * the site is verified there — it accelerates discovery of new SKUs.
 */
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { imgSrc } from '@/lib/format';
import { getAllShopProducts } from '@/lib/products';
import { getActivePolicies } from '@/lib/policies';
import { getAllPosts } from '@/lib/blog';
import { getAllCategoryContent } from '@/lib/category-content';
import { getAllLandingPages } from '@/lib/landing-pages';

const BASE_URL = 'https://kitchenarykart.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Variant-aware list: each variant SKU gets its own sitemap entry
  // so Google can crawl and rank them independently.
  const [products, policies, modRows] = await Promise.all([
    getAllShopProducts(),
    getActivePolicies(),
    // Real per-product last-modified dates. Emitting a fresh `now` for every
    // URL on each build makes Google distrust (and ignore) the whole sitemap's
    // lastmod; accurate dates let it prioritise crawling only what changed.
    // Variants have no updatedAt of their own, so they inherit the parent's.
    prisma.product.findMany({
      where: { status: 'active' },
      select: { sku: true, updatedAt: true, variants: { select: { skuSuffix: true } } },
    }),
  ]);

  const now = new Date();

  // sku (parent OR variant skuSuffix) → the product's real updatedAt.
  const skuLastMod = new Map<string, Date>();
  for (const r of modRows) {
    skuLastMod.set(r.sku, r.updatedAt);
    for (const v of r.variants) if (v.skuSuffix) skuLastMod.set(v.skuSuffix, r.updatedAt);
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/products`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Dedicated category landing pages (server-rendered, individually
  // indexable — unlike the ?cat= filtered shop views).
  const categoryLandingPages: MetadataRoute.Sitemap = getAllCategoryContent().map((c) => ({
    url: `${BASE_URL}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Supplier/intent landing pages + the Pune local page — high-intent
  // role/role+location URLs.
  const landingPages: MetadataRoute.Sitemap = getAllLandingPages().map((p) => ({
    url: `${BASE_URL}/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: p.isLocal ? 0.8 : 0.75,
  }));

  // Blog posts (buying guides) — authored in lib/blog.ts.
  const blogPages: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date((post.updated ?? post.date) + 'T00:00:00'),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/product/${encodeURIComponent(p.sku)}`,
    lastModified: skuLastMod.get(p.sku) ?? now,
    changeFrequency: 'weekly',
    priority: 0.8,
    // Image sitemap: expose each product's image so Google Image Search can
    // index it — a purchase-intent surface for kitchen equipment. Emits
    // <image:image><image:loc> per URL. Invisible: sitemap XML only, no page
    // change. imgSrc returns an absolute (Cloudinary) URL; skip imageless rows.
    ...(p.imageUrl ? { images: [imgSrc(p.imageUrl)] } : {}),
  }));

  // NOTE: we intentionally do NOT emit `/shop?category=…` filter URLs here —
  // they canonical to bare `/shop` (so Ahrefs flagged them as non-canonical in
  // the sitemap), and the real, indexable `/category/<slug>` landing pages are
  // already included above (categoryLandingPages).

  const policyPages: MetadataRoute.Sitemap = policies.map((policy) => ({
    url: `${BASE_URL}/policy/${policy.slug}`,
    lastModified: policy.updatedAt ? new Date(policy.updatedAt) : now,
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  return [
    ...staticPages,
    ...landingPages,
    ...categoryLandingPages,
    ...blogPages,
    ...productPages,
    ...policyPages,
  ];
}
