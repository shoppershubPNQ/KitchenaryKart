/**
 * Blog content store.
 *
 * The blog is a long-tail organic-capture + internal-linking surface:
 * buying-guide posts rank for "how to choose ..." / "best ... for
 * restaurant" queries and funnel readers into the relevant category
 * landing pages and PDPs.
 *
 * Posts are authored here as structured blocks (not raw HTML) so the
 * renderer stays XSS-safe and the markup is consistent. Inline links
 * use markdown `[text](/path)` syntax, parsed by the post renderer —
 * always link internally to /category/<slug>, /shop?... or /product/...
 * to spread link equity.
 *
 * To add a post: append to POSTS with a unique `slug`. The sitemap,
 * blog index and RSS-free discovery all read from here automatically.
 */

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'cta'; href: string; label: string };

export interface BlogPost {
  slug: string;
  title: string;
  /** Meta description + index card blurb. ~150 chars. */
  description: string;
  /** ISO date (YYYY-MM-DD). Used for Article schema + display. */
  date: string;
  updated?: string;
  /** Short author/brand label shown on the post. */
  author: string;
  /** Rough read time in minutes, shown on cards. */
  readMins: number;
  /** One-line category tag for the card. */
  tag: string;
  body: BlogBlock[];
}

export const POSTS: BlogPost[] = [
  {
    slug: 'how-to-choose-commercial-bain-marie',
    title: 'How to Choose a Commercial Bain Marie for Your Restaurant',
    description:
      'A practical buying guide to commercial bain maries — with vs without glass, compartment count, sizing and GST tips for Indian restaurants and cloud kitchens.',
    date: '2026-06-08',
    author: 'Kitchenary Kart',
    readMins: 6,
    tag: 'Buying Guide',
    body: [
      {
        type: 'p',
        text: 'A bain marie is the workhorse of any busy service line — it keeps gravies, curries, dal and sides at a safe serving temperature for hours without overcooking them. But picking the wrong one wastes counter space, power and money. This guide walks through every decision that matters before you buy.',
      },
      { type: 'h2', text: 'With glass or without glass?' },
      {
        type: 'p',
        text: 'The single biggest choice is whether you want a glass sneeze-guard top. A [bain marie with glass](/category/hot-equipment) suits front-of-house buffets, live counters and self-service setups where customers see the food — the glass keeps it hygienic and presentable. A bain marie without glass is built for back-of-house plating lines and cloud kitchens where speed matters more than display, and staff need unobstructed access to every pan.',
      },
      { type: 'h2', text: 'How many compartments?' },
      {
        type: 'p',
        text: 'Compartment count should follow your menu, not your budget. Each GN pan holds one preparation, so count the number of dishes you hold hot at peak service and add one for flexibility:',
      },
      {
        type: 'ul',
        items: [
          '2-compartment — small cafés, tea stalls and dessert counters holding 2–3 items',
          '3-compartment — standard for most QSRs and mid-size restaurants',
          '4-compartment — full-service restaurants and catering with a wide hot menu',
          '6-compartment — banquet halls, buffets and high-volume cloud kitchens',
        ],
      },
      { type: 'h2', text: 'Dry heat vs water (wet) bain marie' },
      {
        type: 'p',
        text: 'A wet bain marie surrounds the pans with hot water for gentle, even heat — ideal for delicate gravies and milk-based dishes that scorch easily. A dry bain marie heats faster and needs no refilling, but can dry the edges of food over long holds. For Indian gravies and curries, a wet bain marie is usually the safer choice.',
      },
      { type: 'h2', text: 'Power and electricals' },
      {
        type: 'p',
        text: 'Most counter-top units run on a standard single-phase 230V socket, but larger 4 and 6-compartment models may draw enough to warrant a dedicated line. Always check the wattage against your kitchen load before installing, and confirm the thermostat range covers a safe holding temperature of 60–70°C.',
      },
      { type: 'h2', text: 'Don\'t forget the GST invoice' },
      {
        type: 'p',
        text: 'If you run a GST-registered business, buy from a seller that issues a proper tax invoice — you can claim the full Input Tax Credit on commercial kitchen equipment, which effectively reduces the cost by the GST rate. Every Kitchenary Kart order ships with a compliant GST invoice for exactly this reason.',
      },
      {
        type: 'p',
        text: 'A popular front-of-house pick is our [Electric Bain Marie with Glass (6 Compartments)](/product/KKHE0012-BMWG6) — six GN pans under a glass sneeze-guard, ideal for buffets and live counters. For banquet-scale holding, the mobile [Hot Bain Marie Ready Counter](/product/KKHE0021-HBM3C) adds a heated lower cabinet and LED display.',
      },
      {
        type: 'cta',
        href: '/category/hot-equipment',
        label: 'Browse Bain Maries & Hot Equipment',
      },
      {
        type: 'p',
        text: 'Still unsure which configuration fits your line? WhatsApp our team at +91 98903 52455 with your menu and covers-per-day and we\'ll recommend the right model.',
      },
    ],
  },
  {
    slug: 'snowflake-ice-machine-buying-guide',
    title: 'Snowflake Ice Machine Buying Guide for Cafés & Dessert Shops',
    description:
      'Everything you need to know before buying a snowflake (snow ice) machine — output capacity, digital vs knob control, ice texture and running costs for Indian dessert businesses.',
    date: '2026-06-08',
    author: 'Kitchenary Kart',
    readMins: 5,
    tag: 'Buying Guide',
    body: [
      {
        type: 'p',
        text: 'Snowflake ice — the soft, fluffy shaved ice behind Korean bingsu and modern dessert bowls — has become a signature item for cafés and dessert shops across India. The machine that makes it is a small investment with a big margin upside, but the specs are easy to get wrong. Here\'s what to look for.',
      },
      { type: 'h2', text: 'Output capacity comes first' },
      {
        type: 'p',
        text: 'Snowflake machines are rated by kilograms of ice per hour. An 80 kg/hr class machine comfortably serves a single busy dessert counter; if you run multiple outlets or a high-footfall food court stall, size up. Under-buying capacity is the most common regret — a machine that can\'t keep pace during the evening rush bottlenecks your whole menu.',
      },
      { type: 'h2', text: 'Digital vs knob control' },
      {
        type: 'p',
        text: 'Two control styles dominate the market. A [digital-model snowflake machine](/category/cold-equipment) gives precise, repeatable settings and a cleaner display — better when multiple staff operate it and you want consistent texture every time. A knob-control model is simpler and cheaper to maintain, with fewer electronics to fail in a humid kitchen. Both produce the same ice; the choice is about who\'s using it and how.',
      },
      { type: 'h2', text: 'Ice texture and the roller' },
      {
        type: 'p',
        text: 'The fineness of the snow depends on the evaporator drum and blade. Look for a stainless-steel drum and an adjustable blade so you can dial the texture from coarse flakes to fine powder. This flexibility lets you serve both traditional gola-style ice and premium bingsu from one machine.',
      },
      { type: 'h2', text: 'Running costs and placement' },
      {
        type: 'ul',
        items: [
          'Ventilation — leave clearance around the condenser; a cramped, hot corner shortens compressor life',
          'Water quality — use filtered water for clear, clean-tasting ice and less scale buildup',
          'Power — confirm the single-phase load fits your existing connection',
          'Drainage — site it near a floor drain so melt water has somewhere to go',
        ],
      },
      { type: 'h2', text: 'Buy with warranty and GST' },
      {
        type: 'p',
        text: 'A snowflake machine is a refrigeration appliance, so compressor warranty matters. Buy from a seller who states the warranty clearly and issues a GST invoice so you can claim Input Tax Credit. That combination protects both your kitchen and your books.',
      },
      {
        type: 'p',
        text: 'For most dessert counters, our [Electric Snowflake Machine (Digital Model)](/product/KKCE0034-80FD) makes up to 80 kg of fluffy snow ice a day with repeatable digital settings — turning a low-cost ingredient into a high-margin bingsu menu. Prefer simpler controls? The [knob-model snowflake machine](/product/KKCE0035-80F) makes the same ice with fewer electronics to maintain.',
      },
      {
        type: 'cta',
        href: '/category/cold-equipment',
        label: 'Browse Snowflake Machines & Cold Equipment',
      },
    ],
  },
  {
    slug: 'cloud-kitchen-equipment-checklist',
    title: 'Setting Up a Cloud Kitchen: The Essential Equipment Checklist',
    description:
      'A room-by-room equipment checklist for launching a cloud kitchen in India — hot line, cold storage, prep, packing and the trust factors that keep costs down.',
    date: '2026-06-08',
    author: 'Kitchenary Kart',
    readMins: 7,
    tag: 'Setup Guide',
    body: [
      {
        type: 'p',
        text: 'Cloud kitchens win on efficiency — no dining room, lower rent, menus tuned for delivery. But that only works if the kitchen is equipped to push consistent volume through a small footprint. This checklist covers the essentials, grouped by station, so you can budget and buy in the right order.',
      },
      { type: 'h2', text: 'The hot line' },
      {
        type: 'p',
        text: 'This is where most of your covers are produced, so equip it first. A reliable hot line keeps food at service temperature and your tickets moving:',
      },
      {
        type: 'ul',
        items: [
          'Bain marie to hold gravies, dal and sides hot through the shift',
          'Commercial deep fryer for snacks and fast-moving fried items',
          'Griddle or hot plate for burgers, eggs and quick grills',
          'Burner range sized to your peak simultaneous dishes',
        ],
      },
      {
        type: 'cta',
        href: '/category/hot-equipment',
        label: 'Shop Hot Equipment',
      },
      { type: 'h2', text: 'Cold storage and the cold line' },
      {
        type: 'p',
        text: 'Delivery menus live and die on food safety. Size your [cold equipment](/category/cold-equipment) for a full day\'s prep plus a buffer, and keep raw and cooked storage separate. A cold display or under-counter chiller near the plating station saves dozens of steps per shift.',
      },
      { type: 'h2', text: 'Prep and baking' },
      {
        type: 'p',
        text: 'Even a delivery-only kitchen needs a proper prep zone. Depending on your menu, that may include a [dough sheeter](/category/kitchen-baking) for breads and pizza bases, a planetary mixer, work tables and quality knives. Mechanising repetitive prep is what lets a small team hit high volume without burning out.',
      },
      { type: 'h2', text: 'Packing and dispatch' },
      {
        type: 'p',
        text: 'The last station is the one customers actually judge. A dedicated packing bench with heat-sealing, labelling and an insulated holding area keeps food hot and presentable until the rider arrives. Don\'t treat it as an afterthought — sloppy packing drives more bad reviews than slow cooking.',
      },
      { type: 'h2', text: 'Buy smart: pricing, GST and delivery' },
      {
        type: 'p',
        text: 'Equipping a kitchen is a large outlay, so three things matter when you buy. Direct brand pricing keeps your capex down by cutting out middleman markup. A GST invoice on every item lets you reclaim Input Tax Credit. And pan-India delivery means you can source everything from one supplier instead of chasing local dealers.',
      },
      {
        type: 'cta',
        href: '/shop',
        label: 'Browse the full catalogue',
      },
      {
        type: 'p',
        text: 'Planning a new cloud kitchen? Send your menu and budget to +91 98903 52455 and our team will help you build a complete equipment list with bulk pricing.',
      },
    ],
  },
  {
    slug: 'commercial-deep-fryer-buying-guide',
    title: 'Commercial Deep Fryer Buying Guide for Indian Restaurants',
    description:
      'How to choose a commercial deep fryer — tank capacity, single vs double tank, electric vs gas, recovery time and safety features for Indian restaurants and QSRs.',
    date: '2026-06-09',
    author: 'Kitchenary Kart',
    readMins: 6,
    tag: 'Buying Guide',
    body: [
      {
        type: 'p',
        text: 'Fried items are some of the highest-margin, fastest-moving dishes on an Indian menu — samosas, fries, pakoras, fried chicken, momos. A commercial deep fryer that can keep up with the rush is the difference between a smooth service and a backed-up kitchen. Here is how to choose the right one.',
      },
      { type: 'h2', text: 'Tank capacity and oil volume' },
      {
        type: 'p',
        text: 'Fryers are rated by oil capacity in litres. More oil holds heat better and recovers temperature faster after a basket goes in, which means crispier food and a steadier line during peak hours. Match the litre rating to your busiest 30 minutes, not your average — an undersized fryer that drops temperature on every drop produces soggy, oily food.',
      },
      { type: 'h2', text: 'Single tank vs double tank' },
      {
        type: 'p',
        text: 'A single-tank fryer is simplest and cheapest. A double-tank (or split-tank) [commercial deep fryer](/category/hot-equipment) lets you run two oils or two temperatures at once — for example, keeping fries away from fish so flavours don\'t cross. If your menu mixes vegetarian and non-vegetarian fried items, separate tanks are worth it.',
      },
      { type: 'h2', text: 'Electric vs gas' },
      {
        type: 'ul',
        items: [
          'Electric — easy to install on a standard connection, precise thermostat, good for counter-top and smaller kitchens',
          'Gas — faster heat recovery and lower running cost where you have a piped or cylinder gas line, better for high-volume',
          'Consider your existing utilities before deciding — retrofitting a gas line is a real cost',
        ],
      },
      { type: 'h2', text: 'Recovery time and thermostat' },
      {
        type: 'p',
        text: 'Recovery time — how fast the oil climbs back to frying temperature after food goes in — is the single most important performance number. A good thermostat with a wide, accurate range keeps oil in the ideal 170–190°C zone, which fries fast, absorbs less oil and extends oil life.',
      },
      { type: 'h2', text: 'Safety and cleaning' },
      {
        type: 'p',
        text: 'Look for a cool-zone design (a cooler area below the heating element where debris settles instead of burning), a drain tap for easy oil changes, and a sturdy basket with a heat-proof handle. Easy daily cleaning keeps oil fresher for longer and protects food quality.',
      },
      {
        type: 'p',
        text: 'For high-volume frying, our [Digital Double Deep Fryer (14L + 14L, standing model)](/product/KKHE0097-FY14LD) runs two independent tanks so you can keep veg and non-veg oils — or fries and fish — completely separate, with a digital thermostat for repeatable results during the rush.',
      },
      {
        type: 'cta',
        href: '/category/hot-equipment',
        label: 'Browse Commercial Deep Fryers',
      },
      {
        type: 'p',
        text: 'Need help matching a fryer to your menu volume? As a [restaurant equipment supplier](/restaurant-equipment-supplier) we can recommend the right capacity — WhatsApp +91 98903 52455.',
      },
    ],
  },
  {
    slug: 'how-to-choose-commercial-planetary-mixer',
    title: 'How to Choose a Commercial Planetary Mixer for Your Bakery',
    description:
      'A buying guide to commercial planetary mixers — bowl capacity, motor power, attachments and speed settings for bakeries, patisseries and cloud kitchens in India.',
    date: '2026-06-09',
    author: 'Kitchenary Kart',
    readMins: 6,
    tag: 'Buying Guide',
    body: [
      {
        type: 'p',
        text: 'A planetary mixer is the backbone of any serious bakery. Whether you are whipping cream, creaming butter and sugar, or kneading bread dough, the planetary action — the beater rotating in one direction while travelling around the bowl in the other — mixes far more evenly than a hand whisk ever could. Here is how to pick the right one.',
      },
      { type: 'h2', text: 'Bowl capacity' },
      {
        type: 'p',
        text: 'Mixers are sized by bowl litres (commonly 5L, 7L, 10L, 20L and up). Size to your largest single batch, but remember you should not fill a bowl to the brim — leave headroom so ingredients don\'t spill during mixing. A 10L bowl comfortably handles a medium bakery\'s daily batches; high-volume operations move to 20L or larger.',
      },
      { type: 'h2', text: 'Motor power matters most for dough' },
      {
        type: 'p',
        text: 'Whipping cream is easy; kneading stiff bread or pizza dough is hard work that can burn out an underpowered motor. If you knead dough regularly, prioritise a strong motor rated for continuous use. A [commercial planetary mixer](/category/kitchen-baking) built for daily dough work will outlast a lighter machine many times over.',
      },
      { type: 'h2', text: 'Attachments and speeds' },
      {
        type: 'ul',
        items: [
          'Whisk — for cream, egg whites and light aeration',
          'Beater (paddle) — for creaming, batters and cookie dough',
          'Dough hook — for bread, pizza and heavy doughs',
          'Multiple speeds — slow to combine without splashing, fast to aerate',
        ],
      },
      { type: 'h2', text: 'Build and safety' },
      {
        type: 'p',
        text: 'Look for a stable, heavy base that won\'t walk across the bench during heavy kneading, a stainless-steel bowl, and a safety guard that stops the machine when raised. A bowl-lift or tilt-head mechanism makes adding ingredients and removing the bowl much easier in a busy kitchen.',
      },
      {
        type: 'p',
        text: 'For serious daily production, our [40L Electric Planetary Mixer (Belt Model)](/product/KKKBE0003-B40) handles up to 8 kg of dough per batch and ships with whisk, beater and dough hook. For a growing café or small bakery, the bench-top [7L Planetary Mixer (Gear Model)](/product/KKKBE0005-B7) is the right first machine.',
      },
      {
        type: 'cta',
        href: '/category/kitchen-baking',
        label: 'Browse Planetary Mixers & Bakery Equipment',
      },
      {
        type: 'p',
        text: 'Setting up or scaling a bakery? As a [bakery equipment supplier](/bakery-equipment-supplier) we can help you choose the right mixer and the rest of your prep line — message +91 98903 52455.',
      },
    ],
  },
  {
    slug: 'best-bain-marie-for-restaurants',
    title: 'Best Bain Marie for Restaurants: Types, Sizing & Buying Tips',
    description:
      'Which bain marie is best for your restaurant? Compare wet vs dry, with vs without glass, and compartment sizing — plus GST tips for Indian restaurants and caterers.',
    date: '2026-06-09',
    author: 'Kitchenary Kart',
    readMins: 5,
    tag: 'Buying Guide',
    body: [
      {
        type: 'p',
        text: 'The "best" bain marie isn\'t the biggest or the cheapest — it\'s the one that matches how your kitchen actually serves food. This guide breaks down the choices so you can pick with confidence. (For a deeper walkthrough of every option, see our full guide on [how to choose a commercial bain marie](/blog/how-to-choose-commercial-bain-marie).)',
      },
      { type: 'h2', text: 'Match the type to your service' },
      {
        type: 'ul',
        items: [
          'Front-of-house buffet or live counter → bain marie WITH glass (hygienic, presentable)',
          'Back-of-house plating line or cloud kitchen → bain marie WITHOUT glass (fast access)',
          'Delicate gravies and milk-based dishes → wet (water) bain marie for gentle, even heat',
          'Fast holding with no refilling → dry bain marie',
        ],
      },
      { type: 'h2', text: 'Size by your hot menu, not your budget' },
      {
        type: 'p',
        text: 'Count the dishes you hold hot at peak service and add one for flexibility. A 2-compartment unit suits small cafés; 3-compartment is the workhorse for most restaurants; 4 and 6-compartment models serve full-service kitchens, buffets and banquets. A [commercial bain marie](/category/hot-equipment) that\'s slightly larger than today\'s menu gives you room to grow.',
      },
      { type: 'h2', text: 'What separates a good bain marie' },
      {
        type: 'p',
        text: 'Look for stainless-steel construction, an accurate thermostat that holds a safe 60–70°C, even heat distribution across all pans, and standard GN-pan compatibility so you can swap and source pans easily. These are the details that decide whether food stays appetising through a long service.',
      },
      { type: 'h2', text: 'Don\'t skip the GST invoice' },
      {
        type: 'p',
        text: 'For a GST-registered restaurant, buying from a supplier that issues a proper tax invoice lets you claim full Input Tax Credit — effectively reducing the cost by the GST rate. Every Kitchenary Kart order includes one.',
      },
      {
        type: 'p',
        text: 'Two popular picks: the [Electric Bain Marie with Glass (6 Compartments)](/product/KKHE0012-BMWG6) for front-of-house buffets and live counters, and the mobile [Hot Bain Marie Ready Counter](/product/KKHE0021-HBM3C) for banquet-scale holding.',
      },
      {
        type: 'cta',
        href: '/category/hot-equipment',
        label: 'Browse Bain Maries',
      },
      {
        type: 'p',
        text: 'Unsure which configuration fits your line? WhatsApp +91 98903 52455 with your menu and we\'ll recommend the right model.',
      },
    ],
  },
  {
    slug: 'restaurant-kitchen-setup-checklist',
    title: 'Restaurant Kitchen Setup Checklist: Equipment, Budget & Order',
    description:
      'A station-by-station equipment checklist for setting up a restaurant kitchen in India — what to buy, in what order, and how to keep capex down with GST and bulk pricing.',
    date: '2026-06-09',
    author: 'Kitchenary Kart',
    readMins: 7,
    tag: 'Setup Guide',
    body: [
      {
        type: 'p',
        text: 'Opening a restaurant is a long checklist, and the kitchen is the biggest single capex line. Buy in the wrong order or oversize the wrong station and you tie up cash you need elsewhere. This checklist walks the kitchen station by station so you can budget and order in the right sequence.',
      },
      { type: 'h2', text: '1. The cooking line (buy first)' },
      {
        type: 'p',
        text: 'This produces your food, so it comes first. Depending on your cuisine, that means a burner range, [commercial deep fryer](/blog/commercial-deep-fryer-buying-guide), griddle or tandoor, and the exhaust hood above them. Size the line to your peak simultaneous dishes.',
      },
      { type: 'h2', text: '2. Hot holding' },
      {
        type: 'p',
        text: 'A [bain marie](/blog/best-bain-marie-for-restaurants) keeps gravies, dal and sides at serving temperature through the shift so you\'re not cooking to order during the rush. Match compartment count to your hot menu.',
      },
      { type: 'h2', text: '3. Cold storage and the cold line' },
      {
        type: 'p',
        text: 'Food safety lives here. Size your [cold equipment](/category/cold-equipment) — chillers, freezers and an under-counter or display unit — for a full day\'s prep plus a buffer, and keep raw and cooked storage separate.',
      },
      { type: 'h2', text: '4. Prep and baking' },
      {
        type: 'p',
        text: 'Work tables, a [planetary mixer](/blog/how-to-choose-commercial-planetary-mixer), dough sheeter (if you bake), quality knives and storage. Mechanising repetitive prep is what lets a small team hit high volume.',
      },
      { type: 'h2', text: '5. Wash, waste and safety' },
      {
        type: 'ul',
        items: [
          'Three-sink wash station or dishwasher for compliance',
          'Hand-wash basin separate from the pot sink',
          'Waste bins, fire extinguisher and first-aid kit',
          'Adequate shelving and dry storage',
        ],
      },
      { type: 'h2', text: 'Keep capex down: GST, direct pricing, one supplier' },
      {
        type: 'p',
        text: 'Three levers keep a kitchen fit-out affordable: a GST invoice on every item (so you reclaim Input Tax Credit), direct brand pricing (no middleman markup), and sourcing from one supplier (one invoice, one delivery, consolidated bulk pricing).',
      },
      {
        type: 'cta',
        href: '/restaurant-equipment-supplier',
        label: 'See our restaurant equipment range',
      },
      {
        type: 'p',
        text: 'Opening soon? Send your menu and floor plan to +91 98903 52455 and we\'ll build a complete, costed equipment list with bulk pricing.',
      },
    ],
  },
];

/** All posts, newest first. */
export function getAllPosts(): BlogPost[] {
  return [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
