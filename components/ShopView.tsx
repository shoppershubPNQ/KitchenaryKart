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
          setMobileFilterOpen(false);
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
            setMobileFilterOpen(false);
          }}
        >
          <span>{CATEGORY_SHORT[c] ?? c}</span>
          <span className="filter-count">{n}</span>
        </button>
      ))}

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

  // Label for the mobile filter toggle button — gives buyer at-a-glance
  // context for what category they're currently inside.
  const activeCatLabel = cat ? CATEGORY_SHORT[cat] ?? cat : 'All categories';

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

          {/* Mobile-only filter toggle. Sits ABOVE the search row so the
              entire grid feels close to the top of the viewport. Counts
              are useful at-a-glance even when collapsed. */}
          <div className="md:hidden mb-3">
            <button
              type="button"
              onClick={() => setMobileFilterOpen((v) => !v)}
              aria-expanded={mobileFilterOpen}
              aria-controls="kk-mobile-filter-panel"
              className="w-full flex items-center justify-between px-3.5 py-2.5 border border-line rounded-md bg-white text-sm font-medium text-ink hover:border-brand"
            >
              <span className="flex items-center gap-2">
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
                Filter: <span className="text-muted font-normal">{activeCatLabel}</span>
              </span>
              <span
                className={`text-muted transition-transform ${mobileFilterOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
            {mobileFilterOpen && (
              <div
                id="kk-mobile-filter-panel"
                className="mt-2 p-3 border border-line rounded-md bg-white max-h-[60vh] overflow-y-auto"
              >
                {filterContent}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pb-5 border-b border-line mb-6 gap-4 flex-wrap">
            <input
              type="search"
              placeholder="Search…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 border border-line rounded-md text-sm flex-1 min-w-0 md:min-w-[260px] md:flex-none focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
            {/* Count + sort grouped on the right (count bold), so the product
                total sits next to the sort control instead of floating in the
                middle of the toolbar. */}
            <div className="flex items-center gap-4 shrink-0 ml-auto">
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
