/**
 * The bar under the header: scrolling offers on the left, the "Also available
 * on" Amazon / Flipkart block on the right — one strip instead of two blocks.
 *
 * Why it is one bar: the marketplace note used to be a 419px section. Moved
 * above the hero on its own it ate the whole first screen on a phone and the
 * hero banner never appeared without scrolling.
 *
 * Colours (owner, 2026-09-17): offers are brand-red bold text on white; the
 * marketplace block keeps the original red gradient.
 *
 * The red block runs to the RIGHT EDGE OF THE SCREEN and the full height of the
 * bar. It used to sit inside the page container, which left ~70px of white
 * after it on a wide screen (owner: "right pe space kyu, kharab hai, border
 * leke aao"). So this bar deliberately does not use the site container: the
 * offers scroll edge to edge and only take the container's side padding.
 *
 * Below md the two stack: the offers on top, the red block as a full-width row
 * under them — at 375px they cannot share a row without the offers being cut to
 * a few characters.
 */
import type { OfferTickerData } from '@/lib/offer-ticker';
import { OfferTickerTrack } from './OfferTicker';
import { MarketplaceInline } from './MarketplaceStrip';

export function OfferBar({ ticker }: { ticker: OfferTickerData | null }) {
  return (
    <section
      aria-label="Current offers and marketplaces"
      className="kk-ticker border-y border-brand/15 bg-white text-brand"
    >
      <div className="flex flex-col md:min-h-[72px] md:flex-row md:items-stretch">
        {ticker && (
          <div className="flex min-w-0 flex-1 items-center px-[6mm] md:pl-[1.5cm] md:pr-6">
            <div className="min-w-0 flex-1">
              <OfferTickerTrack ticker={ticker} />
            </div>
          </div>
        )}
        <div
          className={`flex shrink-0 items-center justify-center bg-gradient-to-r from-brand-dark via-brand to-brand-dark px-[6mm] py-3 md:justify-end md:py-2.5 md:pl-8 md:pr-[1.5cm] ${
            ticker ? '' : 'md:flex-1'
          }`}
        >
          <MarketplaceInline />
        </div>
      </div>
    </section>
  );
}
