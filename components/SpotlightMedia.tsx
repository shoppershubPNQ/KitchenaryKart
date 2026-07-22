'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { imgSrc } from '@/lib/format';

/**
 * Home-teaser media for the Featured Spotlight — a small swipe carousel.
 *
 *   Slide 1: the product image, which links to /featured/<slug>.
 *   Slide 2 (only when the spotlight has a video): the video poster with a
 *           centered play button that opens the clip in a modal popup with
 *           real controls (autoplays, Esc / backdrop / ✕ to close).
 *
 * Swipe on touch, arrows/dots on desktop. The `<video>` only mounts once the
 * popup is opened, so no MP4 downloads until the visitor actually asks to
 * watch — keeps it off the Cloudinary bandwidth bill for non-watching visitors.
 */
export function SpotlightMedia({
  href,
  name,
  img,
  videoUrl,
  videoPoster,
}: {
  href: string;
  name: string;
  img: string | null;
  videoUrl: string | null;
  videoPoster: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const poster = img || videoPoster; // slide 1 (product image)
  const videoThumb = videoPoster || img; // slide 2 (video poster)
  const hasVideo = !!videoUrl;
  const slideCount = hasVideo ? 2 : 1;

  // While the popup is open: close on Esc and lock background scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function goTo(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(slideCount - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <div className="relative bg-cream aspect-[4/3] md:aspect-auto md:min-h-[340px] overflow-hidden group">
      {/* Swipe track */}
      <div
        ref={scrollRef}
        onScroll={(e) =>
          setIdx(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))
        }
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Slide 1 — product image, links to the full featured page */}
        <Link href={href} className="snap-center shrink-0 w-full h-full block">
          {poster ? (
            <img
              src={imgSrc(poster, 900)}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="w-full h-full grid place-items-center text-muted text-sm">Featured</span>
          )}
        </Link>

        {/* Slide 2 — video poster with a play button; opens the popup */}
        {hasVideo && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Play ${name} video`}
            className="relative snap-center shrink-0 w-full h-full block"
          >
            {videoThumb ? (
              <img
                src={imgSrc(videoThumb, 900)}
                alt={`${name} — video`}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="absolute inset-0 bg-ink" />
            )}
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid place-items-center w-16 h-16 rounded-full bg-black/55 text-white backdrop-blur-sm shadow-lg transition group-hover:bg-brand group-hover:scale-105">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden className="ml-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>

      {/* Prev / next arrows — desktop only, hidden at the ends */}
      {hasVideo && (
        <>
          <button
            type="button"
            onClick={() => goTo(idx - 1)}
            aria-label="Previous"
            disabled={idx === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-[2] hidden md:grid w-9 h-9 rounded-full bg-white/85 shadow place-items-center text-ink text-xl hover:bg-white disabled:opacity-0 transition"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(idx + 1)}
            aria-label="Next"
            disabled={idx === slideCount - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-[2] hidden md:grid w-9 h-9 rounded-full bg-white/85 shadow place-items-center text-ink text-xl hover:bg-white disabled:opacity-0 transition"
          >
            ›
          </button>
        </>
      )}

      {/* Dots — tappable, also reflect the swipe position */}
      {hasVideo && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-[2]">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-200 ${
                i === idx ? 'w-5 bg-brand' : 'w-2 bg-ink/30 hover:bg-ink/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Video popup / lightbox */}
      {open && videoUrl && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${name} video`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close video"
            className="absolute top-4 right-4 w-11 h-11 grid place-items-center rounded-full bg-white/10 text-white text-2xl leading-none hover:bg-white/20 transition"
          >
            ✕
          </button>
          <video
            src={videoUrl}
            poster={videoPoster || undefined}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            className="max-w-[min(92vw,880px)] max-h-[85vh] w-auto rounded-lg bg-black shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
