'use client';

/**
 * "Watch & Shop" — row of 4 reel-style cards (Instagram/Shorts vertical 9:16).
 *
 * Two rendering modes:
 *
 *   1. Real reels (PublicReel[]) — uploaded MP4s play autoplay/muted/loop.
 *      Each card surfaces the linked product's name + price underneath and
 *      the whole card links to that product page.
 *
 *   2. Fake reels (PublicProduct[]) — fallback used when no reels exist
 *      yet, or to pad out to 4 slots when fewer than 4 reels are active.
 *      Each fake card shows the product image with a slow ken-burns
 *      zoom/pan to suggest motion.
 *
 * The page passes both — `reels` is preferred, `products` fills the rest.
 *
 * Performance: reel videos are heavy (5-60 MB each). The section sits
 * well below the fold on the home page, so we render the poster image
 * only until an IntersectionObserver tells us the section is in (or
 * about to enter) the viewport. This trims ~hundreds of KB of MP4 from
 * the initial home-page payload on mobile.
 */
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { imgSrc, inr, letter } from '@/lib/format';
import type { PublicProduct } from '@/lib/products';
import type { PublicReel } from '@/lib/reels';

interface Props {
  reels?: PublicReel[];
  products: PublicProduct[];
}

// Deterministic pseudo view-count per SKU, e.g. "1.2K Views" / "475 Views"
function pseudoViews(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const n = 200 + (h % 2300); // 200 – 2500
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n);
}

function formatViews(n: number, fallbackKey: string): string {
  if (n > 0) {
    return n >= 1000
      ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
      : String(n);
  }
  return pseudoViews(fallbackKey);
}

type Slot =
  | { kind: 'reel'; reel: PublicReel }
  | { kind: 'product'; product: PublicProduct };

export function WatchAndShop({ reels = [], products }: Props) {
  // Build up to 4 slots. Real reels first, then fall back to products to
  // fill any remaining slots so the section never looks empty.
  const slots: Slot[] = [];
  for (const r of reels) {
    if (slots.length >= 4) break;
    slots.push({ kind: 'reel', reel: r });
  }
  // Avoid showing the same product twice if it appears both as a reel target
  // and in the product fallback list.
  const usedSkus = new Set(
    slots
      .map((s) => (s.kind === 'reel' ? s.reel.productSku : null))
      .filter((x): x is string => !!x),
  );
  for (const p of products) {
    if (slots.length >= 4) break;
    if (usedSkus.has(p.sku)) continue;
    slots.push({ kind: 'product', product: p });
  }
  if (slots.length === 0) return null;

  // Lazy-load gate. Section starts in `videosArmed=false` so reel cards
  // render the poster image only (no <video> element, no MP4 download).
  // Once the section approaches the viewport, we flip to true and the
  // <video> elements mount and start autoplaying. rootMargin of 200px
  // gives the videos a head start so the first one is buffered by the
  // time it's actually on screen.
  const sectionRef = useRef<HTMLElement | null>(null);
  const [videosArmed, setVideosArmed] = useState(false);
  useEffect(() => {
    if (videosArmed) return;
    // Guard for SSR + older browsers — fall back to immediate render.
    if (typeof IntersectionObserver === 'undefined') {
      setVideosArmed(true);
      return;
    }
    const node = sectionRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVideosArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [videosArmed]);

  return (
    <section ref={sectionRef} className="py-14">
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
          {slots.map((slot, i) =>
            slot.kind === 'reel'
              ? renderReelCard(slot.reel, i, videosArmed)
              : renderProductCard(slot.product, i),
          )}
        </div>
      </div>
    </section>
  );
}

function renderReelCard(reel: PublicReel, i: number, videosArmed: boolean) {
  const product = reel.product;
  const href = product
    ? `/product/${encodeURIComponent(product.sku)}`
    : '/shop';
  const viewsKey = product?.sku ?? `reel-${reel.id}`;

  return (
    <div
      key={`reel-${reel.id}`}
      className="flex flex-col rounded-xl overflow-hidden border border-line bg-white shadow-sm hover:shadow-md transition"
    >
      <Link
        href={href}
        className="relative block aspect-[9/16] overflow-hidden bg-black"
      >
        {videosArmed ? (
          <video
            src={reel.videoUrl}
            poster={reel.thumbnailUrl || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          // Poster-only render until the IntersectionObserver in the
          // parent flips videosArmed. Keeps the home-page initial
          // payload small on mobile (no MP4 download until the user
          // scrolls near this section).
          reel.thumbnailUrl ? (
            <Image
              src={reel.thumbnailUrl}
              alt={reel.caption || ''}
              fill
              sizes="(max-width: 768px) 45vw, 200px"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-ink/80 to-ink" />
          )
        )}

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none" />

        <span className="absolute top-2.5 left-2.5 bg-brand text-white font-head text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded shadow">
          Kitchenary Kart
        </span>

        <div className="absolute left-3 bottom-2 text-white text-[11px] font-semibold drop-shadow">
          {formatViews(reel.viewCount, viewsKey)} Views
        </div>

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

      {product ? (
        <Link href={href} className="flex items-center gap-2.5 p-3 hover:bg-bg-soft transition">
          <div className="w-9 h-9 rounded-full bg-bg-soft grid place-items-center overflow-hidden shrink-0">
            {product.imageUrl ? (
              <Image
                src={imgSrc(product.imageUrl)}
                alt=""
                width={36}
                height={36}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-sm font-head font-black text-brand opacity-60">
                {letter(product.name)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-ink font-medium truncate">{product.name}</div>
            <div className="text-[12px] text-ink font-bold mt-0.5">{inr(product.price)}</div>
          </div>
        </Link>
      ) : (
        <div className="p-3 text-[12px] text-ink-soft line-clamp-2 min-h-[60px]">
          {reel.caption || 'See more on Kitchenary Kart'}
        </div>
      )}
    </div>
  );
}

function renderProductCard(p: PublicProduct, i: number) {
  const href = `/product/${encodeURIComponent(p.sku)}`;
  return (
    <div
      key={`product-${p.sku}`}
      className="flex flex-col rounded-xl overflow-hidden border border-line bg-white shadow-sm hover:shadow-md transition"
    >
      <Link
        href={href}
        className="relative block aspect-[9/16] overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #F5E6CF 0%, #E6C8A8 100%)' }}
      >
        {p.imageUrl ? (
          <Image
            src={imgSrc(p.imageUrl)}
            alt={p.name}
            fill
            sizes="(max-width: 768px) 45vw, 200px"
            className="kk-reel-img absolute inset-0 w-full h-full object-cover"
            style={{ animationDelay: `${i * -2.25}s` }}
            loading="lazy"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-7xl font-head font-black text-brand/40">
            {letter(p.name)}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />

        <span className="absolute top-2.5 left-2.5 bg-brand text-white font-head text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded shadow">
          Kitchenary Kart
        </span>

        <div className="absolute left-3 bottom-2 text-white text-[11px] font-semibold drop-shadow">
          {pseudoViews(p.sku)} Views
        </div>

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

      <Link href={href} className="flex items-center gap-2.5 p-3 hover:bg-bg-soft transition">
        <div className="w-9 h-9 rounded-full bg-bg-soft grid place-items-center overflow-hidden shrink-0">
          {p.imageUrl ? (
            <Image
              src={imgSrc(p.imageUrl)}
              alt=""
              width={36}
              height={36}
              className="w-full h-full object-contain"
              loading="lazy"
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
}
