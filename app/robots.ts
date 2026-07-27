/**
 * Dynamic robots.txt served at /robots.txt.
 *
 * Allows public pages, blocks anything that's auth-protected, admin-only or
 * an internal API. Sitemap is advertised at the bottom so crawlers find it.
 */
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://kitchenarykart.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',          // internal endpoints (auth, OTP, etc.)
          '/admin-api/',    // proxied admin endpoints
          '/account/',      // personalised, requires sign-in
          '/checkout',      // cart/checkout funnel — no SEO value
          '/_vercel/',      // Vercel telemetry endpoints
          // NB: /_next/ is intentionally NOT blocked. Google needs to crawl the
          // CSS/JS under /_next/static/ to RENDER pages for indexing (blocking
          // them hurts rendering + Core Web Vitals assessment — this is Google's
          // own guidance). Blocking it also produced the "Indexed, though blocked
          // by robots.txt" warning in GSC for a discovered .css asset.
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
