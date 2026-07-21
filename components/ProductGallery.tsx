'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { imgSrc, letter } from '@/lib/format';
import { toggleWishlist, useIsInWishlist } from '@/lib/wishlist';

// Magnification for the desktop hover-zoom, and the source width we pull for
// zoomed views. The main image renders at ~600px CSS; at 2.5x we need ~1500px
// of real pixels to stay sharp, so ask Cloudinary for 2000 (also reused by the
// lightbox, so hovering first warms the cache for the expanded view).
const ZOOM = 2.5;
const ZOOM_SRC_WIDTH = 2000;

// Sentinel `active` value for the (optional) video slot — kept distinct from
// any image URL so image-only logic (zoom, lightbox) never fires for it.
const VIDEO_KEY = '__kk_video__';

interface Props {
  name: string;
  images: string[];
  imageUrl: string | null;
  sku: string;
  price: number;
  mrp?: number | null;
  category: string | null;
  /** Optional product video — when set, it's listed as the first gallery item
   *  (poster thumb with a play badge) and plays in the main viewer when picked.
   *  Undefined on the PDP, so that gallery is unchanged. */
  videoUrl?: string | null;
  videoPoster?: string | null;
}

export function ProductGallery({ name, images, imageUrl, sku, price, mrp, category, videoUrl, videoPoster }: Props) {
  const imgs = images.length ? images : imageUrl ? [imageUrl] : [];
  const hasVideo = !!videoUrl;
  // Default to the first image (keeps it the LCP element); the video is the
  // first thumbnail. Falls back to the video slot if there are no images.
  const [active, setActive] = useState<string | null>(imgs[0] ?? (hasVideo ? VIDEO_KEY : null));
  const [copied, setCopied] = useState(false);
  const saved = useIsInWishlist(sku);

  // Hover-zoom state. `origin` is the cursor position as a percentage of the
  // frame, fed straight to background-position so the point under the cursor
  // stays under the cursor as it magnifies.
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [lightbox, setLightbox] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  // Hover-zoom is pointer-precision only. Touch devices report `hover: none`
  // and would otherwise get a zoom layer stuck on after a tap — they get the
  // lightbox instead. Falls back to "no hover zoom" if matchMedia is missing.
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const box = frameRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;
    // Clamp: sub-pixel rounding at the very edge can push this past 0/100 and
    // reveal a sliver of empty background inside the frame.
    setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, []);

  // Switching thumbnails while a zoom is live would magnify the old position
  // against the new image — drop the zoom on every change of active image.
  const pick = useCallback((u: string) => {
    setActive(u);
    setZooming(false);
  }, []);

  const pickVideo = useCallback(() => {
    setActive(VIDEO_KEY);
    setZooming(false);
  }, []);

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const data = { title: name, text: `Check out ${name} on KitchenaryKart`, url };
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share(data);
        return;
      }
    } catch { /* user-cancelled share is not an error */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard may be blocked — quiet fail */ }
  }

  if (imgs.length === 0 && !hasVideo) {
    return (
      <div className="relative bg-white border border-line rounded-lg aspect-square grid place-items-center">
        <Overlay saved={saved} onSave={() => toggleWishlist({ sku, name, price, mrp, imageUrl, category })} onShare={share} copied={copied} />
        <span className="text-8xl font-head font-black text-brand opacity-80">{letter(name)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 md:grid md:grid-cols-[80px_1fr]">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:flex-col md:max-h-[560px] md:overflow-y-auto md:overflow-x-visible md:pb-0 md:pr-1">
        {hasVideo && (
          <button
            type="button"
            onClick={pickVideo}
            aria-label="Play product video"
            className={`relative w-16 h-16 md:w-[72px] md:h-[72px] bg-black border-2 rounded-md cursor-pointer transition overflow-hidden shrink-0 ${
              active === VIDEO_KEY ? 'border-brand' : 'border-line hover:border-gold'
            }`}
          >
            {videoPoster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={videoPoster}
                alt={`${name} — product video`}
                width={72}
                height={72}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <span className="absolute inset-0 bg-ink" />
            )}
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-white/90 text-brand shadow">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              </span>
            </span>
          </button>
        )}
        {imgs.map((u, i) => (
          <button
            key={u}
            type="button"
            onClick={() => pick(u)}
            className={`w-16 h-16 md:w-[72px] md:h-[72px] p-1 bg-white border-2 rounded-md cursor-pointer transition overflow-hidden shrink-0 ${
              active === u ? 'border-brand' : 'border-line hover:border-gold'
            }`}
          >
            {/* First thumb eager (it's the visible-active one on first
                paint), rest lazy. width/height tell the browser the
                intrinsic box so it can skip layout pass. */}
            <img
              src={imgSrc(u, 150)}
              alt={`${name} — view ${i + 1}`}
              width={72}
              height={72}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="w-full h-full object-contain"
            />
          </button>
        ))}
      </div>
      <div className="relative bg-white border border-line rounded-lg aspect-square overflow-hidden">
        {/* Sibling of the zoom frame (not a child), so its buttons never
            bubble into the open-lightbox handler; z-[2] keeps them above the
            zoom layer. */}
        <Overlay saved={saved} onSave={() => toggleWishlist({ sku, name, price, mrp, imageUrl, category })} onShare={share} copied={copied} />
        {active === VIDEO_KEY && videoUrl && (
          <div className="w-full h-full bg-black grid place-items-center">
            <video
              src={videoUrl}
              poster={videoPoster || undefined}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain bg-black"
            />
          </div>
        )}
        {active && active !== VIDEO_KEY && (
          <div
            ref={frameRef}
            role="button"
            tabIndex={0}
            aria-label={`Expand image of ${name}`}
            onMouseEnter={canHover ? () => setZooming(true) : undefined}
            onMouseLeave={canHover ? () => setZooming(false) : undefined}
            onMouseMove={canHover ? onMove : undefined}
            onClick={() => setLightbox(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setLightbox(true);
              }
            }}
            className="w-full h-full grid place-items-center cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {/* Main image is the LCP element on PDP. fetchpriority="high"
                tells the browser to download this BEFORE any below-the-fold
                image (similar products, etc.). The matching <link rel="preload">
                emitted from the page lets the browser start the request before
                the body parser even gets here. */}
            <img
              src={imgSrc(active)}
              alt={name}
              width={600}
              height={600}
              // eslint-disable-next-line @next/next/no-img-element
              // @ts-expect-error -- fetchpriority is valid HTML but TS DOM types lag
              fetchpriority="high"
              decoding="sync"
              className="w-full h-full object-contain"
            />
            {/* Zoom layer: a scaled <img> pulling a higher-res source, so the
                magnified pixels are real rather than an upscaled 600px blur.
                Deliberately NOT a background-image — `background-size: 250%
                250%` scales width and height independently and would squash a
                non-square product shot, whereas object-contain + transform
                keeps the same fit as the base image below it.
                pointer-events-none so mousemove keeps hitting the frame. */}
            {zooming && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc(active, ZOOM_SRC_WIDTH)}
                alt=""
                aria-hidden
                decoding="async"
                className="absolute inset-0 w-full h-full object-contain bg-white pointer-events-none"
                style={{
                  transform: `scale(${ZOOM})`,
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                }}
              />
            )}
            {/* Affordance — without it the zoom is undiscoverable. Hidden while
                zooming so it doesn't sit on top of the magnified view. */}
            {!zooming && (
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[2] flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1 text-[11px] font-semibold text-white pointer-events-none">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
                </svg>
                {canHover ? 'Hover to zoom · click to expand' : 'Tap to expand'}
              </span>
            )}
          </div>
        )}
      </div>

      {lightbox && active && active !== VIDEO_KEY && (
        <Lightbox
          name={name}
          imgs={imgs}
          active={active}
          onSelect={pick}
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  );
}

/**
 * Fullscreen image viewer. Serves both pointer and touch: on desktop click
 * toggles a 2x pan-zoom, on touch the image is left to the browser's native
 * pinch-zoom (`touch-action: pinch-zoom` on the scroll container).
 *
 * Escape closes, arrow keys step through images, and background scroll is
 * locked while open so the page behind doesn't move under the overlay.
 */
function Lightbox({
  name,
  imgs,
  active,
  onSelect,
  onClose,
}: {
  name: string;
  imgs: string[];
  active: string;
  onSelect: (u: string) => void;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const index = imgs.indexOf(active);

  const step = useCallback(
    (delta: number) => {
      if (imgs.length < 2) return;
      // Wrap around both ends so the arrows never dead-end.
      const next = (index + delta + imgs.length) % imgs.length;
      onSelect(imgs[next]);
      setZoomed(false);
    },
    [imgs, index, onSelect],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    // Restore the exact prior value rather than hardcoding '' — another
    // component (mobile nav drawer) may already be holding the lock.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, step]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} — image ${index + 1} of ${imgs.length}`}
      onClick={onClose}
      // z-250: above the sticky header (z-100) but below #toast (z-300), so a
      // wishlist toast fired from the overlay still surfaces.
      className="fixed inset-0 z-[250] bg-ink/90 flex flex-col kk-fade-in"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white shrink-0">
        <span className="text-sm font-semibold truncate">{name}</span>
        <div className="flex items-center gap-3 shrink-0">
          {imgs.length > 1 && (
            <span className="text-xs text-white/70 tabular-nums">
              {index + 1} / {imgs.length}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image viewer"
            className="w-9 h-9 rounded-full grid place-items-center bg-white/10 hover:bg-white/20 transition"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        // Clicks inside the image area shouldn't close — only the backdrop.
        onClick={(e) => e.stopPropagation()}
        className="flex-1 min-h-0 relative flex items-center justify-center px-2 md:px-14"
      >
        {imgs.length > 1 && (
          <>
            <NavArrow dir="prev" onClick={() => step(-1)} />
            <NavArrow dir="next" onClick={() => step(1)} />
          </>
        )}
        <div
          className="w-full h-full overflow-auto no-scrollbar grid place-items-center"
          style={{ touchAction: 'pinch-zoom' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc(active, ZOOM_SRC_WIDTH)}
            alt={name}
            onClick={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              setOrigin({
                x: ((e.clientX - box.left) / box.width) * 100,
                y: ((e.clientY - box.top) / box.height) * 100,
              });
              setZoomed((z) => !z);
            }}
            className={`max-w-full max-h-full object-contain transition-transform duration-200 ${
              zoomed ? 'cursor-zoom-out scale-[2]' : 'cursor-zoom-in'
            }`}
            style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
          />
        </div>
      </div>

      {imgs.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 justify-start md:justify-center"
        >
          {imgs.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                onSelect(u);
                setZoomed(false);
              }}
              aria-label={`View image ${i + 1}`}
              className={`w-14 h-14 shrink-0 p-1 rounded-md border-2 bg-white transition ${
                active === u ? 'border-brand' : 'border-white/25 hover:border-white/60'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc(u, 150)} alt="" loading="lazy" decoding="async" className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavArrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous image' : 'Next image'}
      className={`absolute top-1/2 -translate-y-1/2 z-[2] w-10 h-10 rounded-full grid place-items-center bg-white/10 hover:bg-white/25 text-white transition ${
        dir === 'prev' ? 'left-1 md:left-2' : 'right-1 md:right-2'
      }`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === 'prev' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
      </svg>
    </button>
  );
}

function Overlay({
  saved,
  onSave,
  onShare,
  copied,
}: {
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  copied: boolean;
}) {
  return (
    <div className="absolute top-3 right-3 z-[2] flex flex-col gap-2">
      <button
        type="button"
        onClick={onSave}
        aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={saved}
        title={saved ? 'Saved to wishlist' : 'Add to wishlist'}
        className={`w-10 h-10 rounded-full grid place-items-center bg-white shadow-sm border border-line transition hover:scale-105 ${
          saved ? 'text-brand' : 'text-ink hover:text-brand'
        }`}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={onShare}
          aria-label="Share"
          title="Share product"
          className="w-10 h-10 rounded-full grid place-items-center bg-white shadow-sm border border-line text-ink hover:text-brand transition hover:scale-105"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
        {copied && (
          <span className="absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap bg-ink text-white text-[11px] font-semibold px-2 py-1 rounded shadow">
            Link copied
          </span>
        )}
      </div>
    </div>
  );
}
