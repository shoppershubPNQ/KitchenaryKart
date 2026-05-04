'use client';

import { useState } from 'react';
import { imgSrc, letter } from '@/lib/format';
import { toggleWishlist, useIsInWishlist } from '@/lib/wishlist';

interface Props {
  name: string;
  images: string[];
  imageUrl: string | null;
  sku: string;
  price: number;
  mrp?: number | null;
  category: string | null;
}

export function ProductGallery({ name, images, imageUrl, sku, price, mrp, category }: Props) {
  const imgs = images.length ? images : imageUrl ? [imageUrl] : [];
  const [active, setActive] = useState<string | null>(imgs[0] ?? null);
  const [copied, setCopied] = useState(false);
  const saved = useIsInWishlist(sku);

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const data = { title: name, text: `Check out ${name} on KitchenaryKart`, url };
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share(data);
        return;
      }
    } catch { /* user-cancelled share is not an error */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard may be blocked — quiet fail */ }
  }

  if (imgs.length === 0) {
    return (
      <div className="relative bg-white border border-line rounded-lg aspect-square grid place-items-center">
        <Overlay saved={saved} onSave={() => toggleWishlist({ sku, name, price, mrp, imageUrl, category })} onShare={share} copied={copied} />
        <span className="text-8xl font-head font-black text-brand opacity-80">{letter(name)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-3 md:grid md:grid-cols-[80px_1fr]">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:flex-col md:max-h-[560px] md:overflow-y-auto md:overflow-x-visible md:pb-0 md:pr-1">
        {imgs.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setActive(u)}
            className={`w-16 h-16 md:w-[72px] md:h-[72px] p-1 bg-white border-2 rounded-md cursor-pointer transition overflow-hidden shrink-0 ${
              active === u ? 'border-brand' : 'border-line hover:border-gold'
            }`}
          >
            <img src={imgSrc(u)} alt="" className="w-full h-full object-contain" />
          </button>
        ))}
      </div>
      <div className="relative bg-white border border-line rounded-lg aspect-square grid place-items-center overflow-hidden">
        <Overlay saved={saved} onSave={() => toggleWishlist({ sku, name, price, mrp, imageUrl, category })} onShare={share} copied={copied} />
        {active && <img src={imgSrc(active)} alt={name} className="w-full h-full object-contain" />}
      </div>
    </div>
  );
}

function Overlay({
  saved,
  onSave,
  onShare,
  copied,
}: {
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  copied: boolean;
}) {
  return (
    <div className="absolute top-3 right-3 z-[2] flex flex-col gap-2">
      <button
        type="button"
        onClick={onSave}
        aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={saved}
        title={saved ? 'Saved to wishlist' : 'Add to wishlist'}
        className={`w-10 h-10 rounded-full grid place-items-center bg-white shadow-sm border border-line transition hover:scale-105 ${
          saved ? 'text-brand' : 'text-ink hover:text-brand'
        }`}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={onShare}
          aria-label="Share"
          title="Share product"
          className="w-10 h-10 rounded-full grid place-items-center bg-white shadow-sm border border-line text-ink hover:text-brand transition hover:scale-105"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
        {copied && (
          <span className="absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap bg-ink text-white text-[11px] font-semibold px-2 py-1 rounded shadow">
            Link copied
          </span>
        )}
      </div>
    </div>
  );
}
