import Link from 'next/link';
import type { SpotlightWithProduct } from '@/lib/spotlight';
import { inr, savingsPercent } from '@/lib/format';
import { SpotlightMedia } from './SpotlightMedia';

/**
 * Home-page teaser for the Featured Spotlight — a compact two-column band that
 * links to the full /featured/<slug> page. Server component: no client JS, the
 * buy flow lives on the dedicated page.
 */
export function SpotlightTeaser({ data }: { data: SpotlightWithProduct }) {
  const { content: c, product: p } = data;
  const name = c.headline || p?.name || 'Featured product';
  const price = p?.price ?? null;
  const mrp = p?.mrp ?? null;
  const save = price != null ? savingsPercent(price, mrp) : 0;
  const img = p?.imageUrl || (p?.images?.[0] ?? null) || c.videoPoster;
  const href = `/featured/${c.slug}`;

  return (
    <section className="max-w-site mx-auto px-[6mm] md:px-[1.5cm]">
      {/* Section title — matches the site's centered brand section headings
          (cf. Watch & Shop) with decorative flanking lines + a gold kicker
          for a premium, attention-drawing feel. */}
      <div className="text-center mb-8 md:mb-10">
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <span className="h-px w-10 md:w-20 bg-gradient-to-r from-transparent to-brand/50" aria-hidden />
          <h2 className="flex items-center gap-2 font-head font-bold text-brand text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none whitespace-nowrap">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 md:h-6 md:w-6 text-gold shrink-0" aria-hidden>
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z" />
            </svg>
            Hero Product
          </h2>
          <span className="h-px w-10 md:w-20 bg-gradient-to-l from-transparent to-brand/50" aria-hidden />
        </div>
        <p className="mt-2.5 text-[11px] md:text-xs font-semibold uppercase tracking-[3px] text-gold">
          Handpicked for you
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-white overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Media — poster still; plays the spotlight video on hover */}
        <SpotlightMedia
          href={href}
          name={name}
          img={img}
          videoUrl={c.videoUrl}
          videoPoster={c.videoPoster}
        />

        {/* Content */}
        <div className="p-6 md:p-10 flex flex-col justify-center">
          <h3 className="font-head text-2xl md:text-3xl font-bold text-ink leading-tight">
            <Link href={href} className="hover:text-brand">{name}</Link>
          </h3>

          {c.keyFeatures.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {c.keyFeatures.slice(0, 3).map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-soft">
                  <span className="text-brand shrink-0">✓</span><span>{f}</span>
                </li>
              ))}
            </ul>
          )}

          {price != null && (
            <div className="mt-5 flex items-baseline gap-2.5 flex-wrap">
              <span className="font-head text-2xl font-bold text-ink">{inr(price)}</span>
              {mrp != null && mrp > price && <span className="text-muted line-through">{inr(mrp)}</span>}
              {save > 0 && <span className="text-sm font-bold text-success">SAVE {save}%</span>}
            </div>
          )}

          <div className="mt-6">
            <Link href={href} className="btn btn-primary">
              View details
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
