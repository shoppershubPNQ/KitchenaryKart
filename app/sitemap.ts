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
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

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

  return [...staticPages, ...productPages, ...categoryPages, ...policyPages];
}
