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
          '/_next/',        // build assets — Google can fetch on demand
          '/_vercel/',      // Vercel telemetry endpoints
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
