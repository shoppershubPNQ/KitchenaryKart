'use client';

/**
 * Primary category nav + mega-menu panel. Displays categories in a fixed stable
 * order (from `CATEGORY_ORDER`) and renders a dropdown on hover with the
 * Prestige-style layout: left image panel, subcategory grid, view-all footer.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CATEGORY_ORDER, CATEGORY_SHORT, catLabel } from '@/lib/categories';
import { imgSrc, letter } from '@/lib/format';
import type { CategoryTreeNode } from '@/lib/products';

interface Props {
  tree: Record<string, CategoryTreeNode[]>;
  counts: Record<string, number>;
  /** When true the nav bar stays pinned on scroll (product pages only);
   *  otherwise it sits in normal flow and scrolls away with the header. */
  sticky?: boolean;
}

export function PrimaryNav({ tree, counts, sticky = false }: Props) {
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<any>(null);
  const openTimer = useRef<any>(null);

  useEffect(() => {
    const h = () => setMobileOpen((m) => !m);
    window.addEventListener('kk:toggle-mobile-nav', h);
    return () => window.removeEventListener('kk:toggle-mobile-nav', h);
  }, []);

  // Don't leave a queued open/close running after the nav unmounts.
  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  /** Hover intent: the panel only opens after the cursor rests on a category
   *  briefly, so sweeping across the nav on the way to something else never
   *  flashes a mega-menu — but the delay is short enough to feel responsive on
   *  a deliberate hover. Once a panel is already open, moving to a sibling
   *  category switches immediately — the menu is committed by then and
   *  re-waiting would feel broken. */
  function enter(cat: string) {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    if (openCat) {
      setOpenCat(cat);
      return;
    }
    openTimer.current = setTimeout(() => setOpenCat(cat), 250);
  }
  function leave() {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenCat(null), 120);
  }
  function cancelClose() {
    clearTimeout(closeTimer.current);
  }

  const cats = CATEGORY_ORDER.filter((c) => counts[c]);

  return (
    <nav
      className={`${sticky ? 'sticky top-[72px]' : 'relative'} z-[95] bg-white border-b border-line ${mobileOpen ? 'block' : 'hidden md:block'}`}
    >
      {/* Fixed-height row with the category buttons. `relative` so the mega can
          position itself below this row and move with the sticky nav. */}
      <div className="relative" style={{ height: 'var(--nav-h)' }}>
        <div
          className="max-w-site mx-auto h-full flex items-stretch justify-between gap-0 px-[6mm] md:px-[1.5cm] overflow-x-auto no-scrollbar"
          onMouseLeave={leave}
        >
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              className={`nav-item ${openCat === c ? 'is-open' : ''}`}
              onMouseEnter={() => enter(c)}
              onClick={() => {
                // A click is an explicit request — skip the hover delay, and
                // drop any queued open so it can't re-open what we just closed.
                clearTimeout(openTimer.current);
                setOpenCat((curr) => (curr === c ? null : c));
              }}
            >
              <span>{catLabel(c)}</span>
              {openCat === c && (
                <svg viewBox="0 0 10 6" className="w-2.5 h-2.5 ml-1.5 rotate-180" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {openCat && (
          <MegaPanel
            cat={openCat}
            subs={tree[openCat] ?? []}
            onEnter={cancelClose}
            onLeave={leave}
            onClose={() => setOpenCat(null)}
          />
        )}
      </div>
    </nav>
  );
}

function MegaPanel({
  cat,
  subs,
  onEnter,
  onLeave,
  onClose,
}: {
  cat: string;
  subs: CategoryTreeNode[];
  onEnter: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  const INITIAL = 15;
  const [showAll, setShowAll] = useState(false);
  // Reset the expand-state whenever the category changes.
  useEffect(() => {
    setShowAll(false);
  }, [cat]);

  const subCount = subs.length;
  const totalSkus = subs.reduce((acc, s) => acc + s.count, 0);
  const catLbl = (CATEGORY_SHORT[cat] ?? cat).toUpperCase();
  const rep = subs.find((s) => s.thumb);

  const visibleSubs = showAll ? subs : subs.slice(0, INITIAL);
  const overflow = subs.length - INITIAL;

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="absolute left-0 right-0 top-full border-t-2 border-t-brand border-b border-line shadow-2xl z-[94] backdrop-blur-xl"
      style={{
        maxHeight: 'calc(100vh - var(--header-h) - var(--nav-h))',
        // Frosted panel: mostly-opaque white so links stay crisp, with a
        // strong blur so the little bit of page content showing through reads
        // as texture, not clutter. Theme borders (below) give it structure.
        backgroundColor: 'rgba(255,255,255,0.9)',
      }}
    >
      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Left visual — hidden on narrow screens so the subcategory grid has room to breathe */}
        <div className="hidden lg:flex border-r border-brand/20 p-4 flex-col gap-3">
          <div className="relative aspect-square bg-bg-soft rounded-lg overflow-hidden grid place-items-center border border-brand/20">
            {rep?.thumb ? (
              <img src={imgSrc(rep.thumb)} alt={catLbl} className="w-[96%] h-[96%] object-contain" />
            ) : (
              <span className="text-7xl font-head font-black text-brand opacity-40">{letter(cat)}</span>
            )}
          </div>
          <Link
            href={`/shop?cat=${encodeURIComponent(cat)}`}
            className="self-center inline-flex items-center gap-2.5 px-6 py-2.5 bg-ink text-white font-head text-[13px] font-bold tracking-wider rounded-full hover:bg-brand hover:-translate-y-0.5 transition"
            onClick={onClose}
          >
            Shop All <span>→</span>
          </Link>
        </div>

        {/* Right subs */}
        <div
          className="p-7 flex flex-col min-h-[360px]"
          style={{ maxHeight: 'calc(100vh - var(--header-h) - var(--nav-h))' }}
        >
          {/* Let long labels wrap instead of clipping. */}
          <div className="flex justify-between items-baseline pb-4 border-b border-brand/25 gap-4">
            <div className="font-head text-[13px] font-bold tracking-widest uppercase text-muted break-words min-w-0">
              Browse {catLbl}
            </div>
            <div className="text-[13px] text-muted whitespace-nowrap shrink-0">{subCount} categories</div>
          </div>

          {/* Show the first 15 subcategories by default; clicking "+N more"
              expands the list in place with the rest. */}
          <div
            className={`flex-1 py-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 content-start ${showAll ? 'overflow-y-auto' : ''}`}
          >
            {subs.length === 0 && <div className="col-span-full text-sm text-muted py-4">No subcategories yet.</div>}
            {visibleSubs.map((s) => (
              <Link
                key={s.subName}
                href={`/shop?cat=${encodeURIComponent(cat)}&sub=${encodeURIComponent(s.subName)}`}
                className="mega-sub"
                onClick={onClose}
              >
                <span>{s.subName}</span>
                <span className="chev">›</span>
              </Link>
            ))}
            {!showAll && overflow > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mega-sub text-brand"
              >
                <span>+{overflow} more</span>
                <span className="chev" style={{ opacity: 1 }}>›</span>
              </button>
            )}
            {showAll && overflow > 0 && (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="mega-sub text-muted"
              >
                <span>Show less</span>
                <span className="chev" style={{ opacity: 1, transform: 'rotate(180deg)' }}>›</span>
              </button>
            )}
          </div>

          <div className="flex justify-between items-center py-3 border-t border-brand/25 mt-auto gap-4">
            <div className="text-xs text-muted min-w-0 break-words">
              {subCount} subcategories in{' '}
              <strong className="text-ink font-bold uppercase tracking-wider">{catLbl}</strong> · {totalSkus} Products
            </div>
            <Link
              href={`/shop?cat=${encodeURIComponent(cat)}`}
              className="inline-flex items-center gap-1.5 text-brand font-head text-[13px] font-bold uppercase tracking-wider hover:text-brand-dark whitespace-nowrap shrink-0"
              onClick={onClose}
            >
              View all Products →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
