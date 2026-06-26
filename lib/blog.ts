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
  /**
   * Optional on-page FAQ. When present, the post renders a "Frequently
   * asked questions" section AND emits FAQPage JSON-LD (rich-result
   * accordion in Google + verbatim lift by AI answer engines). The
   * on-page questions must match the markup, so both come from here.
   */
  faqs?: Array<{ q: string; a: string }>;
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
  {
    slug: 'commercial-kitchen-equipment-guide',
    title: 'Commercial Kitchen Equipment: The Complete Buyer\'s Guide',
    description:
      'How to plan, budget and buy commercial kitchen equipment in India — station by station, with in-depth guides for fryers, mixers, bain maries and cold equipment.',
    date: '2026-06-16',
    author: 'Kitchenary Kart',
    readMins: 9,
    tag: 'Buying Guide',
    body: [
      {
        type: 'p',
        text: 'Equipping a commercial kitchen is the biggest single capex decision most food businesses make. Buy in the wrong order, oversize the wrong station, or skip the GST invoice and you tie up cash you need elsewhere. This guide is the map: it walks the whole kitchen station by station and points you to the detailed buying guide for each major purchase.',
      },
      { type: 'h2', text: 'Plan by station, not by wishlist' },
      {
        type: 'p',
        text: 'Every kitchen — restaurant, cloud kitchen, café, bakery or hotel — breaks down into the same stations: a hot line, cold storage, a prep/baking zone, and service (buffet, bar, packing). Budget in that order, because the hot line produces your revenue and everything else supports it.',
      },
      { type: 'h2', text: 'The hot line' },
      {
        type: 'p',
        text: 'This is where most of your covers are produced. The core buys are a burner range, a [commercial deep fryer](/category/hot-equipment) and hot-holding. For fryers, our [commercial deep fryer buying guide](/blog/commercial-deep-fryer-buying-guide) covers tank sizing and electric-vs-gas; for holding cooked food at a safe temperature, the [bain marie buying guide](/blog/how-to-choose-commercial-bain-marie) explains compartments, wet vs dry and glass vs no-glass.',
      },
      { type: 'h2', text: 'Cold storage and display' },
      {
        type: 'p',
        text: 'Delivery and food safety live here. Size your [cold equipment](/category/cold-equipment) for a full day\'s prep plus a buffer, and keep raw and cooked storage separate. Running a dessert menu? The [snowflake ice machine buying guide](/blog/snowflake-ice-machine-buying-guide) walks through output, control type and running costs.',
      },
      { type: 'h2', text: 'Prep and baking' },
      {
        type: 'p',
        text: 'Mechanising repetitive prep is what lets a small team hit high volume. A [planetary mixer](/category/kitchen-baking) covers cream, batter and light dough; bread-led kitchens add a spiral mixer. See the [planetary mixer buying guide](/blog/how-to-choose-commercial-planetary-mixer) and our [planetary vs spiral mixer](/blog/planetary-mixer-vs-spiral-mixer) comparison to choose.',
      },
      { type: 'h2', text: 'Buffet, bar and service' },
      {
        type: 'p',
        text: 'Front-of-house and service stations round out the kitchen — [buffet & tableware](/category/buffet-tableware), [bar & beverage](/category/bar-beverage) and the packing bench for delivery. Match these to your service style: a self-service buffet needs presentation-grade holding; a cloud kitchen needs a fast packing line.',
      },
      { type: 'h2', text: 'Budget smart: GST, direct pricing, one supplier' },
      {
        type: 'p',
        text: 'Three levers keep a fit-out affordable: a GST invoice on every item (so a registered business reclaims Input Tax Credit), direct brand pricing (no middleman markup), and sourcing from one supplier (one invoice, one delivery, consolidated bulk pricing). As a [commercial kitchen equipment supplier](/commercial-kitchen-equipment-supplier) we cover all three.',
      },
      { type: 'h2', text: 'Checklists by kitchen format' },
      {
        type: 'p',
        text: 'For a format-specific shopping list, use the [cloud kitchen equipment checklist](/blog/cloud-kitchen-equipment-checklist) or the [restaurant kitchen setup checklist](/blog/restaurant-kitchen-setup-checklist) — both walk the build station by station with budgeting order.',
      },
      {
        type: 'cta',
        href: '/shop',
        label: 'Browse the full catalogue',
      },
      {
        type: 'p',
        text: 'Planning a new kitchen? Send your menu and floor plan to +91 98903 52455 and our team will build a complete, costed equipment list with bulk pricing.',
      },
    ],
  },
  {
    slug: 'planetary-mixer-vs-spiral-mixer',
    title: 'Planetary Mixer vs Spiral Mixer: Which Is Right for Your Bakery?',
    description:
      'Planetary vs spiral mixer — how each one mixes, which suits bread and pizza vs cakes and cream, and how to choose the right commercial mixer for your bakery.',
    date: '2026-06-16',
    author: 'Kitchenary Kart',
    readMins: 6,
    tag: 'Comparison',
    body: [
      {
        type: 'p',
        text: 'Planetary and spiral mixers both knead and mix, but they are built for different jobs. Pick the wrong one and you either struggle with bread dough or pay for capability you never use. Here is how they differ and which your bakery actually needs.',
      },
      { type: 'h2', text: 'How each one mixes' },
      {
        type: 'p',
        text: 'A planetary mixer holds the bowl still and moves an attachment (whisk, beater or dough hook) around it in a planetary path — versatile for cream, batter, cake mix and light dough. A spiral mixer rotates the bowl while a fixed spiral hook kneads, developing gluten gently without overheating the dough — purpose-built for bread and pizza.',
      },
      { type: 'h2', text: 'Choose a planetary mixer if…' },
      {
        type: 'p',
        text: 'Your work spans cream, frosting, batter, cake and the occasional dough — most cafés, dessert kitchens and general bakeries. It is the more flexible machine. Our [40L Electric Planetary Mixer](/product/KKKBE0003-B40) suits serious production; the [7L bench-top model](/product/KKKBE0005-B7) fits a growing café. Full sizing advice is in the [planetary mixer buying guide](/blog/how-to-choose-commercial-planetary-mixer).',
      },
      { type: 'h2', text: 'Choose a spiral mixer if…' },
      {
        type: 'p',
        text: 'Bread or pizza dough is your core product. A spiral mixer kneads more efficiently and keeps dough cool, so gluten develops consistently — better rise and crumb. Our [20L Electric Spiral Mixer](/product/KKKBE0009-SSD20) is a foundational machine for a bakery or pizzeria scaling up bread production.',
      },
      { type: 'h2', text: 'Quick verdict' },
      {
        type: 'ul',
        items: [
          'Mostly cakes, cream, batter, light dough → planetary mixer',
          'Mostly bread and pizza dough → spiral mixer',
          'Serious bakery doing both → run both (planetary for finishing, spiral for dough)',
        ],
      },
      {
        type: 'cta',
        href: '/category/kitchen-baking',
        label: 'Browse Mixers & Bakery Equipment',
      },
      {
        type: 'p',
        text: 'Not sure which fits your menu and volume? WhatsApp +91 98903 52455 and we\'ll recommend the right machine.',
      },
    ],
  },
  {
    slug: 'electric-vs-gas-commercial-deep-fryer',
    title: 'Electric vs Gas Commercial Deep Fryer: Which Should You Buy?',
    description:
      'Electric vs gas commercial deep fryer — installation, running cost, heat recovery and which suits your restaurant or QSR. A practical comparison for Indian kitchens.',
    date: '2026-06-16',
    author: 'Kitchenary Kart',
    readMins: 5,
    tag: 'Comparison',
    body: [
      {
        type: 'p',
        text: 'Once you have sized a fryer to your menu, the next question is electric or gas. Both fry well; the right choice depends on your kitchen\'s utilities, volume and budget. Here is the honest comparison.',
      },
      { type: 'h2', text: 'Electric deep fryers' },
      {
        type: 'ul',
        items: [
          'Easy to install — runs on a standard electrical connection, no gas line needed',
          'Precise, stable thermostat control — good for consistent results',
          'Great for counter-top and small-to-mid kitchens',
          'Higher per-unit energy cost than piped gas in high-volume use',
        ],
      },
      { type: 'h2', text: 'Gas deep fryers' },
      {
        type: 'ul',
        items: [
          'Faster heat recovery after a basket goes in — better for back-to-back frying',
          'Lower running cost where you have a piped or cylinder gas supply',
          'Best for high-volume restaurants and QSRs',
          'Needs a gas line and proper ventilation — a real install cost if you don\'t have one',
        ],
      },
      { type: 'h2', text: 'The verdict' },
      {
        type: 'p',
        text: 'If you run high volume and already have gas plumbed, a gas fryer usually wins on recovery and running cost. If you want simple installation, precise control and a cleaner counter-top setup, go electric — for example our [digital double deep fryer (14L + 14L)](/product/KKHE0097-FY14LD), which runs two tanks on a standard connection. For tank sizing and recovery time, see the full [commercial deep fryer buying guide](/blog/commercial-deep-fryer-buying-guide).',
      },
      {
        type: 'cta',
        href: '/category/hot-equipment',
        label: 'Browse Commercial Deep Fryers',
      },
      {
        type: 'p',
        text: 'Want a recommendation for your menu volume? WhatsApp +91 98903 52455 and we\'ll match a fryer to your line.',
      },
    ],
  },
  {
    slug: 'bain-marie-with-vs-without-glass',
    title: 'Bain Marie With Glass vs Without Glass: How to Choose',
    description:
      'Bain marie with glass vs without glass — which suits front-of-house buffets and which suits back-of-house plating lines. A quick decision guide for restaurants.',
    date: '2026-06-16',
    author: 'Kitchenary Kart',
    readMins: 4,
    tag: 'Comparison',
    body: [
      {
        type: 'p',
        text: 'The glass sneeze-guard is the single biggest choice when buying a bain marie. It is not about looks — it is about where the unit sits and who sees the food. Here is how to decide.',
      },
      { type: 'h2', text: 'Bain marie WITH glass — front of house' },
      {
        type: 'p',
        text: 'A glass top suits buffets, live counters and self-service setups where customers see the food. The sneeze-guard keeps the spread hygienic and presentable while holding it hot. Our [Electric Bain Marie with Glass (6 Compartments)](/product/KKHE0012-BMWG6) is built exactly for this — six GN pans on display under glass.',
      },
      { type: 'h2', text: 'Bain marie WITHOUT glass — back of house' },
      {
        type: 'p',
        text: 'For a back-of-house plating line or cloud kitchen, skip the glass. Staff need fast, unobstructed access to every pan during service, and presentation does not matter where customers never see it. A no-glass unit is also simpler to clean.',
      },
      { type: 'h2', text: 'The verdict' },
      {
        type: 'ul',
        items: [
          'Customers see the food (buffet, live counter, self-service) → with glass',
          'Plating line or cloud kitchen, speed over display → without glass',
          'Need both? Many kitchens run a glass unit out front and a plain one in the back',
        ],
      },
      {
        type: 'p',
        text: 'For sizing, wet vs dry heat and compartment count, see the full [how to choose a commercial bain marie](/blog/how-to-choose-commercial-bain-marie) guide and our [best bain marie for restaurants](/blog/best-bain-marie-for-restaurants) breakdown.',
      },
      {
        type: 'cta',
        href: '/category/hot-equipment',
        label: 'Browse Bain Maries',
      },
    ],
  },
  {
    slug: 'commercial-kitchen-spare-parts',
    title: 'Commercial Kitchen Spare Parts: Find the Right Replacement',
    description:
      'Need a spare part for your commercial kitchen? Genuine parts for bain marie, fryer, popcorn, shawarma, planetary mixer and more — with GST invoice and fast delivery.',
    date: '2026-06-25',
    author: 'Kitchenary Kart',
    readMins: 7,
    tag: 'Guide',
    body: [
      {
        type: 'p',
        text: 'A single ₹300 thermostat can keep a ₹50,000 machine sitting idle. In a commercial kitchen, downtime is lost revenue — every hour a fryer, bain marie or popcorn machine is out of action is covers you can\'t serve. The good news: most failures are a worn wear-part, not a dead machine, and the right [spare parts](/category/spare-parts) get you running again fast. This guide explains how to find the exact part you need and which spares are worth keeping on the shelf.',
      },
      { type: 'h2', text: 'How to find the right spare part' },
      {
        type: 'p',
        text: 'Ordering the wrong part wastes days. Work through these four steps before you buy and you\'ll get a part that actually fits the first time:',
      },
      {
        type: 'ul',
        items: [
          'Identify the machine — note the exact model and, if you bought from us, the product SKU. The same "popcorn machine" comes in several builds, and parts are not always interchangeable.',
          'Match the part — find the failed component (thermostat, heating element, motor, glass, knob) and the part it sits in. A photo of the old part next to a ruler helps enormously.',
          'Confirm the spec — check voltage (single vs three phase), wattage, thread size or dimensions. A 2000W element will not behave like a 1500W one.',
          'Order with the invoice — buy from a supplier who issues a GST invoice so you can claim Input Tax Credit on the repair.',
        ],
      },
      {
        type: 'p',
        text: 'Not sure which part you\'re looking at? Skip the guesswork — WhatsApp a clear photo of the broken part (and the machine\'s rating label) to +91 98903 52455 and we\'ll identify it and confirm the fitment before you pay.',
      },
      { type: 'h2', text: 'Spare parts by machine' },
      {
        type: 'p',
        text: 'Here are the parts that fail most often, grouped by machine, with a direct link to the matching spares. Each link runs a live search of our [spare parts catalogue](/category/spare-parts) so you see what\'s in stock right now.',
      },
      {
        type: 'p',
        text: 'Popcorn machine spare parts — the usual replacements are the kettle/bowl, stirring handle, lid, heating element and thermostat. The kettle and element take the most wear because they run hot all day. Browse [popcorn machine spares](/shop?q=popcorn).',
      },
      {
        type: 'p',
        text: 'Bain marie spare parts — a bain marie that won\'t hold temperature is almost always a failed thermostat or heating element; the glass sneeze-guard, indicator lamp and GN pans are the other common buys. See [bain marie spares](/shop?q=bain+marie) and our guide on [how to choose a commercial bain marie](/blog/how-to-choose-commercial-bain-marie) if you\'re weighing a replacement unit.',
      },
      {
        type: 'p',
        text: 'Deep fryer spare parts — the thermostat, heating element and basket are the wear items; a fryer that overheats or won\'t hold 180°C usually needs a new thermostat. Browse [deep fryer spares](/shop?q=fryer), and see the [commercial deep fryer buying guide](/blog/commercial-deep-fryer-buying-guide) for sizing a new one.',
      },
      {
        type: 'p',
        text: 'Shawarma machine spare parts — the motor (rotisserie drive), burner/heating element and the central skewer rod are the parts that wear or burn out. Find [shawarma machine spares](/shop?q=shawarma).',
      },
      {
        type: 'p',
        text: 'Planetary mixer spare parts — the bowl, whisk, flat beater, dough hook and gear set are all replaceable; a mixer that grinds or slips under dough usually needs a gear or belt, not a new machine. Browse [planetary mixer spares](/shop?q=mixer) and the [planetary mixer buying guide](/blog/how-to-choose-commercial-planetary-mixer).',
      },
      {
        type: 'p',
        text: 'Soft-serve, crepe and chocolate-fountain parts — soft ice-cream machines need scraper blades and seals; crepe makers need the hotplate and thermostat; chocolate fountains need the auger, motor and tiers. Search the catalogue for your machine name to see what we stock.',
      },
      {
        type: 'cta',
        href: '/category/spare-parts',
        label: 'Browse all Spare Parts',
      },
      { type: 'h2', text: 'Parts every kitchen should keep on the shelf' },
      {
        type: 'p',
        text: 'Some parts are generic wear items that fail across many machines. Keeping a small buffer of these turns a half-day breakdown into a five-minute swap:',
      },
      {
        type: 'ul',
        items: [
          'Thermostats — the single most common failure on any heated appliance',
          'Heating elements — they degrade with thermal cycling; a spare saves a service line',
          'Knobs, switches and indicator lamps — cheap, easily broken, instantly visible to customers',
          'Gaskets, seals and belts — small rubber and drive parts that quietly wear out',
        ],
      },
      { type: 'h2', text: 'Genuine vs local spares — what to watch for' },
      {
        type: 'p',
        text: 'A cheaper local part can be a false economy. The three things that matter are fitment (does it physically seat and seal correctly), electrical spec (matching voltage and wattage, so it doesn\'t trip, under-heat or burn out), and safety (a mismatched element or thermostat is a fire and shock risk in a wet, busy kitchen). Genuine, spec-matched parts last longer and protect the machine around them — which is why a slightly dearer correct part is almost always cheaper over a year.',
      },
      { type: 'h2', text: 'Buy spares with a GST invoice and pan-India delivery' },
      {
        type: 'p',
        text: 'Every Kitchenary Kart spare-parts order ships with a compliant GST invoice, so a registered business reclaims the tax as Input Tax Credit, and we deliver across India. As a [commercial kitchen equipment supplier](/commercial-kitchen-equipment-supplier) we keep parts for the machines we sell — so you\'re sourcing the equipment and its spares from one place.',
      },
      {
        type: 'cta',
        href: '/category/spare-parts',
        label: 'Find your spare part',
      },
      {
        type: 'p',
        text: 'Can\'t find your part in the catalogue? Send a photo of the broken component to +91 98903 52455 and we\'ll match it for you.',
      },
    ],
    faqs: [
      {
        q: 'How do I find the right spare part for my machine?',
        a: 'Identify the exact machine model (or SKU if you bought from us), locate the failed component, confirm its voltage/wattage and dimensions, then match it to the catalogue. If you are unsure, WhatsApp a photo of the broken part and the machine rating label to +91 98903 52455 and we will identify it for you.',
      },
      {
        q: 'Do you have popcorn machine, bain marie and shawarma spare parts?',
        a: 'Yes. We stock spares for popcorn machines (kettle, element, thermostat, handle), bain maries (thermostat, heating element, glass, indicator), shawarma machines (motor, burner, skewer rod), deep fryers, planetary mixers and many more — all in the Spare Parts category.',
      },
      {
        q: 'Are these genuine spare parts?',
        a: 'We supply genuine, spec-matched parts for the equipment we sell. Genuine parts ensure correct fitment, matching voltage and wattage, and safe operation — a mismatched element or thermostat is a fire and shock risk and usually fails sooner.',
      },
      {
        q: 'Do you ship spare parts across India with a GST invoice?',
        a: 'Yes. Every spare-parts order ships pan-India with a compliant GST invoice, so a GST-registered business can claim Input Tax Credit on the repair.',
      },
      {
        q: 'What if I cannot identify the part I need?',
        a: 'Send a clear photo of the broken part (next to a ruler for scale) and the machine model to +91 98903 52455 on WhatsApp. We will identify the part and confirm fitment before you order.',
      },
    ],
  },
  {
    slug: 'pizzeria-equipment-guide',
    title: 'Pizzeria Equipment Guide: The Complete Pizza Equipment List',
    description:
      'The complete pizzeria equipment list for India — commercial pizza ovens, peels, cutters, dockers, lifters, pans and oven spares, with price tips, GST and delivery.',
    date: '2026-06-25',
    author: 'Kitchenary Kart',
    readMins: 11,
    tag: 'Pillar Guide',
    body: [
      {
        type: 'p',
        text: 'Great pizza comes down to three things: the right oven, the right tools, and zero downtime. Get the oven wrong and your bases never crisp; skip a ₹500 tool and your pizzaiolo fights the dough all night; ignore spares and a single failed element shuts the kitchen mid-rush. This guide is the complete pizzeria equipment list for India — every machine and tool you need to open or restock a pizza operation, with buying advice and direct links to each product type. Use it as a checklist: oven, dough and prep, tools, serving, and spares.',
      },
      { type: 'h2', text: '1. Commercial pizza ovens — the heart of the kitchen' },
      {
        type: 'p',
        text: 'The oven is the single biggest decision and the biggest line in your budget. Everything else supports it. Get the throughput and heat right and the rest of the kitchen falls into place. Browse the range of [commercial pizza ovens](/shop?q=pizza+oven) and read the sections below before you choose.',
      },
      {
        type: 'p',
        text: 'Electric vs gas — electric pizza ovens are easy to install on a standard connection, give precise, even deck heat and suit cafés, cloud kitchens and most mid-volume pizzerias. Gas ovens recover heat faster between bakes and can be cheaper to run at high volume where you already have a gas line, but need proper ventilation. For most Indian pizzerias starting out, an electric deck oven is the simpler, more controllable choice.',
      },
      {
        type: 'p',
        text: 'Deck and tray configuration — pizza ovens are described by decks and trays (for example 1 Deck 1 Tray, or 1 Deck 2 Tray). More decks and trays mean more pizzas baking at once, so size the oven to your peak orders-per-hour, not your average. A single busy outlet is usually well served by a one or two-tray deck oven; multi-outlet or high-delivery-volume kitchens stack decks.',
      },
      {
        type: 'p',
        text: 'With stone vs without stone — a refractory baking stone stores and radiates heat into the base for the crisp, evenly-cooked bottom that defines a proper pizza. If authentic crust matters to your menu, choose an oven with a stone deck. Build quality also varies from economy to premium models; a heavier, better-insulated oven holds temperature more steadily through a long service.',
      },
      {
        type: 'p',
        text: 'Mini and counter-top pizza makers — for a café, kiosk or low-volume corner, a compact counter-top pizza maker bakes one pizza at a time without the footprint or power draw of a full deck oven. It\'s the right first machine when pizza is a side item rather than the core menu.',
      },
      {
        type: 'cta',
        href: '/shop?q=pizza+oven',
        label: 'Browse Commercial Pizza Ovens',
      },
      { type: 'h2', text: '2. Dough and prep equipment' },
      {
        type: 'p',
        text: 'Consistent pizza starts with consistent dough, and hand-kneading doesn\'t scale. A [planetary or dough mixer](/shop?q=dough) handles your daily dough batches; a dough sheeter speeds up rolling bases to an even thickness; and you\'ll want work tables, dough trays and a weighing scale for portioning. For mixer sizing and the planetary-vs-spiral choice, see the [planetary mixer buying guide](/blog/how-to-choose-commercial-planetary-mixer) and [planetary vs spiral mixer](/blog/planetary-mixer-vs-spiral-mixer) — spiral mixers knead bread and pizza dough more gently and are worth it once dough is your core product. Round out the prep zone from our [kitchen and baking range](/category/kitchen-baking).',
      },
      { type: 'h2', text: '3. Pizza tools — the essentials every pizzaiolo needs' },
      {
        type: 'p',
        text: 'Tools are cheap relative to the oven but they make or break the workflow. Here are the essentials and what each one does.',
      },
      {
        type: 'p',
        text: 'Pizza peel / pizza bat — the flat paddle used to launch a raw pizza into the oven and retrieve it. A wooden round bat releases the dough cleanly on the way in (less sticking than metal); a thin metal peel is better for sliding under a baked pizza to lift it out. Many kitchens keep both. Browse [pizza peels and bats](/shop?q=pizza+bat).',
      },
      {
        type: 'p',
        text: 'Pizza lifter / server — a stainless-steel lifter (commonly 10" and 12") for serving slices and moving baked pizzas without folding them. Match the size to your typical pizza diameter. See [pizza lifters and servers](/shop?q=pizza+lifter).',
      },
      {
        type: 'p',
        text: 'Pizza cutter — three styles dominate: the classic wheel cutter (quick, one-handed), the half-moon rocker or mezzaluna (clean single-press cuts, great for thick crust and high volume), and the U-shaped cutter. For a busy line the rocker is fastest and most consistent. Browse [pizza cutters](/shop?q=pizza+cutter).',
      },
      {
        type: 'p',
        text: 'Pizza docker — a spiked roller that pricks the dough so it bakes flat instead of bubbling up. A docker is the cheap tool that quietly fixes uneven, blistered bases. Look for a stainless head with a comfortable handle. See [pizza dockers](/shop?q=pizza+docker).',
      },
      {
        type: 'p',
        text: 'Pizza pans and trays — a non-stick (Teflon) pizza pan, ideally with a removable bottom, makes pan pizzas easy to release; a cast-iron slice pan holds heat for deep-dish and reheats. Browse [pizza pans and trays](/shop?q=pizza+pan).',
      },
      { type: 'h2', text: '4. Serving and display' },
      {
        type: 'p',
        text: 'Finish the kitchen with the front-of-house pieces: pizza stands and boards for table service, GN pans to hold prepped toppings on the make-line, and a menu or specials display board. A clean topping station speeds up assembly and keeps your line moving during the rush — see our [buffet and tableware range](/category/buffet-tableware).',
      },
      { type: 'h2', text: '5. Spare parts — keep your oven running' },
      {
        type: 'p',
        text: 'A pizza oven is a heated, high-cycle machine, and a single failed part during Friday-night service is the most expensive thing in this guide. The common pizza-oven spares are the baking stone, heating element, thermostat, timer, door spring, front glass, blower and ignitor. We keep 30+ pizza-oven spare parts in stock — stock the wear items (element, thermostat, stone) before you need them. Browse [pizza oven spares](/shop?q=pizza), and for how to identify a part, see our [commercial kitchen spare parts guide](/blog/commercial-kitchen-spare-parts).',
      },
      {
        type: 'cta',
        href: '/category/spare-parts',
        label: 'Browse Pizza Oven Spares',
      },
      { type: 'h2', text: 'How much does pizza equipment cost in India?' },
      {
        type: 'p',
        text: 'Budget in three buckets. The oven is by far the largest single outlay and scales with deck/tray count and build quality. Tools (peel, cutter, docker, lifter, pans) are a small one-time cost — usually a few thousand rupees for the full set. Spares are an ongoing line: budget a little each quarter to keep wear parts on the shelf. For a precise, itemised quote for your menu and volume, WhatsApp +91 98903 52455 and we\'ll build a full pizzeria list with bulk pricing.',
      },
      { type: 'h2', text: 'Sample pizzeria equipment checklist' },
      {
        type: 'p',
        text: 'A quick tick-list to equip a pizza kitchen from scratch:',
      },
      {
        type: 'ul',
        items: [
          'Commercial pizza oven (electric or gas; stone deck for crisp bases)',
          'Dough mixer (planetary or spiral) and a dough sheeter',
          'Work table, dough trays and a weighing scale',
          'Pizza peel / bat and a metal lifter',
          'Pizza cutter (wheel or rocker) and a pizza docker',
          'Pizza pans and trays in your standard sizes',
          'Topping make-line: GN pans, pizza stands/boards, menu display board',
          'Spare-parts buffer: element, thermostat, baking stone',
        ],
      },
      { type: 'h2', text: 'Where to buy — and what to check' },
      {
        type: 'p',
        text: 'When you source pizzeria equipment, check four things: genuine direct pricing (no middleman markup), a GST invoice on every item (so a registered business reclaims Input Tax Credit), spare-parts availability for the oven you\'re buying (so a breakdown is a quick swap, not a new machine), and pan-India delivery from a single supplier. As a [commercial kitchen equipment supplier](/commercial-kitchen-equipment-supplier) carrying the full pizza ecosystem — ovens, every tool, and 30+ spares — Kitchenary Kart covers all four. Setting up a cloud-kitchen pizza brand? Our [cloud kitchen equipment checklist](/blog/cloud-kitchen-equipment-checklist) walks the rest of the build.',
      },
      {
        type: 'cta',
        href: '/shop?q=pizza',
        label: 'Shop all Pizza Equipment',
      },
      {
        type: 'p',
        text: 'Setting up a pizzeria? WhatsApp +91 98903 52455 for a complete equipment-and-spares list with bulk pricing tailored to your menu.',
      },
    ],
    faqs: [
      {
        q: 'What equipment do I need to start a pizzeria in India?',
        a: 'At minimum: a commercial pizza oven (electric or gas, ideally with a stone deck), a dough mixer, and the core tools — a pizza peel/bat, a lifter, a cutter, a docker and pizza pans. Add a topping make-line (GN pans, work table) and a buffer of oven spare parts (element, thermostat, stone) so a breakdown does not stop service.',
      },
      {
        q: 'Electric vs gas pizza oven — which is better?',
        a: 'Electric ovens install on a standard connection, give precise, even deck heat and suit most cafés, cloud kitchens and mid-volume pizzerias. Gas ovens recover heat faster and can be cheaper to run at high volume where you already have a gas line, but need proper ventilation. For most Indian pizzerias starting out, electric is the simpler, more controllable choice.',
      },
      {
        q: 'What is the difference between a pizza peel, bat and lifter?',
        a: 'A peel or bat is the flat paddle used to launch a raw pizza into the oven and retrieve it — a wooden round bat releases dough cleanly going in, a thin metal peel slides under a baked pizza to lift it out. A lifter (server) is a smaller stainless tool for serving slices and moving baked pizzas. Many kitchens keep all three.',
      },
      {
        q: 'What does a pizza docker do?',
        a: 'A pizza docker is a spiked roller that pricks small holes in the rolled-out dough so it bakes flat instead of bubbling up into large blisters. It is a cheap tool that gives you an even, professional base every time.',
      },
      {
        q: 'Which pizza cutter is best — wheel, rocker or U-shaped?',
        a: 'A wheel cutter is quick and one-handed for general use. A half-moon rocker (mezzaluna) makes clean single-press cuts and is fastest and most consistent on a busy line, especially for thick crust. A U-shaped cutter is an alternative press-style design. For high volume, most kitchens prefer the rocker.',
      },
      {
        q: 'Do you stock pizza oven spare parts like stone, element and thermostat?',
        a: 'Yes — we keep 30+ pizza-oven spare parts, including the baking stone, heating element, thermostat, timer, door spring, front glass, blower and ignitor. Stock the wear items before you need them so a failure is a quick swap rather than lost service.',
      },
      {
        q: 'Do you provide a GST invoice and pan-India delivery?',
        a: 'Yes. Every order — ovens, tools and spares — ships with a compliant GST invoice so a registered business can claim Input Tax Credit, and we deliver across India from a single supplier.',
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
