/**
 * Top chrome: hamburger · logo · search · action icons, then the primary nav
 * with the mega-menu hover panel. Hands category data to `PrimaryNav`.
 *
 * Client component so it can read the current route: the header (and nav) are
 * pinned (`sticky`) only on the product and shop pages; on every other page
 * they sit in normal flow and scroll away. `usePathname()` is correct during
 * SSR, so the initial paint already has the right positioning (no flash /
 * layout shift).
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { HeaderSearch } from './HeaderSearch';
import { PrimaryNav } from './PrimaryNav';
import { MobileNavToggle } from './MobileNavToggle';
import { MobileSearchToggle } from './MobileSearchToggle';
import { MobileSearchPanel } from './MobileSearchPanel';
import { HeaderActions } from './HeaderActions';
import type { CategoryTreeNode } from '@/lib/products';

interface Props {
  categoryTree: Record<string, CategoryTreeNode[]>;
  categoryCounts: Record<string, number>;
}

export function Header({ categoryTree, categoryCounts }: Props) {
  const pathname = usePathname();
  // Pages where the header + nav stay pinned on scroll. The shop listing
  // (/shop) and product detail (/product/…) are long, scroll-heavy pages
  // where keeping search + categories in reach matters; everywhere else the
  // header scrolls away with the content.
  const pinned =
    pathname === '/shop' ||
    pathname.startsWith('/shop/') ||
    pathname.startsWith('/product/');
  return (
    <>
      <header
        className={`${pinned ? 'sticky top-0' : 'relative'} z-[100] bg-white border-b border-line shadow-sm`}
      >
        <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] h-[72px] flex items-center gap-4 md:gap-6">
          {/* Logo — left on every breakpoint. The wordmark beside it is
              desktop-only: on mobile the row is already tight (logo · search
              icon · hamburger) and the extra text would squeeze it. */}
          <Link href="/" className="inline-flex items-center gap-2.5 shrink-0">
            <Image src="/logo-original.png" alt="KitchenaryKart" width={52} height={52} priority className="h-[52px] w-auto" />
            {/* `brand-dark` (#7A1212), not `brand` (#A01818) — the logo's own
                wordmark is a gradient whose dominant tone is ~#751717, so the
                lighter brand red reads as mismatched next to it. */}
            {/* aria-hidden: the logo's alt already names this link at every
                breakpoint, so the wordmark is decoration — without this,
                screen readers announce the brand twice on desktop. */}
            <span
              aria-hidden="true"
              className="hidden md:block font-head font-bold text-[19px] leading-tight tracking-tight text-brand-dark whitespace-nowrap"
            >
              Kitchenary Kart
            </span>
          </Link>
          {/* Desktop search sits in the middle column; `justify-center` centres
              the box (capped at max-w-[49%]) within it. On mobile the box is
              hidden, but this wrapper's flex-grow still pushes the mobile
              controls to the right. */}
          <div className="flex-1 min-w-0 flex justify-center">
            <HeaderSearch />
          </div>
          {/* Right-hand icons kept in one group with a single shared gap so
              wishlist · cart · search · hamburger sit at equal distances
              (instead of two groups split by the header's wider gap). */}
          <div className="flex items-center gap-1">
            {/* Desktop icon rail: account · wishlist · cart */}
            <HeaderActions />
            {/* Mobile-only: search icon + hamburger */}
            <div className="flex items-center gap-1 md:hidden">
              <MobileSearchToggle />
              <MobileNavToggle />
            </div>
          </div>
        </div>
        {/* Collapsible mobile search, toggled by the search icon */}
        <MobileSearchPanel />
      </header>

      <PrimaryNav tree={categoryTree} counts={categoryCounts} sticky={pinned} />
    </>
  );
}
