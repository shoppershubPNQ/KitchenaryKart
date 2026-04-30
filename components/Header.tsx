/**
 * Top chrome: hamburger · logo · search · action icons, then the primary nav
 * with the mega-menu hover panel. Server component that hands category data
 * to the client `PrimaryNav`.
 */
import Link from 'next/link';
import { HeaderSearch } from './HeaderSearch';
import { PrimaryNav } from './PrimaryNav';
import { MobileNavToggle } from './MobileNavToggle';
import { HeaderActions } from './HeaderActions';
import type { CategoryTreeNode } from '@/lib/products';

interface Props {
  categoryTree: Record<string, CategoryTreeNode[]>;
  categoryCounts: Record<string, number>;
}

export function Header({ categoryTree, categoryCounts }: Props) {
  return (
    <>
      <header className="sticky top-0 z-[100] bg-white border-b border-line shadow-sm">
        <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] h-[72px] flex items-center gap-4 md:gap-6">
          <MobileNavToggle />
          <Link href="/" className="inline-flex items-center shrink-0">
            <img src="/logo.png" alt="KitchenaryKart" className="h-[52px] w-auto" />
          </Link>
          <div className="flex-1 min-w-0">
            <HeaderSearch />
          </div>
          <HeaderActions />
        </div>
        <div className="md:hidden px-4 pb-3">
          <HeaderSearch mobile />
        </div>
      </header>

      <PrimaryNav tree={categoryTree} counts={categoryCounts} />
    </>
  );
}
