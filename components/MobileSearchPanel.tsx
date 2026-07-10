'use client';

/**
 * Collapsible mobile search bar shown under the top header row. Hidden by
 * default; the search icon (MobileSearchToggle) flips it open/closed via the
 * `kk:toggle-search` window event. Collapses smoothly via max-height so the
 * header stays clean until the user actually wants to search.
 */
import { useEffect, useRef, useState } from 'react';
import { HeaderSearch } from './HeaderSearch';

export function MobileSearchPanel() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener('kk:toggle-search', toggle);
    return () => window.removeEventListener('kk:toggle-search', toggle);
  }, []);

  // Drop focus into the input as it opens so the keyboard comes up right away.
  useEffect(() => {
    if (open) wrapRef.current?.querySelector('input')?.focus();
  }, [open]);

  return (
    <div
      ref={wrapRef}
      // `overflow-hidden` is only needed while collapsing so the max-height
      // animation clips cleanly. Once open we switch to `overflow-visible` so
      // the autocomplete dropdown (absolutely positioned below the input, far
      // taller than this 5rem panel) can spill out over the page instead of
      // being cut off by the panel's box.
      className={`md:hidden transition-[max-height] duration-300 ease-out ${
        open ? 'max-h-20 overflow-visible' : 'max-h-0 overflow-hidden'
      }`}
    >
      <div className="px-4 pt-1 pb-3">
        <HeaderSearch mobile />
      </div>
    </div>
  );
}
