/**
 * The red bar under the header: scrolling offers on the left, the "also on
 * Amazon & Flipkart" note on the right — one strip instead of two blocks.
 *
 * Why it is one bar: the marketplace note used to be a 419px section. Moved
 * above the hero on its own it ate the whole first screen on a phone and the
 * hero banner never appeared without scrolling. Folded in here it costs ~42px
 * on desktop and ~76px stacked on a phone, and both messages are seen first.
 *
 * Layout: the offers take the remaining width and scroll; the marketplace note
 * keeps its natural width and never shrinks, so the logos stay legible. Below
 * md the two stack, because at 375px they cannot share a row without the
 * offers being squeezed into a few characters.
 */
import type { OfferTickerData } from '@/lib/offer-ticker';
import { OfferTickerTrack } from './OfferTicker';
import { MarketplaceInline } from './MarketplaceStrip';

export function OfferBar({ ticker }: { ticker: OfferTickerData | null }) {
  return (
    <section
      aria-label="Current offers and marketplaces"
      className="kk-ticker border-y border-gold/40 bg-gradient-to-r from-brand-dark via-brand to-brand-dark text-white"
    >
      <div className="mx-auto max-w-site px-[6mm] md:px-[1.5cm]">
        <div className="flex flex-col md:flex-row md:items-center">
          {ticker && (
            <div className="min-w-0 flex-1">
              <OfferTickerTrack ticker={ticker} />
            </div>
          )}
          <div
            className={`shrink-0 border-white/20 py-2 md:py-0 ${
              ticker ? 'border-t md:ml-6 md:border-l md:border-t-0 md:pl-6' : ''
            }`}
          >
            <MarketplaceInline />
          </div>
        </div>
      </div>
    </section>
  );
}
