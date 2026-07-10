'use client';

/**
 * "Watch & Shop" — a 3D coverflow CAROUSEL of reel-style cards (Instagram /
 * Shorts vertical 9:16). The active card faces the viewer; neighbours angle
 * back into 3D space around a shallow ring.
 *
 * Two card modes:
 *
 *   1. Real reels (PublicReel[]) — uploaded MP4s. Only the ACTIVE card mounts
 *      a <video> (autoplay/muted/loop); off-centre cards show the poster, so
 *      at most one heavy MP4 plays at a time.
 *
 *   2. Fake reels (PublicProduct[]) — fallback / padding when there aren't
 *      enough real reels. Shows the product image with a slow ken-burns pan.
 *
 * Controls: prev/next arrows, dot indicators, drag / swipe, ←/→ keys, and
 * auto-advance that pauses on hover, when the section is off-screen, when the
 * tab is hidden, or when the user prefers reduced motion.
 *
 * Performance: the whole section is behind an IntersectionObserver gate — no
 * <video> element mounts (and no MP4 downloads) until it nears the viewport.
 */
import Link from 'next/link';
import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { imgSrc, inr, letter } from '@/lib/format';
import type { PublicProduct } from '@/lib/products';
import type { PublicReel } from '@/lib/reels';

interface Props {
  reels?: PublicReel[];
  products: PublicProduct[];
}

// How many cards the carousel will hold at most. Real reels fill first, then
// products pad the rest — more cards make the 3D ring feel fuller.
const MAX_SLOTS = 8;

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
  // Build up to MAX_SLOTS cards. Real reels first, then products to pad so the
  // ring never looks sparse.
  const slots: Slot[] = useMemo(() => {
    const out: Slot[] = [];
    for (const r of reels) {
      if (out.length >= MAX_SLOTS) break;
      out.push({ kind: 'reel', reel: r });
    }
    const usedSkus = new Set(
      out
        .map((s) => (s.kind === 'reel' ? s.reel.productSku : null))
        .filter((x): x is string => !!x),
    );
    for (const p of products) {
      if (out.length >= MAX_SLOTS) break;
      if (usedSkus.has(p.sku)) continue;
      out.push({ kind: 'product', product: p });
    }
    return out;
  }, [reels, products]);

  const n = slots.length;

  const sectionRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);
  const [videosArmed, setVideosArmed] = useState(false);
  const [inView, setInView] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [docHidden, setDocHidden] = useState(false);

  // Clamp the active index if the slot count ever shrinks (e.g. HMR / prop
  // change) so we never point past the end of the ring.
  useEffect(() => {
    if (n > 0 && active >= n) setActive(0);
  }, [n, active]);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (n < 2) return;
      setActive((a) => (a + dir + n) % n);
    },
    [n],
  );

  // Reduced-motion preference — disables auto-advance (respects the user).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  // Pause auto-advance when the tab isn't visible.
  useEffect(() => {
    const onVis = () => setDocHidden(document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // IntersectionObserver drives two things: arm the videos once (heavy MP4s
  // only download when we near the section), and track in/out of view so
  // auto-advance stops while off-screen.
  useEffect(() => {
    const node = sectionRef.current;
    if (typeof IntersectionObserver === 'undefined' || !node) {
      setVideosArmed(true);
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries.some((e) => e.isIntersecting);
        setInView(on);
        if (on) setVideosArmed(true);
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const paused = hovering || !inView || docHidden || reducedMotion;

  // Auto-advance the ring while playing.
  useEffect(() => {
    if (paused || n < 2) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % n), 4200);
    return () => window.clearInterval(id);
  }, [paused, n]);

  // Drag / swipe navigation.
  const drag = useRef<{ x: number; down: boolean }>({ x: 0, down: false });
  const onPointerDown = (e: ReactPointerEvent) => {
    drag.current = { x: e.clientX, down: true };
  };
  const endDrag = (e: ReactPointerEvent) => {
    if (!drag.current.down) return;
    const dx = e.clientX - drag.current.x;
    drag.current.down = false;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
  };

  if (n === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="py-14"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <style jsx>{`
        @keyframes kk-kenburns {
          0% { transform: scale(1.04) translate(0%, 0%); }
          25% { transform: scale(1.12) translate(-2%, -1.5%); }
          50% { transform: scale(1.18) translate(1%, 1.5%); }
          75% { transform: scale(1.1) translate(2%, -1%); }
          100% { transform: scale(1.04) translate(0%, 0%); }
        }
        .kk-reel-img {
          animation: kk-kenburns 9s ease-in-out infinite;
          transform-origin: center;
          will-change: transform;
        }
        .kk-cf-viewport {
          overflow: hidden;
          padding: 0.5rem 0 1rem;
        }
        .kk-cf-stage {
          position: relative;
          height: 500px;
          perspective: 1600px;
          margin: 0 auto;
        }
        .kk-cf-card {
          position: absolute;
          top: 0;
          left: 50%;
          width: 236px;
          margin-left: -118px;
          transform-style: preserve-3d;
          transition:
            transform 0.55s cubic-bezier(0.2, 0.7, 0.2, 1),
            opacity 0.55s ease;
          will-change: transform, opacity;
        }
        @media (max-width: 767px) {
          .kk-cf-stage {
            height: 448px;
          }
          .kk-cf-card {
            width: 196px;
            margin-left: -98px;
          }
        }
      `}</style>

      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm]">
        <h2 className="text-center font-head text-[clamp(1.6rem,2.4vw,2.2rem)] text-brand mb-9">
          Watch &amp; Shop
        </h2>

        <div className="relative kk-cf-viewport">
          <div
            className="kk-cf-stage select-none"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onPointerCancel={endDrag}
          >
            {slots.map((slot, i) => {
              // Signed offset from the active card, wrapped so the cards form a
              // ring: the card "opposite" the active one sits at the back.
              let o = i - active;
              if (o > n / 2) o -= n;
              if (o < -n / 2) o += n;
              const ao = Math.abs(o);
              const visible = ao <= 2;

              // Coverflow transform: fan out along X, push back in Z, angle in.
              const translateX = o * 88; // % of own width
              const translateZ = -ao * 180; // px
              const rotateY = -o * 38; // deg
              const scale = Math.max(0.7, 1 - ao * 0.15);
              const opacity = ao === 0 ? 1 : ao === 1 ? 0.85 : ao === 2 ? 0.5 : 0;

              const isActive = o === 0;
              const key =
                slot.kind === 'reel'
                  ? `reel-${slot.reel.id}`
                  : `product-${slot.product.sku}`;

              return (
                <div
                  key={key}
                  className="kk-cf-card"
                  aria-hidden={!visible}
                  style={{
                    transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    zIndex: 100 - ao,
                    pointerEvents: visible ? 'auto' : 'none',
                    cursor: isActive ? 'default' : 'pointer',
                  }}
                  // A click on a side card re-centres it instead of following
                  // its link; the active card's links work normally.
                  onClickCapture={(e) => {
                    if (!isActive) {
                      e.preventDefault();
                      e.stopPropagation();
                      setActive(i);
                    }
                  }}
                >
                  {slot.kind === 'reel'
                    ? renderReelCard(slot.reel, videosArmed && isActive)
                    : renderProductCard(slot.product, i, isActive)}
                </div>
              );
            })}
          </div>

          {n > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous reel"
                onClick={() => go(-1)}
                className="absolute left-1 md:left-3 top-1/2 -translate-y-1/2 z-[200] w-11 h-11 rounded-full bg-white/95 border border-line shadow-md grid place-items-center text-ink hover:bg-brand hover:text-white transition"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next reel"
                onClick={() => go(1)}
                className="absolute right-1 md:right-3 top-1/2 -translate-y-1/2 z-[200] w-11 h-11 rounded-full bg-white/95 border border-line shadow-md grid place-items-center text-ink hover:bg-brand hover:text-white transition"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </>
          )}
        </div>

        {n > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            {slots.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to reel ${i + 1}`}
                aria-current={i === active}
                onClick={() => setActive(i)}
                className={`rounded-full transition-all ${
                  i === active
                    ? 'w-6 h-2 bg-brand'
                    : 'w-2 h-2 bg-line hover:bg-brand/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function renderReelCard(reel: PublicReel, playVideo: boolean) {
  const product = reel.product;
  const href = product
    ? `/product/${encodeURIComponent(product.sku)}`
    : '/shop';
  const viewsKey = product?.sku ?? `reel-${reel.id}`;

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-line bg-white shadow-lg">
      <Link
        href={href}
        className="relative block aspect-[9/16] overflow-hidden bg-black"
        draggable={false}
      >
        {playVideo ? (
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
        ) : reel.thumbnailUrl ? (
          <Image
            src={reel.thumbnailUrl}
            alt={reel.caption || ''}
            fill
            sizes="(max-width: 768px) 45vw, 240px"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-ink/80 to-ink" />
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
        <Link href={href} className="flex items-center gap-2.5 p-3 hover:bg-bg-soft transition" draggable={false}>
          <div className="w-9 h-9 rounded-full bg-bg-soft grid place-items-center overflow-hidden shrink-0">
            {product.imageUrl ? (
              <img
                src={imgSrc(product.imageUrl, 72)}
                alt={product.name}
                width={36}
                height={36}
                loading="lazy"
                className="w-full h-full object-contain"
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

function renderProductCard(p: PublicProduct, i: number, animate: boolean) {
  const href = `/product/${encodeURIComponent(p.sku)}`;
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-line bg-white shadow-lg">
      <Link
        href={href}
        className="relative block aspect-[9/16] overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #F5E6CF 0%, #E6C8A8 100%)' }}
        draggable={false}
      >
        {p.imageUrl ? (
          <img
            src={imgSrc(p.imageUrl, 400)}
            alt={p.name}
            width={400}
            height={600}
            loading="lazy"
            className={`${animate ? 'kk-reel-img ' : ''}absolute inset-0 w-full h-full object-cover`}
            style={animate ? { animationDelay: `${i * -2.25}s` } : undefined}
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

      <Link href={href} className="flex items-center gap-2.5 p-3 hover:bg-bg-soft transition" draggable={false}>
        <div className="w-9 h-9 rounded-full bg-bg-soft grid place-items-center overflow-hidden shrink-0">
          {p.imageUrl ? (
            <img
              src={imgSrc(p.imageUrl, 96)}
              alt={p.name}
              width={36}
              height={36}
              loading="lazy"
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
}
