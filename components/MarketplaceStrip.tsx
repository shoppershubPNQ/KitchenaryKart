/**
 * "Also available on marketplaces" — tells visitors Kitchenary Kart is on
 * Amazon and Flipkart too. Static, and deliberately WITHOUT links (owner,
 * 2026-09-15): the point is trust, not sending buyers away from the site.
 *
 * Colour split asked for by the owner: roughly 80% white, 12% brand red
 * (side bar, eyebrow, tick badges), 8% ink black (headline, names).
 * Marketplace names are plain text, not logos — those are other companies'
 * trademarks.
 */
const MARKETPLACES = ['Amazon', 'Flipkart'];

export function MarketplaceStrip() {
  return (
    <section aria-label="Also available on marketplaces" className="bg-white py-10 md:py-14">
      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm]">
        <div className="relative overflow-hidden rounded-xl border border-line bg-white px-6 py-7 md:px-10 md:py-9 flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
          <span aria-hidden="true" className="absolute left-0 top-0 h-full w-1.5 bg-brand" />
          <div className="md:flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand mb-2">
              Also available on marketplaces
            </div>
            <h2 className="font-head text-[clamp(1.25rem,2vw,1.65rem)] text-ink leading-snug">
              Find Kitchenary Kart on Amazon and Flipkart
            </h2>
            <p className="mt-2 text-[14.5px] text-muted max-w-xl">
              Prefer shopping on a marketplace? Our products are listed there too — or order right here, directly
              from us.
            </p>
          </div>
          <ul className="flex flex-wrap gap-3 md:gap-4">
            {MARKETPLACES.map((m) => (
              <li
                key={m}
                className="flex items-center gap-3 rounded-lg border border-ink/10 bg-white px-5 py-3.5 md:px-6 md:py-4 shadow-sm"
              >
                <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-brand">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="font-head text-[17px] md:text-[19px] font-bold text-ink">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
