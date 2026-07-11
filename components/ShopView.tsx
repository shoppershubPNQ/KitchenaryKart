'use client';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductCard } from './ProductCard';
import { CATEGORY_SHORT, catLabel } from '@/lib/categories';
import { rankItems } from '@/lib/search';
import type { PublicProduct } from '@/lib/products';

const PAGE_SIZE = 24;

interface Props {
  products: PublicProduct[];
  categoryCounts: Record<string, number>;
  collectionLabel?: string | null;
  collectionSlug?: string | null;
}

export function ShopView({
  products,
  categoryCounts,
  collectionLabel = null,
  collectionSlug = null,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [cat, setCat] = useState<string>(params.get('cat') ?? '');
  const [sub, setSub] = useState<string>(params.get('sub') ?? '');
  const [q, setQ] = useState<string>(params.get('q') ?? '');
  const [sort, setSort] = useState<string>('featured');
  const [page, setPage] = useState<number>(1);
  // Additional refinements. Unlike cat/sub/q these are NOT mirrored to the URL
  // — they're on-page refinements the buyer applies after landing, so keeping
  // them out of the URL avoids bloating shareable links and complicating the
  // URL⇄state sync below. Cleared alongside everything by "Clear all".
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [bestOnly, setBestOnly] = useState<boolean>(false);
  const [newOnly, setNewOnly] = useState<boolean>(false);
  // Mobile-only: filter panel collapsed by default so products grid is the
  // first thing the buyer sees, especially after typing a search query.
  // Desktop ignores this — the aside is always visible at md+ breakpoints.
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Lock body scroll while the mobile filter popup is open.
  useEffect(() => {
    if (!mobileFilterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileFilterOpen]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (collectionSlug) sp.set('collection', collectionSlug);
    if (cat) sp.set('cat', cat);
    if (sub) sp.set('sub', sub);
    if (q) sp.set('q', q);
    const qs = sp.toString();
    router.replace(qs ? `/shop?${qs}` : '/shop', { scroll: false });
  }, [cat, sub, q, router, collectionSlug]);

  // Sync filter state FROM the URL when it changes. Without this, a new search
  // from the header (which navigates /shop?q=A → /shop?q=B on the SAME route,
  // so this component never remounts) updated the URL but left cat/sub/q at
  // their mount-time values — the grid kept showing the OLD query's results.
  // Guarded (no-op when unchanged) so it never ping-pongs with the state→URL
  // effect above. Depends on the serialized string so it only fires on a real
  // param change, not every render.
  const search = params.toString();
  useEffect(() => {
    const uq = params.get('q') ?? '';
    const ucat = params.get('cat') ?? '';
    const usub = params.get('sub') ?? '';
    setQ((cur) => (cur === uq ? cur : uq));
    setCat((cur) => (cur === ucat ? cur : ucat));
    setSub((cur) => (cur === usub ? cur : usub));
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;
    let list = products.slice();
    if (cat) list = list.filter((p) => p.category === cat);
    if (sub) list = list.filter((p) => p.subcategory === sub);
    if (min !== null && !Number.isNaN(min)) list = list.filter((p) => p.price >= min);
    if (max !== null && !Number.isNaN(max)) list = list.filter((p) => p.price <= max);
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    if (bestOnly) list = list.filter((p) => p.isBestseller);
    if (newOnly) list = list.filter((p) => p.isNewArrival);
    if (needle) {
      // Smart, typo-tolerant ranking (shared with the header autocomplete).
      // Exact/prefix/substring matches rank first — so a correctly spelled
      // query shows the most accurate result on top — while misspellings
      // ("kettel") still surface similar products ("kettle"). Non-matches are
      // dropped. `rankItems` returns a fresh array, so the sort below is safe.
      list = rankItems(list, needle);
    }
    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      // 'featured' + an active search keeps rankItems' relevance order.
    }
    return list;
  }, [products, cat, sub, q, sort, minPrice, maxPrice, inStockOnly, bestOnly, newOnly]);

  const shown = filtered.slice(0, page * PAGE_SIZE);
  const catEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  const anyRefinement =
    !!sub || !!minPrice || !!maxPrice || inStockOnly || bestOnly || newOnly;

  const clearRefinements = () => {
    setSub('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setBestOnly(false);
    setNewOnly(false);
    setPage(1);
  };
  // Mobile popup owns the category too, so its "clear all" resets it as well.
  const clearAllMobile = () => {
    setCat('');
    clearRefinements();
  };
  // Count of active filters — drives the badge on the mobile Filters button.
  // Category counts too, since on mobile it now lives inside the popup.
  const activeFilterCount =
    (cat ? 1 : 0) +
    (sub ? 1 : 0) +
    (minPrice.trim() ? 1 : 0) +
    (maxPrice.trim() ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (bestOnly ? 1 : 0) +
    (newOnly ? 1 : 0);
  const total = products.length;
  const crumbCurrent = collectionLabel
    ? `${collectionLabel}${cat ? ' · ' + catLabel(cat) : ''}${sub ? ' · ' + sub : ''}`
    : cat
      ? `${catLabel(cat)}${sub ? ' · ' + sub : ''}`
      : 'Shop';

  // Shared filter UI — rendered once on desktop (sticky sidebar) and again
  // inside the mobile collapsible panel. Keeps both surfaces in sync.
  const filterContent = (
    <div>
      <h4 className="text-[11.5px] font-bold tracking-[1.5px] uppercase text-ink mb-3">
        Category
      </h4>
      <button
        type="button"
        className={`filter-item ${cat === '' ? 'is-active' : ''}`}
        onClick={() => {
          setCat('');
          setSub('');
          setPage(1);
        }}
      >
        <span>All categories</span>
        <span className="filter-count">{total}</span>
      </button>
      {catEntries.map(([c, n]) => (
        <button
          key={c}
          type="button"
          className={`filter-item ${cat === c ? 'is-active' : ''}`}
          onClick={() => {
            setCat(c);
            setSub('');
            setPage(1);
          }}
        >
          <span>{CATEGORY_SHORT[c] ?? c}</span>
          <span className="filter-count">{n}</span>
        </button>
      ))}

      {/* Sort — mobile only. On desktop the sort control lives in the toolbar,
          so this is hidden there to avoid a duplicate. */}
      <div className="mt-5 md:hidden">
        <h4 className="text-[11.5px] font-bold tracking-[1.5px] uppercase text-ink mb-3">
          Sort
        </h4>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-full px-2.5 py-2 border border-line rounded-md text-sm bg-white outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* Price range (₹). Empty inputs = unbounded on that side. */}
      <div className="mt-5">
        <h4 className="text-[11.5px] font-bold tracking-[1.5px] uppercase text-ink mb-3">
          Price (₹)
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-1.5 border border-line rounded-md text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <span className="text-muted text-sm">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-1.5 border border-line rounded-md text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Availability + highlights — simple boolean refinements. */}
      <div className="mt-5">
        <h4 className="text-[11.5px] font-bold tracking-[1.5px] uppercase text-ink mb-3">
          Refine
        </h4>
        <label className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked);
              setPage(1);
            }}
            className="accent-brand w-4 h-4"
          />
          In stock only
        </label>
        <label className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={bestOnly}
            onChange={(e) => {
              setBestOnly(e.target.checked);
              setPage(1);
            }}
            className="accent-brand w-4 h-4"
          />
          Bestsellers
        </label>
        <label className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={newOnly}
            onChange={(e) => {
              setNewOnly(e.target.checked);
              setPage(1);
            }}
            className="accent-brand w-4 h-4"
          />
          New arrivals
        </label>
      </div>

      {anyRefinement && (
        <button
          type="button"
          onClick={clearRefinements}
          className="mt-4 text-sm font-medium text-brand hover:text-brand-dark underline underline-offset-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <nav className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-4 text-xs text-muted flex items-center gap-2 flex-wrap">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="opacity-60">/</span>
        <span className="text-ink font-medium">{crumbCurrent}</span>
      </nav>
      <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] pb-14 grid gap-8 md:grid-cols-[240px_1fr] grid-cols-1">
        {/* Desktop sidebar — hidden on mobile so the products grid is the
            first thing the buyer sees. */}
        <aside className="hidden md:block md:sticky md:top-[132px] md:self-start md:max-h-[calc(100vh-140px)] md:overflow-y-auto pr-1">
          {filterContent}
        </aside>
        <main>
          {/* Semantic H1 for SEO + a11y — the shop/catalog page had none.
              Reflects the active category scope; visually hidden. */}
          <h1 className="sr-only">
            {cat
              ? `${CATEGORY_SHORT[cat] ?? cat} — Commercial Kitchen Equipment`
              : 'Shop Commercial Kitchen Equipment'}
          </h1>
          {collectionLabel && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold tracking-[2px] uppercase text-brand">
                Showing
              </span>
              <span className="inline-flex items-center gap-2 bg-brand/10 text-brand px-3 py-1 rounded-full text-sm font-medium">
                {collectionLabel}
                <Link
                  href="/shop"
                  className="text-brand hover:text-brand-dark"
                  aria-label="Clear collection filter"
                  title="Show all products"
                >
                  ×
                </Link>
              </span>
            </div>
          )}

          <div className="pb-5 border-b border-line mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="search"
                placeholder="Search by name or SKU…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 border border-line rounded-md text-sm flex-1 min-w-0 md:min-w-[260px] md:flex-none focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
              {/* Mobile-only Filters button — opens the popup that holds every
                  filter (category, price, refine, sort). The badge shows how
                  many are active at a glance. */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={mobileFilterOpen}
                className="md:hidden shrink-0 inline-flex items-center gap-2 px-4 py-2.5 border border-line rounded-md bg-white text-sm font-medium text-ink hover:border-brand"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M3 6h18M6 12h12M10 18h4" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-bold leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {/* Count + sort grouped on the right (count bold) — desktop only.
                  On mobile these live in the count row below + the popup. */}
              <div className="hidden md:flex items-center gap-4 shrink-0 ml-auto">
                <div className="text-sm font-bold text-ink whitespace-nowrap">
                  {filtered.length.toLocaleString('en-IN')} products
                </div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="px-3.5 py-2 border border-line rounded-md text-sm bg-white"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
            </div>
            {/* Mobile-only product count row. */}
            <div className="md:hidden mt-3 text-sm font-bold text-ink">
              {filtered.length.toLocaleString('en-IN')} products
            </div>
          </div>

          {/* Mobile filter popup — bottom sheet holding all filters. */}
          {mobileFilterOpen && (
            <div
              className="md:hidden fixed inset-0 z-50 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
            >
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileFilterOpen(false)}
              />
              <div className="relative mt-auto w-full bg-white rounded-t-2xl max-h-[88vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                  <h3 className="font-head font-bold text-ink text-base">Filters</h3>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    aria-label="Close filters"
                    className="p-1 -mr-1 text-muted hover:text-ink"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto px-4 py-4 flex-1">
                  {filterContent}
                </div>
                <div className="flex items-center gap-3 px-4 py-3 border-t border-line">
                  <button
                    type="button"
                    onClick={clearAllMobile}
                    className="px-4 py-2.5 text-sm font-medium text-ink border border-line rounded-md hover:border-brand"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-brand rounded-md hover:bg-brand-dark"
                  >
                    Show {filtered.length.toLocaleString('en-IN')} results
                  </button>
                </div>
              </div>
            </div>
          )}
          {shown.length === 0 ? (
            <div className="py-16 text-center text-muted">
              <h3 className="text-ink mb-2 font-head font-bold">No products match</h3>
              <p>Try a different category or search term.</p>
            </div>
          ) : (
            <>
              <style jsx>{`
                .kk-shop-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                  gap: 0.75rem;
                }
                @media (min-width: 768px) {
                  .kk-shop-grid {
                    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
                    gap: 1rem;
                  }
                }
              `}</style>
              <div className="kk-shop-grid grid">
                {shown.map((p) => (
                  <ProductCard key={p.sku} product={p} />
                ))}
              </div>
            </>
          )}
          {shown.length < filtered.length && (
            <div className="text-center mt-9">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="px-8 py-3 font-head text-xs font-bold tracking-wider uppercase text-ink bg-white border-2 border-ink rounded-md hover:bg-ink hover:text-white transition"
              >
                Load more
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
