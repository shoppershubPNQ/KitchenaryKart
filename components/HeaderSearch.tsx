'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function HeaderSearch({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  function submit() {
    const url = q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop';
    router.push(url);
  }

  if (mobile) {
    return (
      <input
        type="search"
        placeholder="Search KitchenaryKart"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="w-full h-10 px-4 border border-line rounded-full text-sm"
      />
    );
  }

  return (
    <div className="hidden md:block relative w-full max-w-[49%]">
      <input
        type="search"
        placeholder="Search for products"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="w-full h-12 pl-5 pr-14 border border-line rounded-md text-[15px] bg-white text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
      />
      <button
        type="button"
        aria-label="Search"
        onClick={submit}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded grid place-items-center text-muted hover:text-brand hover:bg-bg-soft"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      </button>
    </div>
  );
}
