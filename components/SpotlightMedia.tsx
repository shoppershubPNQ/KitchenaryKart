'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { imgSrc } from '@/lib/format';

/**
 * Home-teaser media for the Featured Spotlight.
 *
 * Shows the poster/product image and, when the spotlight has a video, plays it
 * inline on hover (muted + looping, like the Watch & Shop reels) then pauses +
 * resets on leave. The whole block links to /featured/<slug>; on touch (no
 * hover) it stays a still image and the tap navigates to the full page where
 * the video has real controls. `preload="none"` so no MP4 downloads until the
 * first hover — keeps it off the Cloudinary bandwidth bill for non-hovering
 * visitors.
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
  const vidRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const poster = img || videoPoster;

  function play() {
    const v = vidRef.current;
    if (!v) return;
    v.play().then(() => setPlaying(true)).catch(() => {});
  }
  function stop() {
    const v = vidRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setPlaying(false);
  }

  return (
    <Link
      href={href}
      onMouseEnter={videoUrl ? play : undefined}
      onMouseLeave={videoUrl ? stop : undefined}
      className="relative block bg-cream aspect-[4/3] md:aspect-auto md:min-h-[340px] grid place-items-center overflow-hidden group"
    >
      {poster ? (
        <img
          src={imgSrc(poster, 900)}
          alt={name}
          className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="text-muted text-sm">Featured</span>
      )}

      {videoUrl && (
        <video
          ref={vidRef}
          src={videoUrl}
          poster={videoPoster || undefined}
          muted
          loop
          playsInline
          preload="none"
          className={`absolute inset-0 w-full h-full object-contain bg-cream transition-opacity duration-300 ${
            playing ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {videoUrl && (
        <span
          className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity duration-300 ${
            playing ? 'opacity-0' : 'opacity-100'
          }`}
        >
          ▶ Hover to play
        </span>
      )}
    </Link>
  );
}
