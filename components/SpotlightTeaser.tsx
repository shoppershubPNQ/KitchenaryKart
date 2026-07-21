import Link from 'next/link';
import type { SpotlightWithProduct } from '@/lib/spotlight';
import { imgSrc, inr, savingsPercent } from '@/lib/format';

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
      <div className="rounded-2xl border border-line bg-white overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Media */}
        <Link href={href} className="relative block bg-cream aspect-[4/3] md:aspect-auto md:min-h-[340px] grid place-items-center overflow-hidden group">
          {img ? (
            <img
              src={imgSrc(img, 900)}
              alt={name}
              className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="text-muted text-sm">Featured</span>
          )}
          {c.videoUrl && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              ▶ Watch video
            </span>
          )}
        </Link>

        {/* Content */}
        <div className="p-6 md:p-10 flex flex-col justify-center">
          <span className="inline-block w-fit bg-brand text-white text-[11px] font-head font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            {c.eyebrow || 'Featured'}
          </span>
          <h2 className="font-head text-2xl md:text-3xl font-bold text-ink leading-tight">
            <Link href={href} className="hover:text-brand">{name}</Link>
          </h2>

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
            <Link href={href} className="btn-primary inline-flex">View details</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
