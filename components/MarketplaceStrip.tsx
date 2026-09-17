/**
 * "Also available on [Amazon] [Flipkart]" — a trust note, deliberately WITHOUT
 * links (owner, 2026-09-15): it says where else the products are listed, it is
 * not a way to send buyers off the site. The label carries no product name on
 * purpose — the two logos finish the sentence.
 *
 * This used to be a full 419px section further down the page. It now rides in
 * the right-hand half of the offer bar under the header (see OfferBar), so it
 * is seen immediately without pushing the hero banner below the fold.
 *
 * It sits in a red block inside the otherwise white offer bar (owner,
 * 2026-09-17). The logos keep their white chips because Amazon's wordmark is
 * black and would disappear against red.
 *
 * Logos (owner approved the downloads, 2026-09-15): public/marketplaces/
 * amazon.svg (Wikimedia Commons "Amazon logo.svg") and flipkart-logo.png —
 * the full wordmark + bag from "Flipkart logo (2026).svg", trimmed and
 * rendered at 500x132 (11 KB) instead of shipping the 135 KB SVG. (The
 * earlier "Flipkart Logo as of 2025.png" was the bag icon only and read as a
 * bare yellow box.) Both are Amazon's / Flipkart's trademarks, used only to
 * say where else the products are listed.
 */
const MARKETPLACES = [
  { name: 'Amazon', logo: '/marketplaces/amazon.svg', width: 603, height: 182 },
  { name: 'Flipkart', logo: '/marketplaces/flipkart-logo.png', width: 500, height: 132 },
];

export function MarketplaceInline() {
  return (
    <div className="flex items-center justify-center gap-3 md:gap-4">
      {/* Same treatment as the category row: 12px bold uppercase, wide tracking. */}
      <span className="whitespace-nowrap font-head text-[11px] font-bold uppercase tracking-[0.05em] text-white/90 md:text-[12px]">
        Also available on
      </span>
      <ul className="flex items-center gap-2 md:gap-3">
        {MARKETPLACES.map((m) => (
          <li
            key={m.name}
            className="kk-mkt-plate flex items-center justify-center rounded-md bg-white px-3 py-1.5 md:px-3.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo, no optimisation needed */}
            <img
              src={m.logo}
              alt={`${m.name} logo`}
              width={m.width}
              height={m.height}
              loading="lazy"
              decoding="async"
              // Was 14/16px — too small to read at a glance (owner, 2026-09-17).
              className="h-[18px] w-auto object-contain md:h-[22px]"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
