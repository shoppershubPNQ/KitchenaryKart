import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Montserrat, Roboto } from 'next/font/google';
import { AnalyticsWithBotFilter } from '@/components/AnalyticsWithBotFilter';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Header } from '@/components/Header';
import { PromoBar } from '@/components/PromoBar';
import { Footer } from '@/components/Footer';
import { FooterTrustUpper } from '@/components/FooterTrustUpper';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';
import { AnalyticsScripts } from '@/components/AnalyticsScripts';
import { getCategoryTree, getCategoryCounts } from '@/lib/products';
import { getSocialLinks } from '@/lib/social';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/json-ld';

// Modals / drawers — only render after user interaction (click cart,
// click wishlist, etc.). Loading them via next/dynamic keeps ~1100
// lines of client JS out of the initial bundle on every page. Each
// component listens for a window event to open, so they show up
// immediately on first user interaction after hydration.
const DrawerMount = dynamic(
  () => import('@/components/DrawerMount').then((m) => m.DrawerMount),
  { ssr: false },
);
const WishlistDrawer = dynamic(
  () => import('@/components/WishlistDrawer').then((m) => m.WishlistDrawer),
  { ssr: false },
);
const SlideNav = dynamic(
  () => import('@/components/SlideNav').then((m) => m.SlideNav),
  { ssr: false },
);
const AuthModal = dynamic(
  () => import('@/components/AuthModal').then((m) => m.AuthModal),
  { ssr: false },
);

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
});
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

const SITE_NAME = 'KitchenaryKart';
const SITE_URL = 'https://kitchenarykart.com';
const SITE_DESCRIPTION =
  'Curated catalog of commercial kitchen, bar, buffet and housekeeping equipment — cookware, fryers, bain marie, blenders, and more. Pan-India delivery and global export.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Commercial Kitchen Equipment for Restaurants, Hotels & Cloud Kitchens`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'commercial kitchen equipment',
    'restaurant equipment India',
    'hotel kitchen supplies',
    'cloud kitchen setup',
    'bain marie',
    'commercial fryer',
    'commercial blender',
    'kitchen cookware India',
    'B2B kitchen equipment',
  ],
  authors: [{ name: SITE_NAME }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Commercial Kitchen Equipment for Restaurants, Hotels & Cloud Kitchens`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/logo.png',
        width: 2000,
        height: 2000,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Commercial Kitchen Equipment`,
    description: SITE_DESCRIPTION,
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    // Browser-tab favicon + iOS home-screen icon, both the brand logo.
    icon: [{ url: '/logo.png', type: 'image/png' }],
    shortcut: ['/logo.png'],
    apple: [{ url: '/logo.png' }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Layout is a server component; fetch nav data once per request.
  const [tree, counts, social] = await Promise.all([
    getCategoryTree(),
    getCategoryCounts(),
    getSocialLinks(),
  ]);

  // sameAs = public social profiles only (WhatsApp is a contact channel,
  // not a profile, so it's excluded from the Organization schema).
  const sameAs = [social.instagram, social.youtube, social.twitter, social.facebook]
    .filter((u): u is string => !!u);
  const orgLd = buildOrganizationJsonLd(sameAs);
  const websiteLd = buildWebsiteJsonLd();

  return (
    <html lang="en" className={`${montserrat.variable} ${roboto.variable}`}>
      <body className="font-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <PromoBar />
        <div className="h-1 bg-top-strip" />
        <Header categoryTree={tree} categoryCounts={counts} />
        <div style={{ minHeight: 'calc(100vh - 600px)' }}>{children}</div>
        <FooterTrustUpper />
        <Footer />
        <WhatsAppFloat />
        <DrawerMount />
        <WishlistDrawer />
        <SlideNav tree={tree} />
        <AuthModal />
        <AnalyticsWithBotFilter />
        <SpeedInsights />
        <AnalyticsScripts />
      </body>
    </html>
  );
}
