'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { imgSrc } from '@/lib/format';

/**
 * Home-teaser media for the Featured Spotlight.
 *
 * The poster/product image fills the frame (object-cover). When the spotlight
 * has a video, a centered play button opens it in a modal popup with real
 * controls (autoplays, Esc / backdrop / ✕ to close). Clicking the image itself
 * still navigates to /featured/<slug>. The `<video>` only mounts once the popup
 * is opened, so no MP4 downloads until the visitor actually asks to watch —
 * keeps it off the Cloudinary bandwidth bill for non-watching visitors.
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
  const poster = img || videoPoster;

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

  return (
    <div className="relative bg-cream aspect-[4/3] md:aspect-auto md:min-h-[340px] overflow-hidden group">
      {/* Image fills the frame and links to the full featured page */}
      <Link href={href} className="absolute inset-0 block">
        {poster ? (
          <img
            src={imgSrc(poster, 900)}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted text-sm">
            Featured
          </span>
        )}
      </Link>

      {/* Play button — opens the video popup (sits above the image link) */}
      {videoUrl && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Play ${name} video`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] grid place-items-center w-16 h-16 rounded-full bg-black/55 text-white backdrop-blur-sm shadow-lg transition hover:bg-brand hover:scale-105"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden className="ml-0.5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
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
