'use client';

/**
 * "Watch & Shop" — row of 4 reel-style cards (Instagram/Shorts-style vertical
 * aspect). Until real product-demo clips are uploaded we fake the "always
 * playing" motion with a slow ken-burns zoom/pan on the product image. Swap
 * the <img> for <video autoplay muted loop playsinline> when real clips are
 * available.
 */
import Link from 'next/link';
import { imgSrc, inr, letter } from '@/lib/format';
import type { PublicProduct } from '@/lib/products';

interface Props {
  products: PublicProduct[];
}

// Deterministic pseudo view-count per SKU, e.g. "1.2K Views" / "475 Views"
function pseudoViews(sku: string): string {
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  const n = 200 + (h % 2300); // 200 – 2500
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n);
}

export function WatchAndShop({ products }: Props) {
  // Show exactly four reels (client safeguard; page already slices to 4).
  const reels = products.slice(0, 4);

  return (
    <section className="py-14">
      {/* Ken-burns keyframes are scoped to this section via a plain <style> tag
          so we don't have to touch globals.css. Each card gets a slightly
          different delay so the motion isn't synchronized. */}
      <style jsx>{`
        @keyframes kk-kenburns {
          0%   { transform: scale(1.04) translate(0%, 0%); }
          25%  { transform: scale(1.12) translate(-2%, -1.5%); }
          50%  { transform: scale(1.18) translate(1%,  1.5%); }
          75%  { transform: scale(1.10) translate(2%, -1%); }
          100% { transform: scale(1.04) translate(0%, 0%); }
        }
        .kk-reel-img {
          animation: kk-kenburns 9s ease-in-out infinite;
          transform-origin: center;
          will-change: transform;
        }
      `}</style>

      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm]">
        <h2 className="text-center font-head text-[clamp(1.6rem,2.4vw,2.2rem)] text-brand mb-9">
          Watch &amp; Shop
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 mx-auto md:max-w-[72%]" style={{ gap: '1.5cm' }}>
          {reels.map((p, i) => {
            const href = `/product/${encodeURIComponent(p.sku)}`;
            return (
              <div
                key={p.sku}
                className="flex flex-col rounded-xl overflow-hidden border border-line bg-white shadow-sm hover:shadow-md transition"
              >
                {/* Reel-style vertical visual — 9:16 portrait */}
                <Link
                  href={href}
                  className="relative block aspect-[9/16] overflow-hidden"
                  style={{ background: 'linear-gradient(180deg, #F5E6CF 0%, #E6C8A8 100%)' }}
                >
                  {p.imageUrl ? (
                    <img
                      src={imgSrc(p.imageUrl)}
                      alt={p.name}
                      className="kk-reel-img absolute inset-0 w-full h-full object-cover"
                      style={{ animationDelay: `${i * -2.25}s` }}
                      loading="lazy"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-7xl font-head font-black text-brand/40">
                      {letter(p.name)}
                    </span>
                  )}

                  {/* Soft bottom gradient so overlay text stays legible */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />

                  {/* Brand chip top-left */}
                  <span className="absolute top-2.5 left-2.5 bg-brand text-white font-head text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded shadow">
                    Kitchenary Kart
                  </span>

                  {/* View count bottom-left */}
                  <div className="absolute left-3 bottom-2 text-white text-[11px] font-semibold drop-shadow">
                    {pseudoViews(p.sku)} Views
                  </div>

                  {/* Heart + Share bottom-right */}
                  <div className="absolute right-2 bottom-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Like"
                      onClick={(e) => e.preventDefault()}
                      className="w-7 h-7 rounded-full bg-white/95 grid place-items-center text-ink text-[13px] hover:text-brand"
                    >
                      ♥
                    </button>
                    <button
                      type="button"
                      aria-label="Share"
                      onClick={(e) => e.preventDefault()}
                      className="w-7 h-7 rounded-full bg-white/95 grid place-items-center text-ink text-[12px] hover:text-brand"
                    >
                      ➤
                    </button>
                  </div>
                </Link>

                {/* Product row under the visual */}
                <Link href={href} className="flex items-center gap-2.5 p-3 hover:bg-bg-soft transition">
                  <div className="w-9 h-9 rounded-full bg-bg-soft grid place-items-center overflow-hidden shrink-0">
                    {p.imageUrl ? (
                      <img
                        src={imgSrc(p.imageUrl)}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-head font-black text-brand opacity-60">
                        {letter(p.name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-ink font-medium truncate">{p.name}</div>
                    <div className="text-[12px] text-ink font-bold mt-0.5">{inr(p.price)}</div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
