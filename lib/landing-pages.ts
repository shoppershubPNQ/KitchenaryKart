/**
 * Supplier / intent landing pages (/<slug>) + the Pune local page.
 *
 * These target high-intent "role" searches — "commercial kitchen
 * equipment supplier", "hotel kitchen equipment supplier", "bakery
 * equipment supplier", etc. — which convert far better than bare
 * product terms and are where Kitchenary Kart can realistically rank
 * against IndiaMART/TradeIndia on the long tail.
 *
 * Each page has UNIQUE intro + FAQ copy (no city-clone / doorway
 * pattern). The Pune page (`isLocal`) is the only location page — it's
 * the real registered location, so it gets LocalBusiness JSON-LD.
 *
 * `featuredCategories` are exact DB Product.category values used to
 * pull a representative product grid (see SupplierLanding).
 */

export interface LandingPage {
  slug: string;
  /** <title> + H1. */
  title: string;
  h1: string;
  metaDescription: string;
  /** True for the Pune local page — switches on LocalBusiness JSON-LD
   *  + a local-flavoured CTA. */
  isLocal?: boolean;
  intro: string[];
  supplies: { heading: string; items: string[] };
  faqs: Array<{ q: string; a: string }>;
  /** DB category values to source the featured grid from. */
  featuredCategories: string[];
  /**
   * Optional keyword-rich internal-link block. Each link's visible text is a
   * real long-tail search phrase (e.g. "Commercial bain marie supplier in
   * Pune") pulled from Search Console, pointing at the matching shop filter /
   * category page. Captures the specific equipment+location long-tail and
   * spreads keyword-anchored internal links to the target pages.
   */
  intentLinks?: { heading: string; links: Array<{ label: string; href: string }> };
}

const ALL_MAIN = [
  'HOT EQUIPMENT',
  'COLD EQUIPMENT',
  'KITCHEN & BAKING EQUIPMENT',
  'BUFFET & TABLEWARE',
];

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: 'commercial-kitchen-equipment-supplier',
    title: 'Commercial Kitchen Equipment Supplier in India',
    h1: 'Commercial Kitchen Equipment Supplier',
    metaDescription:
      'Kitchenary Kart is a commercial kitchen equipment supplier in India — 2,000+ HORECA products with GST invoice, direct brand pricing and free pan-India delivery above ₹3,000.',
    intro: [
      'Kitchenary Kart is a commercial kitchen equipment supplier serving restaurants, hotels, cafés, cloud kitchens, bakeries and caterers across India. We carry over 2,000 commercial-grade products — from bain maries and deep fryers to snowflake ice machines, dough sheeters and cold display counters — all from one source, so you can equip an entire kitchen without chasing multiple dealers.',
      'Because we sell direct, you get genuine brand pricing with no middleman markup, a GST tax invoice on every order for full Input Tax Credit, and pan-India delivery. Whether you are kitting out a single outlet or a multi-location chain, we supply the complete list with bulk pricing on request.',
    ],
    supplies: {
      heading: 'What we supply',
      items: [
        'Hot equipment — bain maries, commercial deep fryers, burger machines, griddles and food warmers',
        'Cold equipment — snowflake ice machines, cold display counters and refrigerated units',
        'Kitchen & baking equipment — dough sheeters, planetary mixers and prep machines',
        'Buffet & tableware — chafing dishes, GN pans and serving essentials',
        'Bar & beverage accessories, housekeeping essentials and genuine spare parts',
      ],
    },
    faqs: [
      {
        q: 'Are you a commercial kitchen equipment supplier across all of India?',
        a: 'Yes. We are based in Pune and deliver pan-India to restaurants, hotels, cafés, cloud kitchens, bakeries and caterers, with free delivery on orders above ₹3,000.',
      },
      {
        q: 'Do you provide a GST invoice for commercial kitchen equipment?',
        a: 'Every order ships with a proper GST tax invoice, so registered businesses can claim full Input Tax Credit on their equipment purchase.',
      },
      {
        q: 'Can you supply equipment for a complete new kitchen setup?',
        a: 'Yes. Send us your menu and covers-per-day on WhatsApp at +91 98903 52455 and we will put together a complete equipment list with bulk pricing.',
      },
      {
        q: 'Do you offer bulk or wholesale pricing?',
        a: 'Yes — we offer direct brand pricing and special rates on multi-unit and HORECA bulk orders. Contact us for a quote.',
      },
    ],
    featuredCategories: ALL_MAIN,
  },
  {
    slug: 'hotel-kitchen-equipment-supplier',
    title: 'Hotel Kitchen Equipment Supplier',
    h1: 'Hotel Kitchen Equipment Supplier',
    metaDescription:
      'Hotel kitchen equipment supplier for India — banquet, buffet and production kitchen gear. GST invoice, bulk pricing and free pan-India delivery above ₹3,000.',
    intro: [
      'Kitchenary Kart supplies hotels and banquet operations across India with the full range of commercial kitchen and buffet equipment. From high-volume production-line gear to presentation-grade buffet ware, we help hotels run consistent service across restaurants, banquets and room service.',
      'We understand a hotel buys in volume and on tight timelines, so we offer direct brand pricing, GST invoicing for Input Tax Credit, bulk rates and pan-India delivery. One supplier, one invoice, the whole kitchen.',
    ],
    supplies: {
      heading: 'What we supply to hotels',
      items: [
        'Production kitchen — bain maries, deep fryers, griddles and hot-holding equipment',
        'Banquet & buffet — chafing dishes, GN pans, food warmers and display ware',
        'Cold side — cold display counters, snowflake ice machines and refrigeration',
        'Bakery & dessert — dough sheeters, mixers and dessert equipment',
        'Housekeeping & room essentials and genuine spare parts',
      ],
    },
    faqs: [
      {
        q: 'Do you supply equipment for hotel banquets and buffets?',
        a: 'Yes — chafing dishes, GN pans, food warmers and presentation-grade buffet ware, alongside full production-kitchen equipment. We can quote complete banquet fit-outs.',
      },
      {
        q: 'Can you handle bulk hotel orders with GST billing?',
        a: 'Yes. We offer bulk pricing and a GST tax invoice on every order so your hotel can claim full Input Tax Credit.',
      },
      {
        q: 'Do you deliver to hotels outside Pune?',
        a: 'We deliver pan-India, including Mumbai, Bangalore, Hyderabad, Delhi and tier-2 cities, with free delivery above ₹3,000.',
      },
      {
        q: 'How do I get a quote for a hotel kitchen?',
        a: 'WhatsApp your requirement list to +91 98903 52455 and we will send a consolidated quote with bulk pricing.',
      },
    ],
    featuredCategories: ['HOT EQUIPMENT', 'BUFFET & TABLEWARE', 'COLD EQUIPMENT', 'KITCHEN & BAKING EQUIPMENT'],
  },
  {
    slug: 'restaurant-equipment-supplier',
    title: 'Restaurant Equipment Supplier',
    h1: 'Restaurant Equipment Supplier',
    metaDescription:
      'Restaurant equipment supplier in India — commercial cooking, holding and cold gear for restaurants and cloud kitchens. GST invoice, direct pricing, pan-India delivery.',
    intro: [
      'Kitchenary Kart equips restaurants and cloud kitchens across India with reliable, commercial-grade equipment built for daily high-volume service. From the hot line to cold storage and prep, we supply the gear your covers-per-hour depend on.',
      'Opening a new restaurant or replacing tired equipment? We offer direct brand pricing, GST invoicing for Input Tax Credit, and pan-India delivery — with bulk rates for full kitchen setups.',
    ],
    supplies: {
      heading: 'What we supply to restaurants',
      items: [
        'Hot line — bain maries, deep fryers, burger machines and griddles',
        'Cold side — cold display counters, ice machines and refrigeration',
        'Prep & baking — dough sheeters, mixers and prep machines',
        'Service — buffet ware, tableware and bar & beverage accessories',
        'Genuine spare parts to keep the line running',
      ],
    },
    faqs: [
      {
        q: 'Can you equip a brand-new restaurant kitchen?',
        a: 'Yes. Share your menu and seating/covers, and we will build a complete equipment list across the hot line, cold side, prep and service — with bulk pricing.',
      },
      {
        q: 'Do restaurant orders come with a GST invoice?',
        a: 'Every order includes a GST tax invoice so your restaurant can claim full Input Tax Credit.',
      },
      {
        q: 'Do you supply cloud kitchens too?',
        a: 'Yes — cloud kitchens are a core customer. We focus on the high-throughput hot and cold gear delivery menus depend on.',
      },
      {
        q: 'What are the delivery timelines?',
        a: 'Most orders dispatch within 1–3 business days with pan-India delivery, free above ₹3,000.',
      },
    ],
    featuredCategories: ['HOT EQUIPMENT', 'COLD EQUIPMENT', 'KITCHEN & BAKING EQUIPMENT'],
  },
  {
    slug: 'bakery-equipment-supplier',
    title: 'Bakery Equipment Supplier',
    h1: 'Bakery Equipment Supplier',
    metaDescription:
      'Bakery equipment supplier in India — dough sheeters, planetary mixers, baking tools and dessert display. GST invoice, direct pricing and free pan-India delivery above ₹3,000.',
    intro: [
      'Kitchenary Kart supplies bakeries, patisseries, pizzerias and dessert cafés across India with the equipment that turns repetitive prep into consistent, high-volume output. Dough sheeters, planetary mixers, baking tools and dessert display — all commercial-grade and built for daily use.',
      'We sell direct, so you get genuine pricing, a GST invoice for Input Tax Credit, and pan-India delivery, with bulk rates for full bakery setups.',
    ],
    supplies: {
      heading: 'What we supply to bakeries',
      items: [
        'Dough sheeters and roller machines for breads, pastry and pizza bases',
        'Planetary mixers and dough mixers for high-volume batches',
        'Baking trays, silicone moulds, piping nozzles and cream whippers',
        'Cold display counters and snowflake ice machines for dessert counters',
        'Bakery accessories and genuine spare parts',
      ],
    },
    faqs: [
      {
        q: 'Do you supply commercial dough sheeters and mixers?',
        a: 'Yes — electric dough sheeters and planetary/dough mixers built for daily bakery production, plus the tools and accessories around them.',
      },
      {
        q: 'Can you equip a new bakery or dessert café?',
        a: 'Yes. Tell us your menu and volume on WhatsApp at +91 98903 52455 and we will put together a complete bakery equipment list with bulk pricing.',
      },
      {
        q: 'Is a GST invoice provided on bakery equipment?',
        a: 'Yes, every order ships with a GST tax invoice for full Input Tax Credit.',
      },
      {
        q: 'Do you deliver bakery equipment across India?',
        a: 'We deliver pan-India, free on orders above ₹3,000.',
      },
    ],
    featuredCategories: ['KITCHEN & BAKING EQUIPMENT', 'COLD EQUIPMENT', 'HOT EQUIPMENT'],
  },
  {
    slug: 'horeca-equipment-supplier',
    title: 'HORECA Equipment Supplier',
    h1: 'HORECA Equipment Supplier',
    metaDescription:
      'HORECA equipment supplier in India for hotels, restaurants and catering. 2,000+ commercial products, GST invoice, bulk pricing and free pan-India delivery above ₹3,000.',
    intro: [
      'Kitchenary Kart is a HORECA equipment supplier serving the hotel, restaurant and catering industry across India. Our 2,000+ SKU range covers the entire kitchen — hot, cold, baking, buffet, bar and spares — so HORECA buyers can source everything from a single, GST-compliant supplier.',
      'We offer direct brand pricing, GST invoicing for Input Tax Credit, bulk and wholesale rates, and pan-India delivery — the supplier base a growing HORECA operation needs.',
    ],
    supplies: {
      heading: 'What we supply to HORECA businesses',
      items: [
        'Complete hot equipment lines for production kitchens',
        'Cold equipment and refrigeration for storage and display',
        'Bakery and prep machinery',
        'Buffet, tableware and bar & beverage accessories',
        'Housekeeping essentials and genuine spare parts',
      ],
    },
    faqs: [
      {
        q: 'What is a HORECA equipment supplier?',
        a: 'HORECA stands for Hotels, Restaurants and Catering. As a HORECA equipment supplier, we provide the full range of commercial kitchen, buffet and bar equipment these businesses need, with GST invoicing and bulk pricing.',
      },
      {
        q: 'Do you supply HORECA businesses across India?',
        a: 'Yes — we deliver pan-India with free delivery above ₹3,000, and offer bulk pricing for multi-unit and chain operations.',
      },
      {
        q: 'Can I get a single quote for a full HORECA fit-out?',
        a: 'Yes. WhatsApp your requirement to +91 98903 52455 and we will consolidate it into one quote with bulk pricing.',
      },
      {
        q: 'Do you provide GST invoices for Input Tax Credit?',
        a: 'Yes, a GST tax invoice ships with every order for full Input Tax Credit eligibility.',
      },
    ],
    featuredCategories: ALL_MAIN,
  },
  {
    slug: 'commercial-kitchen-equipment-supplier-in-pune',
    title: 'Commercial Kitchen Equipment Supplier in Pune',
    h1: 'Commercial Kitchen Equipment Supplier in Pune',
    metaDescription:
      'Pune-based commercial kitchen equipment supplier for restaurants, hotels, cafés and bakeries. GST invoice, direct brand pricing, fast local delivery and pan-India shipping.',
    isLocal: true,
    intro: [
      'Kitchenary Kart is a Pune-based commercial kitchen equipment supplier, serving restaurants, hotels, cafés, cloud kitchens, bakeries and caterers in Pune and across India. Located in Kondhwa Budruk, we stock 2,000+ commercial-grade products — bain maries, deep fryers, snowflake ice machines, dough sheeters, cold display counters and more.',
      'For Pune businesses, that means a local supplier with genuine brand pricing, a GST invoice on every order for Input Tax Credit, and fast delivery — plus the same catalogue available pan-India. Setting up a new kitchen in Pune? We can help you plan the complete equipment list.',
    ],
    supplies: {
      heading: 'What Pune businesses buy from us',
      items: [
        'Hot equipment — bain maries, deep fryers, burger machines and griddles',
        'Cold equipment — snowflake ice machines and cold display counters',
        'Bakery equipment — dough sheeters and planetary mixers',
        'Buffet, tableware and bar & beverage accessories',
        'Genuine spare parts and accessories',
      ],
    },
    faqs: [
      {
        q: 'Where in Pune are you located?',
        a: 'We are at A2/103, Parshwanagar, Opp. Swami Vivekanand Garden, Kondhwa Budruk, Pune 411048. Call or WhatsApp +91 98903 52455.',
      },
      {
        q: 'Do you deliver commercial kitchen equipment within Pune?',
        a: 'Yes — we serve Pune businesses directly and deliver across the city, with free delivery on orders above ₹3,000. We also ship pan-India.',
      },
      {
        q: 'Do you provide GST invoices?',
        a: 'Yes, every order includes a GST tax invoice (GSTIN 27AAQPR2976J1ZU) for full Input Tax Credit.',
      },
      {
        q: 'Can you help set up a new restaurant kitchen in Pune?',
        a: 'Yes. Share your menu and covers-per-day on WhatsApp at +91 98903 52455 and we will build a complete equipment list with pricing.',
      },
    ],
    featuredCategories: ALL_MAIN,
    intentLinks: {
      heading: 'Commercial kitchen equipment we supply in Pune',
      links: [
        { label: 'Commercial bain marie supplier in Pune', href: '/shop?q=bain+marie' },
        { label: 'Commercial deep fryer dealer in Pune', href: '/shop?q=deep+fryer' },
        { label: 'Commercial planetary mixer supplier in Pune', href: '/shop?q=planetary+mixer' },
        { label: 'Commercial dough mixer & kneader supplier in Pune', href: '/shop?q=dough' },
        { label: 'Commercial food processor dealer in Pune', href: '/shop?q=food+processor' },
        { label: 'Commercial meat slicer dealer in Pune', href: '/shop?q=meat+slicer' },
        { label: 'Commercial oven & combi oven supplier in Pune', href: '/shop?q=oven' },
        { label: 'Commercial toaster supplier in Pune', href: '/shop?q=toaster' },
        { label: 'Commercial induction supplier in Pune', href: '/shop?q=induction' },
        { label: 'Commercial bread slicer supplier in Pune', href: '/shop?q=bread+slicer' },
        { label: 'Electric tawa & griddle supplier in Pune', href: '/shop?q=tawa' },
        { label: 'Shawarma machine supplier in Pune', href: '/shop?q=shawarma' },
        { label: 'Bakery equipment supplier in Pune', href: '/bakery-equipment-supplier' },
        { label: 'Cloud kitchen equipment supplier in Pune', href: '/commercial-kitchen-equipment-supplier' },
      ],
    },
  },
];

const BY_SLUG = new Map(LANDING_PAGES.map((p) => [p.slug, p]));

export function getLandingPage(slug: string): LandingPage | undefined {
  return BY_SLUG.get(slug);
}

export function getAllLandingPages(): LandingPage[] {
  return LANDING_PAGES;
}
