'use client';

/**
 * Left-side slide-in navigation drawer. Opens on hamburger click (listens for
 * the `kk:open-slide-nav` window event). Shows:
 *   - Close button + logo at the top
 *   - Quick-search input
 *   - Account / Shop / Home / Contact links
 *   - Category list where each main category expands in place to show its
 *     subcategories (each sub links into /shop with the right filter)
 *
 * Mounted once from the root layout so it's available on every page.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CATEGORY_ORDER, catLabel } from '@/lib/categories';
import type { CategoryTreeNode } from '@/lib/products';

interface Props {
  tree: Record<string, CategoryTreeNode[]>;
}

export function SlideNav({ tree }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [q, setQ] = useState('');

  // Listen for the hamburger toggle event.
  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('kk:open-slide-nav', openHandler);
    return () => window.removeEventListener('kk:open-slide-nav', openHandler);
  }, []);

  // Close with Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Lock page scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close automatically when the user navigates to a new page.
  useEffect(() => {
    setOpen(false);
    setExpanded(null);
  }, [pathname]);

  const submitSearch = () => {
    const url = q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop';
    router.push(url);
  };

  const cats = [
    ...CATEGORY_ORDER.filter((c) => tree[c]),
    ...Object.keys(tree).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/45 z-[200] transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide panel */}
      <aside
        role="dialog"
        aria-label="Navigation"
        className={`fixed top-0 left-0 h-screen w-[320px] max-w-[85%] bg-white shadow-2xl z-[201] flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(.22,.61,.36,1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[72px] border-b border-line bg-white">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="inline-flex items-center"
            aria-label="KitchenaryKart home"
          >
            <img src="/logo.png" alt="KitchenaryKart" className="h-10 w-auto" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="w-9 h-9 rounded-full grid place-items-center text-2xl text-muted hover:bg-bg-soft hover:text-ink"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-line">
          <div className="relative">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              placeholder="Search products"
              className="w-full h-10 pl-4 pr-10 border border-line rounded-full text-[14px] bg-bg-soft text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              aria-label="Search"
              onClick={submitSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full grid place-items-center text-muted hover:text-brand"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable link list */}
        <div className="flex-1 overflow-y-auto">
          {/* Top-level links */}
          <nav className="px-2 py-2 border-b border-line">
            <DrawerLink href="/" label="Home" onClick={() => setOpen(false)} />
            <DrawerLink href="/shop" label="Shop All" onClick={() => setOpen(false)} />
            <DrawerLink href="/account" label="My Account" onClick={() => setOpen(false)} />
            <DrawerLink href="/contact" label="Contact" onClick={() => setOpen(false)} />
          </nav>

          {/* Category section */}
          <div className="px-4 pt-4 pb-2 text-[11px] font-head font-bold tracking-[1.5px] uppercase text-muted">
            Shop by category
          </div>
          <nav className="px-2 pb-4">
            {cats.map((c) => {
              const subs = tree[c] ?? [];
              const isOpen = expanded === c;
              return (
                <div key={c} className="mb-0.5">
                  <div className="flex items-stretch">
                    <Link
                      href={`/shop?cat=${encodeURIComponent(c)}`}
                      onClick={() => setOpen(false)}
                      className="flex-1 px-3 py-2.5 rounded-l text-[14px] font-head font-semibold text-ink hover:bg-bg-soft hover:text-brand transition"
                    >
                      {catLabel(c)}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => (prev === c ? null : c))}
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                      aria-expanded={isOpen}
                      className="w-10 grid place-items-center rounded-r text-muted hover:bg-bg-soft hover:text-brand transition"
                    >
                      <svg
                        viewBox="0 0 10 6"
                        className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                      >
                        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded subcategory list (collapses smoothly via max-height) */}
                  <div
                    className="overflow-hidden transition-[max-height] duration-300 ease-out"
                    style={{ maxHeight: isOpen ? subs.length * 40 + 8 : 0 }}
                  >
                    <div className="pl-5 py-1">
                      {subs.length === 0 && (
                        <div className="text-xs text-muted px-3 py-2">No subcategories.</div>
                      )}
                      {subs.map((s) => (
                        <Link
                          key={s.subName}
                          href={`/shop?cat=${encodeURIComponent(c)}&sub=${encodeURIComponent(s.subName)}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between px-3 py-2 text-[13px] text-ink-soft hover:text-brand transition"
                        >
                          <span className="truncate">{s.subName}</span>
                          <span className="text-[11px] text-muted ml-2 shrink-0">{s.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

      </aside>
    </>
  );
}

function DrawerLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-3 py-2.5 rounded text-[14px] font-head font-semibold text-ink hover:bg-bg-soft hover:text-brand transition"
    >
      {label}
    </Link>
  );
}
