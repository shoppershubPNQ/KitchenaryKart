import type { Metadata } from 'next';
import { Montserrat, Roboto } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Header } from '@/components/Header';
import { PromoBar } from '@/components/PromoBar';
import { Footer } from '@/components/Footer';
import { FooterTrustUpper } from '@/components/FooterTrustUpper';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';
import { DrawerMount } from '@/components/DrawerMount';
import { SlideNav } from '@/components/SlideNav';
import { AuthModal } from '@/components/AuthModal';
import { WishlistDrawer } from '@/components/WishlistDrawer';
import { getCategoryTree, getCategoryCounts } from '@/lib/products';

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
        width: 1200,
        height: 630,
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
    icon:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='12' fill='%23A01818'/><text x='12' y='17' text-anchor='middle' font-family='Montserrat' font-size='14' font-weight='700' fill='white'>K</text></svg>",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Layout is a server component; fetch nav data once per request.
  const [tree, counts] = await Promise.all([getCategoryTree(), getCategoryCounts()]);

  return (
    <html lang="en" className={`${montserrat.variable} ${roboto.variable}`}>
      <body className="font-body">
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
