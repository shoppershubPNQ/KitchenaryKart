'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { imgSrc, inr } from '@/lib/format';

interface SearchHit {
  sku: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
}

// Higher debounce (was 200) so a fast typer doesn't fire a request
// per keystroke — only after they stop typing for ~300ms. Combined
// with MIN_CHARS=3 this roughly halves the DB query rate vs the
// original config without hurting perceived snappiness.
const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

/**
 * Live-autocomplete search input.
 *
 * As the user types (≥ 2 chars), debounced to 200ms, fetches matching
 * products from /api/search and renders a dropdown of up to 6 hits with
 * thumbnail + name + price. Click → PDP. Enter or "See all results" →
 * /shop?q=…. Outside click / Escape closes the dropdown.
 *
 * Race-condition safe: each request carries an incrementing token and
 * stale responses are discarded.
 */
export function HeaderSearch({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const requestToken = useRef(0);

  // Debounced fetch — fires only after the user stops typing for
  // DEBOUNCE_MS so a fast typer doesn't generate 10 requests for "snowflake".
  useEffect(() => {
    const needle = q.trim();
    if (needle.length < MIN_CHARS) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myToken = ++requestToken.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(needle)}&limit=6`,
          { cache: 'no-store' },
        );
        const data = (await res.json()) as { hits: SearchHit[] };
        // Drop stale responses (newer keystrokes have already fired).
        if (myToken !== requestToken.current) return;
        setHits(Array.isArray(data.hits) ? data.hits : []);
      } catch {
        if (myToken === requestToken.current) setHits([]);
      } finally {
        if (myToken === requestToken.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  // Outside-click + Escape closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const submit = useCallback(
    (query?: string) => {
      const needle = (query ?? q).trim();
      const url = needle ? `/shop?q=${encodeURIComponent(needle)}` : '/shop';
      setOpen(false);
      router.push(url);
    },
    [q, router],
  );

  const navigateToHit = useCallback(
    (hit: SearchHit) => {
      setOpen(false);
      router.push(`/product/${encodeURIComponent(hit.sku)}`);
    },
    [router],
  );

  const showDropdown = open && q.trim().length >= MIN_CHARS;

  const Dropdown = showDropdown ? (
    <div
      role="listbox"
      className="absolute left-0 right-0 top-full mt-1 z-[200] bg-white border border-line rounded-md shadow-xl overflow-hidden max-h-[70vh] overflow-y-auto"
    >
      {loading && hits.length === 0 && (
        <div className="px-4 py-3 text-sm text-muted">Searching…</div>
      )}
      {!loading && hits.length === 0 && (
        <div className="px-4 py-3 text-sm text-muted">
          No products match "<span className="text-ink">{q.trim()}</span>".
          <button
            type="button"
            onClick={() => submit()}
            className="ml-2 text-brand font-semibold hover:underline"
          >
            Search anyway →
          </button>
        </div>
      )}
      {hits.length > 0 && (
        <>
          <ul className="divide-y divide-line">
            {hits.map((hit) => (
              <li key={hit.sku}>
                <button
                  type="button"
                  onClick={() => navigateToHit(hit)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-soft transition"
                >
                  <span className="w-12 h-12 shrink-0 rounded bg-bg-soft border border-line overflow-hidden grid place-items-center">
                    {hit.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgSrc(hit.imageUrl)}
                        alt={hit.name}
                        width={48}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-muted">No image</span>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-ink font-medium truncate">
                      {hit.name}
                    </span>
                    <span className="block text-xs text-muted truncate">
                      {hit.category || 'Kitchenary Kart'}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-ink shrink-0">
                    {inr(hit.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => submit()}
            className="w-full px-4 py-2.5 text-sm font-semibold text-brand bg-bg-soft hover:bg-brand hover:text-white transition text-center border-t border-line"
          >
            See all results for "{q.trim()}" →
          </button>
        </>
      )}
    </div>
  ) : null;

  if (mobile) {
    return (
      <div ref={wrapRef} className="relative">
        <input
          type="search"
          placeholder="Search KitchenaryKart"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="w-full h-10 px-4 border border-line rounded-full text-sm"
        />
        {Dropdown}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="hidden md:block relative w-full max-w-[49%]"
    >
      <input
        type="search"
        placeholder="Search for products"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="w-full h-12 pl-5 pr-14 border border-line rounded-md text-[15px] bg-white text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
      />
      <button
        type="button"
        aria-label="Search"
        onClick={() => submit()}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded grid place-items-center text-muted hover:text-brand hover:bg-bg-soft"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
      {Dropdown}
    </div>
  );
}
