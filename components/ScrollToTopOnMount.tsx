'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Forces the window to scroll to the top whenever the parent route
 * (the PDP) mounts or its pathname changes.
 *
 * Why this is needed: Next.js App Router relies on the browser's
 * automatic scroll restoration. When a buyer navigates from a long
 * shop page (scrolled deep) into a shorter PDP, the browser sometimes
 * restores the prior scroll offset on the new route — landing the
 * buyer near the PDP footer instead of the product gallery.
 *
 * `usePathname` is included in the deps so client-side navigations
 * BETWEEN PDPs (e.g. clicking a Similar Product card from inside
 * another PDP) also reset scroll. A `useEffect([])` alone would only
 * fire on the very first mount.
 *
 * `behavior: 'instant'` (not 'smooth') so the buyer never sees the
 * page animate from bottom to top — it just renders at the top.
 */
export function ScrollToTopOnMount() {
  const pathname = usePathname();
  useEffect(() => {
    // Cast: ScrollBehavior in some TS dom-lib versions doesn't include
    // 'instant' even though all modern browsers support it.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}
