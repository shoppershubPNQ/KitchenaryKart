import type { Metadata } from 'next';
import { Oswald, Inter } from 'next/font/google';
import { buildFaqJsonLd } from '@/lib/json-ld';
import { AboutContent } from '@/components/AboutContent';

const SITE_URL = 'https://kitchenarykart.com';

// Display fonts scoped to this page only. `variable` exposes them as CSS
// custom properties (--font-oswald / --font-inter) that the About stylesheet
// references, so the rest of the site keeps its Montserrat/Roboto stack.
const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const TITLE = 'Commercial Kitchen Equipment Supplier in India | KitchenaryKart';
const DESCRIPTION =
  'KitchenaryKart is a B2B commercial kitchen equipment supplier for restaurants, hotels, cloud kitchens, cafes, bakeries & caterers — hot & cold equipment, refrigeration, buffet, bar, bakery tools, housekeeping & spare parts at wholesale pricing, delivered across India.';

export const metadata: Metadata = {
  // `absolute` bypasses the layout's "%s — KitchenaryKart" template so the
  // brand name isn't doubled (the title already ends in "| KitchenaryKart").
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'commercial kitchen equipment supplier',
    'HORECA equipment supplier India',
    'B2B kitchen equipment supplier',
    'cloud kitchen equipment supplier',
    'restaurant kitchen equipment wholesale',
    'hotel kitchen equipment supplier',
    'bakery equipment supplier India',
    'bar equipment supplier',
    'kitchen equipment spare parts supplier',
    'GST compliant kitchen equipment supplier',
    'export kitchen equipment India',
  ],
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    url: '/about',
    title: TITLE,
    description:
      'B2B / wholesale HORECA supplier for restaurants, hotels, cloud kitchens, cafes & bakeries — 2,000+ products, GST-compliant invoicing, export-ready.',
    siteName: 'KitchenaryKart',
    locale: 'en_IN',
    images: ['/logo.png'],
  },
};

// FAQ pairs — single source of truth shared by the visible accordion
// (rendered in AboutContent) and the FAQPage JSON-LD below. Google requires
// the markup to match on-page content exactly.
const FAQS = [
  {
    q: 'Do you supply commercial kitchen equipment in bulk for cloud kitchens and restaurant chains?',
    a: 'Yes. Our B2B program is built for multi-outlet restaurants, cloud kitchen chains and hotel groups — with wholesale pricing, a dedicated account manager and flexible payment terms.',
  },
  {
    q: 'Is GST invoicing provided on commercial kitchen equipment orders?',
    a: 'Every order — retail or bulk — ships with a proper GST-compliant invoice, so your accounts team has clean documentation for input tax credit.',
  },
  {
    q: 'Do you deliver commercial kitchen equipment pan-India, and do you export?',
    a: 'We deliver to 28 states across India and support international buyers with export documentation and logistics assistance for worldwide shipping.',
  },
  {
    q: 'What kitchen equipment spare parts do you stock?',
    a: '200+ genuine spare parts for deep fryers, bain maries, ovens, ice crushers, commercial mixers and shawarma machines, so equipment stays in service instead of sitting idle.',
  },
  {
    q: "Can you help source equipment that isn't listed on the website?",
    a: 'Yes — our catalog runs to 2,000+ products across hot equipment, refrigeration, buffet, bar, bakery, housekeeping and spare parts, and our team sources items that aren’t listed on request.',
  },
];

export default function AboutPage() {
  const aboutPageLd = {
    '@context': 'https://schema.org/',
    '@type': 'AboutPage',
    '@id': `${SITE_URL}/about#webpage`,
    url: `${SITE_URL}/about`,
    name: TITLE,
    description: DESCRIPTION,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-IN',
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'About Us', item: `${SITE_URL}/about` },
    ],
  };
  const faqLd = buildFaqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className={`${oswald.variable} ${inter.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <AboutContent faqs={FAQS} />
    </div>
  );
}
