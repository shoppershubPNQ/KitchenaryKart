/**
 * Scrolling red offer strip under the home hero (text edited in the admin:
 * Content → Offer ticker).
 *
 * Pure CSS, no client JavaScript: the row of offers is rendered twice and the
 * track slides left by exactly one copy (-50%), so the loop is seamless and
 * never stops. Short lists are repeated inside a row so one copy is always
 * wider than the screen. Speed is in pixels per second, so a long list takes
 * longer rather than scrolling faster. Pauses on hover/focus; with "reduce
 * motion" switched on it stands still and can be scrolled by hand
 * (styles in globals.css: .kk-ticker*).
 */
import Link from 'next/link';
import type { OfferTickerData } from '@/lib/offer-ticker';

const PX_PER_SEC = { slow: 40, normal: 60, fast: 90 } as const;
/** Rough rendered width of one character at this size, for timing only. */
const PX_PER_CHAR = 9;
/** One copy of the row must outrun wide screens (~2000px). */
const MIN_ROW_CHARS = 220;

export function OfferTicker({ ticker }: { ticker: OfferTickerData }) {
  const chars = ticker.items.reduce((n, i) => n + i.text.length + 6, 0) || 1;
  const repeat = Math.max(1, Math.ceil(MIN_ROW_CHARS / chars));
  const row = Array.from({ length: repeat }, () => ticker.items).flat();
  const seconds = Math.max(12, Math.round((chars * repeat * PX_PER_CHAR) / PX_PER_SEC[ticker.speed]));

  // The second copy is for the loop only: hidden from screen readers and
  // skipped by the keyboard, so each offer is announced/focused once.
  const list = (copy: number) => (
    <ul className="flex shrink-0 items-center" aria-hidden={copy > 0 || undefined}>
      {row.map((it, i) => {
        const focusable = copy === 0 && i < ticker.items.length;
        return (
          <li key={i} className="flex items-center whitespace-nowrap">
            {it.href ? (
              <Link
                href={it.href}
                tabIndex={focusable ? undefined : -1}
                className="underline-offset-4 decoration-gold/70 hover:underline focus-visible:underline"
              >
                {it.text}
              </Link>
            ) : (
              <span>{it.text}</span>
            )}
            <span className="mx-6 md:mx-8 text-gold text-[11px]" aria-hidden="true">
              ✦
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section
      aria-label="Current offers"
      className="kk-ticker bg-gradient-to-r from-brand-dark via-brand to-brand-dark text-white border-y border-gold/40"
    >
      <div className="kk-ticker-viewport overflow-hidden py-2.5">
        <div
          className="kk-ticker-track flex w-max font-head font-semibold uppercase tracking-[0.06em] text-[12px] md:text-[13.5px]"
          style={{ animationDuration: `${seconds}s` }}
        >
          {list(0)}
          {list(1)}
        </div>
      </div>
    </section>
  );
}
