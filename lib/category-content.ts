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
  /** Related blog buying-guides for category → blog internal linking. */
  relatedGuides?: Array<{ slug: string; label: string }>;
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
    relatedGuides: [
      { slug: 'how-to-choose-commercial-bain-marie', label: 'How to Choose a Commercial Bain Marie' },
      { slug: 'commercial-deep-fryer-buying-guide', label: 'Commercial Deep Fryer Buying Guide' },
    ],
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
    relatedGuides: [
      { slug: 'snowflake-ice-machine-buying-guide', label: 'Snowflake Ice Machine Buying Guide' },
    ],
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
    relatedGuides: [
      { slug: 'how-to-choose-commercial-planetary-mixer', label: 'How to Choose a Commercial Planetary Mixer' },
    ],
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
  {
    slug: 'housekeeping',
    category: 'HOUSEKEEPING & ROOM ESSENTIALS',
    title: 'Hotel Housekeeping & Room Essentials',
    h1: 'Hotel Housekeeping & Room Essentials',
    metaDescription:
      'Shop hotel housekeeping and room essentials — service trolleys, soap dispensers, queue managers, signage, kettles and more. GST invoice and pan-India delivery.',
    intro: [
      'Housekeeping and front-of-house essentials keep a hotel, office or facility running smoothly behind the scenes. From service and luggage trolleys to soap dispensers, queue managers, signage and in-room amenities, this range covers the everyday equipment that guests notice when it is missing.',
      'Kitchenary Kart supplies durable housekeeping and room essentials to hotels, banquet halls, offices and facilities across India, with a GST invoice on every order and pan-India delivery.',
    ],
    considerations: {
      heading: 'What to look for in housekeeping equipment',
      items: [
        'Trolleys — match the type (service, luggage, cleaning) and load capacity to your operation',
        'Durability — high-traffic facilities need equipment that survives daily use',
        'Hygiene — touch-free soap dispensers and hand dryers for guest-facing washrooms',
        'Presentation — signage, queue managers and display boards that look professional',
        'In-room amenities — kettles, trays, hangers and tissue holders that match your standard',
      ],
    },
    closing:
      'Outfitting a hotel or facility? WhatsApp +91 98903 52455 for bulk housekeeping pricing.',
  },
  {
    slug: 'accessories',
    category: 'ACCESSORIES',
    title: 'Commercial Kitchen Accessories & Tools',
    h1: 'Commercial Kitchen Accessories & Tools',
    metaDescription:
      'Shop commercial kitchen accessories and tools — knives, cutters, moulds, scoops, thermometers, woks, piping nozzles and more. GST invoice, pan-India delivery.',
    intro: [
      'The right small wares make a professional kitchen faster and more consistent. This range covers the tools chefs and bakers reach for every day — knives, cutters, moulds, scoops, lifters, thermometers, woks, cast-iron pans, piping nozzles, cream whippers and more.',
      'Kitchenary Kart stocks commercial-grade kitchen accessories and tools for restaurants, bakeries, cafés and cloud kitchens nationwide, all GST-invoiced and priced direct.',
    ],
    considerations: {
      heading: 'What to look for in kitchen accessories',
      items: [
        'Material — food-grade stainless, silicone and teflon-coated tools that last',
        'Comfort — handles and grips built for long service shifts',
        'Precision — accurate food thermometers and consistent moulds for repeatable results',
        'Hygiene — easy-to-clean, dishwasher-safe wares keep your kitchen compliant',
        'Range — knives, cutters, baking tools and prep accessories from one supplier',
      ],
    },
    closing:
      'Stocking a new kitchen? WhatsApp +91 98903 52455 for a complete accessories list with bulk pricing.',
  },
  {
    slug: 'polyrattan-basket',
    category: 'POLYRATTAN BASKET',
    title: 'Polyrattan Baskets for Buffet & Bread Display',
    h1: 'Polyrattan Baskets',
    metaDescription:
      'Shop polyrattan baskets for buffet, bread and display — durable woven baskets in lite and heavy ranges, with compartments and lids. GST invoice, pan-India delivery.',
    intro: [
      'Polyrattan baskets bring a warm, premium look to buffets, bread displays and in-room presentation — with the durability of synthetic rattan that handles daily commercial use far better than natural wicker. Available in lite and heavy ranges, including rectangle, compartment and lidded styles.',
      'Kitchenary Kart supplies polyrattan baskets to hotels, bakeries, buffets and caterers across India, GST-invoiced and built to last through repeated service.',
    ],
    considerations: {
      heading: 'What to look for in polyrattan baskets',
      items: [
        'Build — heavy-range baskets stand up to constant buffet handling',
        'Size & shape — match GN-compatible sizes to your buffet counter or display',
        'Compartments & lids — choose configurations that suit bread, fruit or display',
        'Hygiene — synthetic rattan wipes clean and resists moisture better than wicker',
        'Presentation — a consistent basket style lifts the look of any buffet line',
      ],
    },
    closing:
      'Need baskets for a buffet or bakery display? WhatsApp +91 98903 52455 for bulk pricing.',
  },
  {
    slug: 'spare-parts',
    category: 'SPARE PARTS',
    title: 'Commercial Kitchen Equipment Spare Parts',
    h1: 'Commercial Kitchen Equipment Spare Parts',
    metaDescription:
      'Shop genuine spare parts for commercial kitchen equipment — ovens, mixers, induction, blenders, juice dispensers, trolleys and more. GST invoice, pan-India delivery.',
    intro: [
      'Downtime costs money, so keeping the right spare parts on hand keeps your kitchen running. This range covers genuine replacement parts for a wide range of commercial equipment — ovens, planetary mixers, induction cooktops, blenders, juice and cereal dispensers, toasters, trolleys, meat mincers and many more.',
      'Kitchenary Kart supplies spare parts pan-India with a GST invoice on every order. Not sure which part you need? Send us your equipment model and we will help you identify the right one.',
    ],
    considerations: {
      heading: 'Finding the right spare part',
      items: [
        'Identify the model — match the part to your exact equipment model where possible',
        'Genuine fit — parts designed for the original machine, not generic substitutes',
        'Common wear items — keep fast-wearing parts in stock to avoid downtime',
        'Wide coverage — spares for ovens, mixers, induction, dispensers, trolleys and more',
        'Ask first — share a photo or model number and we will confirm the right part',
      ],
    },
    closing:
      'Need a spare part? WhatsApp +91 98903 52455 with your equipment model or a photo and we will identify it for you.',
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
