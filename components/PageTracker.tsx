'use client';

/**
 * Records every page a visitor sees and how long it was actually on screen
 * (visible time only — a tab left in the background does not count), plus
 * how far they scrolled and WhatsApp / call taps. See lib/track.ts.
 *
 * Each page view gets its own id (`pv`). "page_leave" is sent when the page
 * is hidden and again when the visitor moves on; the dashboard takes the
 * largest duration per pv, so coming back to a tab keeps adding time.
 */
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { flush, newId, track } from '@/lib/track';

export function PageTracker() {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? '';

  useEffect(() => {
    const path = pathname + (search ? `?${search}` : '');
    const pv = newId();
    let visibleSince: number | null = document.visibilityState === 'visible' ? Date.now() : null;
    let acc = 0;
    let maxScroll = 0;

    track('page_view', { path, d: { pv } });

    const onScroll = () => {
      const h = document.documentElement;
      const pct = Math.round(((window.scrollY + window.innerHeight) / Math.max(h.scrollHeight, 1)) * 100);
      if (pct > maxScroll) maxScroll = Math.min(100, pct);
    };
    const report = () => {
      const dur = acc + (visibleSince ? Date.now() - visibleSince : 0);
      track('page_leave', { path, dur, d: { pv, scroll: maxScroll } });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (visibleSince) {
          acc += Date.now() - visibleSince;
          visibleSince = null;
        }
        report();
        flush(true);
      } else {
        visibleSince = Date.now();
      }
    };
    const onPageHide = () => {
      report();
      flush(true);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      // Moving to another page inside the site.
      report();
    };
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('a,button') as HTMLElement | null;
      if (!el) return;
      const href = el.getAttribute('href') || '';
      if (/wa\.me|api\.whatsapp\.com|^whatsapp:/i.test(href)) {
        track('whatsapp_click', { d: { href: href.slice(0, 120) } });
      } else if (href.startsWith('tel:')) {
        track('call_click');
      }
      const named = el.getAttribute('data-track');
      if (named) track('click', { d: { name: named.slice(0, 60) } });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
