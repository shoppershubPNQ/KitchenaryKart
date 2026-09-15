/**
 * "Also available on marketplaces" — Kitchenary Kart is on Amazon and
 * Flipkart too. Static and deliberately WITHOUT links (owner, 2026-09-15):
 * it is a trust signal, not a way to send buyers off the site.
 *
 * Look: ~80% white, ~12% brand red (top bar, pill, highlight, hover accents),
 * ~8% ink black (headline). A soft dot grid and a faint red glow sit behind a
 * raised card; the marketplace tiles lift with a red accent on hover (styles:
 * .kk-mkt-* in globals.css; hover motion is off for reduced-motion users).
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

const DIRECT_PERKS = ['GST invoice on direct orders', 'Bulk & HORECA pricing direct'];

function Tick() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function MarketplaceStrip() {
  return (
    <section aria-labelledby="kk-mkt-title" className="relative overflow-hidden bg-white py-14 md:py-20">
      {/* Decoration only */}
      <div aria-hidden="true" className="kk-mkt-dots absolute inset-0" />
      <div aria-hidden="true" className="absolute -top-28 -right-20 h-80 w-80 rounded-full bg-brand/[0.07] blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-brand/[0.05] blur-3xl" />

      <div className="relative max-w-site mx-auto px-[6mm] md:px-[1.5cm]">
        <div className="kk-mkt-card relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-ink/[0.08] bg-white px-6 py-9 md:px-12 md:py-12 grid gap-9 md:grid-cols-[1.15fr_1fr] md:gap-14 items-center">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-dark via-brand to-brand-hover" />

          <div>
            <h2 id="kk-mkt-title" className="font-head text-[clamp(1.55rem,2.7vw,2.35rem)] font-extrabold leading-[1.15] text-ink">
              We are available on <span className="kk-mkt-mark">these platforms</span>
            </h2>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5">
              {DIRECT_PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-[13.5px] font-medium text-ink/80">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                    <Tick />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <ul className="grid grid-cols-2 gap-4 md:gap-5">
            {MARKETPLACES.map((m) => (
              <li
                key={m.name}
                className="kk-mkt-tile relative flex flex-col items-center justify-center rounded-xl border border-ink/[0.08] bg-white px-4 py-8 md:px-6 md:py-11"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo, no optimisation needed */}
                <img
                  src={m.logo}
                  alt={`${m.name} logo`}
                  width={m.width}
                  height={m.height}
                  loading="lazy"
                  decoding="async"
                  className="relative h-8 w-auto max-w-full object-contain md:h-10"
                />
                <span className="relative mt-5 text-[10.5px] font-bold uppercase tracking-[1.8px] text-muted">
                  Listed on {m.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
