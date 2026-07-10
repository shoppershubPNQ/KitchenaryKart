/**
 * Brand-level trust ribbon shown above the header on every page.
 *
 * Three short, verifiable claims:
 *   1. GSTIN-verified           → legitimacy signal (we're a real registered business)
 *   2. 200+ HORECA clients      → social proof (other restaurants trust us, so can you)
 *   3. Pan-India delivery       → reach signal (we ship anywhere in India)
 *
 * Different from PdpTrustBadges:
 *   - PdpTrustBadges = product-level (only on PDPs, near the buy button)
 *   - PromoBar       = brand-level (every page, above the fold, sets first impression)
 *
 * Layout: single horizontal row with bullet-separator on desktop;
 * stays single-row on mobile via slightly smaller text + tighter
 * spacing. We deliberately avoid auto-rotating tickers — they feel
 * sales-pitchy and steal attention from the actual content below.
 */
export function PromoBar() {
  const items = [
    'GSTIN-verified',
    '200+ HORECA clients',
    'Pan-India delivery',
  ];
  return (
    <div className="bg-ink text-cream text-[10px] md:text-xs tracking-wide py-2 px-2 md:px-4 overflow-hidden">
      <div className="max-w-site mx-auto flex items-center justify-center gap-1.5 md:gap-4 flex-nowrap text-center">
        {items.map((item, i) => (
          <span key={item} className="inline-flex items-center gap-1 md:gap-1.5 whitespace-nowrap">
            <svg
              viewBox="0 0 24 24"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-success shrink-0"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{item}</span>
            {i < items.length - 1 && (
              <span className="ml-1 md:ml-4 opacity-30" aria-hidden="true">
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
