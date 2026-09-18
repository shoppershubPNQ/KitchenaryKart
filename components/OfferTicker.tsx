/**
 * The scrolling offers themselves (text edited in the admin: Content → Offer
 * ticker). Rendered inside OfferBar, which owns the red bar and puts the
 * marketplace note beside it.
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
/** Rough rendered width of one character at this size, for timing. Mixed
 *  case is narrower than the all-caps this was first tuned for (was 9);
 *  nudged back up when the bar grew to 16px text. */
const PX_PER_CHAR = 8;
/** One copy of the row must outrun wide screens (~2000px), or a gap shows in
 *  the loop. Raised from 220 when the text stopped being forced to capitals:
 *  220 narrower characters no longer reliably clear a 1920px screen. */
const MIN_ROW_CHARS = 280;

export function OfferTickerTrack({ ticker }: { ticker: OfferTickerData }) {
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
                className="underline-offset-4 decoration-brand/50 hover:underline focus-visible:underline"
              >
                {it.text}
              </Link>
            ) : (
              <span>{it.text}</span>
            )}
            <span className="mx-6 md:mx-8 text-brand/40 text-[11px]" aria-hidden="true">
              ✦
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="kk-ticker-viewport overflow-hidden py-4">
      <div
        // Text shows exactly as written in admin — no forced capitals (owner,
        // 2026-09-17: "EMI" capital, the rest normal). Tracking dropped too:
        // wide letter-spacing suits all-caps and looks gappy in mixed case.
        // Bold at 15px so it carries the same weight as the 12px uppercase
        // bold category row above (measured live) — owner asked for that size.
        className="kk-ticker-track flex w-max font-head font-bold tracking-[0.01em] text-[14px] md:text-[16px]"
        style={{ animationDuration: `${seconds}s` }}
      >
        {list(0)}
        {list(1)}
      </div>
    </div>
  );
}
