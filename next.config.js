/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Strip console.log from production bundles (errors/warnings stay).
  // Trims a small amount of JS and silences noisy dev-only logging
  // that occasionally leaks into client components.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  // Enable experimental package-import optimization so Tree-shaking
  // works better for icon / utility libraries (no-op for libraries we
  // don't use, but cheap insurance for the future).
  experimental: {
    optimizePackageImports: ['@vercel/analytics', '@vercel/speed-insights'],
  },
  images: {
    // Admin serves product images at /images/{sku}/... via the website static server today,
    // but once this Next app runs on :3001 it needs to know where to load them from.
    // In dev we proxy through /images/* to disk via rewrites (see below).
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/images/**' },
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/images/**' },
      // Cloudinary — admin uploads banners, reels (poster jpgs), product
      // images here. Allowing the whole upload path lets next/image optimise
      // banners and reel posters with on-the-fly webp/avif + responsive
      // srcset, which is the biggest mobile perf win on the home page.
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/ddvay7jt0/**' },
    ],
  },
  async rewrites() {
    // Forward /api/public/* to the admin app so the public-facing inquiry/orders API
    // is still centralised in admin. Products can also be fetched directly from the DB
    // in server components, but the inquiry POST still goes via admin.
    const adminBase = process.env.ADMIN_API_BASE || 'http://localhost:3000';
    return [
      { source: '/admin-api/:path*', destination: `${adminBase}/api/:path*` },
    ];
  },
  async redirects() {
    // Legacy policy URLs (no /policy prefix) that Google indexed before
    // the /policy/[slug] structure was introduced. Permanent (301) so
    // search engines update their index and pass the link equity through
    // to the live pages. Fixes 404s like:
    //   kitchenarykart.com/pricing-policy → /policy/pricing-policy
    const policySlugs = [
      'privacy-policy',
      'terms-and-conditions',
      'refund-policy',
      'pricing-policy',
      'cancellation-policy',
      'shipping-policy',
    ];
    const policyRedirects = policySlugs.map((slug) => ({
      source: `/${slug}`,
      destination: `/policy/${slug}`,
      permanent: true,
    }));

    // Legacy WooCommerce/WordPress → Next.js migration redirects (301). The old
    // site used /product-category/, /product-tag/, /shop/page/N/, etc. After the
    // migration every URL changed, so Google's indexed old URLs now 404 —
    // dropping ~2.8k pages and their link equity. Map each old pattern to the
    // closest live page so authority transfers ("moved", not "gone"). Query
    // strings (?add-to-cart / ?add_to_wishlist / _wpnonce) match on path and are
    // dropped by the destination. Old /product/<slug> URLs are handled in the
    // product page itself (can't pattern-match here without hitting valid SKUs).
    // Order matters: most specific first, generic catch-all last.
    const legacyRedirects = [
      { source: '/product-category/equipments/hot-equipments/:rest*', destination: '/category/hot-equipment', permanent: true },
      { source: '/product-category/equipments/cold-equipments/:rest*', destination: '/category/cold-equipment', permanent: true },
      { source: '/product-category/house-keeping/:rest*', destination: '/category/housekeeping', permanent: true },
      { source: '/product-category/queue-managers/:rest*', destination: '/category/housekeeping', permanent: true },
      { source: '/product-category/accessories/bar-accessories/:rest*', destination: '/category/bar-beverage', permanent: true },
      { source: '/product-category/kitchen-accessories/:rest*', destination: '/category/accessories', permanent: true },
      { source: '/product-category/accessories/:rest*', destination: '/category/accessories', permanent: true },
      { source: '/product-category/:path*', destination: '/shop', permanent: true },
      { source: '/product-tag/:path*', destination: '/shop', permanent: true },
      { source: '/shop/page/:n*', destination: '/shop', permanent: true },
      { source: '/about-us', destination: '/about', permanent: true },
      { source: '/track-your-order', destination: '/track', permanent: true },
      { source: '/home', destination: '/', permanent: true },
      { source: '/compare', destination: '/shop', permanent: true },
      { source: '/all-subcategories', destination: '/shop', permanent: true },
      { source: '/category', destination: '/shop', permanent: true },
      { source: '/category/:id(\\d+)', destination: '/shop', permanent: true },
      { source: '/product', destination: '/shop', permanent: true },
    ];

    return [...policyRedirects, ...legacyRedirects];
  },
};

module.exports = nextConfig;
