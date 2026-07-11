'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { PublicProduct } from '@/lib/products';
import type { PublicReel } from '@/lib/reels';

/**
 * Defer the Watch & Shop section — the heaviest client component on the home
 * page (~525 lines) and well below the fold. Loading + hydrating it up-front
 * added main-thread work that delayed LCP / interactivity. Here it:
 *   1. is code-split + `ssr: false`, so its JS never ships on the initial
 *      request and it's not in the SSR HTML, and
 *   2. only mounts once the user scrolls near it (IntersectionObserver, with a
 *      400 px pre-load margin so there's no visible pop-in).
 * A reserved min-height keeps the page from jumping (no CLS) before it mounts.
 */
const WatchAndShop = dynamic(
  () => import('./WatchAndShop').then((m) => ({ default: m.WatchAndShop })),
  { ssr: false },
);

interface Props {
  reels?: PublicReel[];
  products: PublicProduct[];
}

export function WatchAndShopLazy(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div ref={ref} style={show ? undefined : { minHeight: 480 }}>
      {show && <WatchAndShop {...props} />}
    </div>
  );
}
