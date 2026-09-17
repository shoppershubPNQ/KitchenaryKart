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
    // White bar, brand-red text (owner, 2026-09-17). Was a red gradient with
    // white text; on white the Amazon and Flipkart logos read at full contrast.
    // Taller than the 46px category row above it so the logos can be 22px.
    <section
      aria-label="Current offers and marketplaces"
      className="kk-ticker border-y border-brand/15 bg-white text-brand"
    >
      <div className="mx-auto max-w-site px-[6mm] md:px-[1.5cm]">
        <div className="flex flex-col md:min-h-[54px] md:flex-row md:items-center">
          {ticker && (
            <div className="min-w-0 flex-1">
              <OfferTickerTrack ticker={ticker} />
            </div>
          )}
          {/* The marketplace note keeps the ORIGINAL red gradient (owner,
              2026-09-17: offers go white-with-red, "Amazon and Flipkart strip
              same colour as before"). A red block on the white bar also frames
              the white logo chips better than either colour alone. */}
          <div className={`shrink-0 pb-2.5 md:py-1.5 ${ticker ? 'md:ml-6' : 'pt-2.5'}`}>
            <div className="rounded-lg border border-gold/40 bg-gradient-to-r from-brand-dark via-brand to-brand-dark px-4 py-2 md:px-5">
              <MarketplaceInline />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
