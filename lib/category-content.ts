/**
 * SEO copy + slug mapping for category landing pages (/category/[slug]).
 *
 * The shop page filters by `?cat=` client-side, so those filtered views
 * share one canonical (/shop) and can't rank individually. These
 * dedicated, server-rendered landing pages give each major category a
 * unique indexable URL with real body copy, a featured product grid and
 * BreadcrumbList — which is what actually ranks for head terms like
 * "commercial hot equipment" or "snowflake ice machine india".
 *
 * `category` MUST match the exact uppercase value stored on
 * Product.category in the DB (see lib/categories.CATEGORY_ORDER) so the
 * featured-product query resolves.
 */

export interface CategoryContent {
  slug: string;
  /** Exact DB category value. */
  category: string;
  /** <title> + H1 base. */
  title: string;
  h1: string;
  /** Meta description (~150 chars). */
  metaDescription: string;
  /** Lead paragraphs of body copy. */
  intro: string[];
  /** "What to look for" bullet list. */
  considerations: { heading: string; items: string[] };
  /** Closing paragraph before the product grid / CTA. */
  closing: string;
}

export const CATEGORY_CONTENT: CategoryContent[] = [
  {
    slug: 'hot-equipment',
    category: 'HOT EQUIPMENT',
    title: 'Commercial Hot Equipment',
    h1: 'Commercial Hot Kitchen Equipment',
    metaDescription:
      'Shop commercial hot equipment — bain maries, deep fryers, griddles, burger machines and more. GST invoice, direct brand pricing and pan-India delivery.',
    intro: [
      'Hot equipment is the engine room of any commercial kitchen — it cooks, holds and finishes the dishes that move through your service line. From bain maries that keep gravies at a safe serving temperature to deep fryers, griddles and burger machines, this is the gear your covers-per-hour depend on.',
      'Kitchenary Kart supplies commercial-grade hot equipment to restaurants, hotels, cafés, cloud kitchens and caterers across India, with a GST tax invoice on every order so registered businesses can claim full Input Tax Credit.',
    ],
    considerations: {
      heading: 'What to look for in hot equipment',
      items: [
        'Capacity — match compartment count or pan size to your peak simultaneous dishes',
        'Build — stainless steel construction stands up to a high-volume commercial line',
        'Power — confirm single-phase vs three-phase load against your kitchen connection',
        'Temperature control — a reliable thermostat is essential for safe food holding',
        'Warranty — refrigeration and heating components should carry a clear warranty',
      ],
    },
    closing:
      'Not sure which model suits your menu? WhatsApp our team at +91 98903 52455 with your covers-per-day and we will recommend the right configuration with bulk pricing.',
  },
  {
    slug: 'cold-equipment',
    category: 'COLD EQUIPMENT',
    title: 'Commercial Cold Equipment',
    h1: 'Commercial Cold & Refrigeration Equipment',
    metaDescription:
      'Shop commercial cold equipment — snowflake ice machines, cold display counters, chillers and more. GST invoice, direct pricing and pan-India delivery.',
    intro: [
      'Cold equipment keeps your ingredients safe and your desserts photogenic. Whether you need a snowflake ice machine for a bingsu counter, a cold display to merchandise sweets and beverages, or chilled storage for daily prep, the right unit protects both food safety and presentation.',
      'Every cold appliance from Kitchenary Kart ships with a GST invoice and is priced direct from the brand — no middleman markup — with pan-India delivery to restaurants, cafés and cloud kitchens.',
    ],
    considerations: {
      heading: 'What to look for in cold equipment',
      items: [
        'Output / capacity — ice machines are rated in kg/hr; chillers in litres or shelves',
        'Compressor and warranty — the heart of any refrigeration unit, so check the warranty',
        'Ventilation clearance — condensers need airflow to run efficiently and last',
        'Control type — digital for repeatable settings, knob for simpler maintenance',
        'Drainage and water quality — plan for a floor drain and filtered water supply',
      ],
    },
    closing:
      'Need help sizing a snowflake machine or cold counter for your footfall? Message +91 98903 52455 and we will help you pick the right capacity.',
  },
  {
    slug: 'kitchen-baking',
    category: 'KITCHEN & BAKING EQUIPMENT',
    title: 'Kitchen & Baking Equipment',
    h1: 'Commercial Kitchen & Baking Equipment',
    metaDescription:
      'Shop commercial kitchen & baking equipment — dough sheeters, mixers, prep machines and more. GST invoice, direct brand pricing, pan-India delivery.',
    intro: [
      'Mechanising repetitive prep is what lets a small team hit high volume without burning out. Dough sheeters, planetary mixers and prep machines turn hours of manual work into minutes, with consistent results every time — essential for bakeries, pizzerias and cloud kitchens scaling output.',
      'Kitchenary Kart stocks commercial kitchen and baking equipment built for daily professional use, all with GST invoicing for Input Tax Credit and delivery across India.',
    ],
    considerations: {
      heading: 'What to look for in kitchen & baking equipment',
      items: [
        'Throughput — match the machine\'s output to your daily production volume',
        'Motor rating — heavier doughs and longer runs demand a stronger motor',
        'Footprint — confirm the unit fits your prep zone before ordering',
        'Cleaning and food safety — removable, washable contact parts save labour',
        'Spares availability — choose equipment you can keep running with easy spares',
      ],
    },
    closing:
      'Planning a bakery or pizza line? WhatsApp +91 98903 52455 with your menu and volume for a tailored equipment list.',
  },
  {
    slug: 'buffet-tableware',
    category: 'BUFFET & TABLEWARE',
    title: 'Buffet & Tableware',
    h1: 'Commercial Buffet & Tableware',
    metaDescription:
      'Shop buffet and tableware for restaurants, hotels and caterers — chafing dishes, display ware and serving essentials. GST invoice and pan-India delivery.',
    intro: [
      'Buffet and tableware is where your food meets the guest. Chafing dishes, display ware and serving essentials keep a buffet hot, hygienic and presentable — the difference between a spread that looks premium and one that looks tired by the second hour.',
      'Kitchenary Kart supplies durable, presentation-grade buffet and tableware to hotels, banquet halls and caterers across India, with GST invoicing on every order.',
    ],
    considerations: {
      heading: 'What to look for in buffet & tableware',
      items: [
        'Material finish — stainless and presentation-grade finishes hold up to repeat service',
        'Capacity — size chafers and display ware to your typical guest count',
        'Heat retention — for hot buffets, choose ware designed for long holding',
        'Stackability and storage — easy storage matters for banquet operations',
        'Durability — commercial settings need ware that survives constant handling',
      ],
    },
    closing:
      'Outfitting a banquet or catering operation? Message +91 98903 52455 for bulk buffet pricing.',
  },
  {
    slug: 'bar-beverage',
    category: 'BAR & BEVERAGE ACCESSORIES',
    title: 'Bar & Beverage Accessories',
    h1: 'Bar & Beverage Accessories',
    metaDescription:
      'Shop bar and beverage accessories for cafés, bars and restaurants. Commercial-grade tools and equipment with GST invoice and pan-India delivery.',
    intro: [
      'A well-run bar or beverage station depends on the right accessories — the tools and equipment that make every drink fast, consistent and clean. From service essentials to specialised beverage gear, the right kit speeds up your bar and reduces waste.',
      'Kitchenary Kart stocks commercial bar and beverage accessories for cafés, bars and restaurants nationwide, all GST-invoiced and priced direct.',
    ],
    considerations: {
      heading: 'What to look for in bar & beverage accessories',
      items: [
        'Build quality — commercial bars are hard on equipment, so durability matters',
        'Speed — tools that shave seconds per drink add up over a busy night',
        'Hygiene — easy-to-clean materials keep your bar service compliant',
        'Compatibility — confirm sizing fits your existing glassware and station',
        'Capacity — size beverage equipment to your peak-hour demand',
      ],
    },
    closing:
      'Setting up a café or bar? WhatsApp +91 98903 52455 for a complete beverage-station list.',
  },
];

const BY_SLUG = new Map(CATEGORY_CONTENT.map((c) => [c.slug, c]));
const BY_CATEGORY = new Map(CATEGORY_CONTENT.map((c) => [c.category, c]));

export function getCategoryContent(slug: string): CategoryContent | undefined {
  return BY_SLUG.get(slug);
}

/** Slug for a DB category value, if a landing page exists for it. */
export function slugForCategory(category: string | null): string | undefined {
  if (!category) return undefined;
  return BY_CATEGORY.get(category)?.slug;
}

export function getAllCategoryContent(): CategoryContent[] {
  return CATEGORY_CONTENT;
}
