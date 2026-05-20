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
};

module.exports = nextConfig;
