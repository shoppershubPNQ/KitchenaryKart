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
import { getAllShopProducts, getCategoryTree } from '@/lib/products';
import { getActivePolicies } from '@/lib/policies';
import { getAllPosts } from '@/lib/blog';
import { getAllCategoryContent } from '@/lib/category-content';
import { getAllLandingPages } from '@/lib/landing-pages';

const BASE_URL = 'https://kitchenarykart.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Variant-aware list: each variant SKU gets its own sitemap entry
  // so Google can crawl and rank them independently.
  const [products, categoryTree, policies] = await Promise.all([
    getAllShopProducts(),
    getCategoryTree(),
    getActivePolicies(),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
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
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // categoryTree is a Record<category, subcategoryNodes[]>. We use the
  // top-level category keys as ?category=… filters on the shop page.
  const categoryPages: MetadataRoute.Sitemap = Object.keys(categoryTree).map((category) => ({
    url: `${BASE_URL}/shop?category=${encodeURIComponent(category)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

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
    ...categoryPages,
    ...policyPages,
  ];
}
