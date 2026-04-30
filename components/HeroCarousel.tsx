'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { PublicBanner } from '@/lib/banners';

type Slide =
  | {
      variant?: 'default';
      eyebrow: string;
      title: string;
      sub: string;
      btn1: { text: string; href: string; external?: boolean };
      btn2: { text: string; href: string };
      letter: string;
    }
  | {
      variant: 'promo';
      title: string;
      subtitle: string;
      tagline: string;
      cta: { text: string; href: string };
      features: { icon: 'timer' | 'badge' | 'bolt'; label: string }[];
      background: string;
      titleColor: string;
      bodyColor: string;
      ctaBg: string;
      ctaText: string;
      productEmoji: string;
    }
  | {
      variant: 'image';
      /** Absolute or /public-relative path to the banner image. */
      imageSrc: string;
      alt: string;
      href: string;
    };

const SLIDES: Slide[] = [
  {
    eyebrow: 'Built for professional kitchens',
    title: 'Equipment that keeps your kitchen moving.',
    sub: 'From 4-litre deep fryers to chafing dishes, bain marie to polyrattan baskets — 2,000+ commercial SKUs, spec sheets ready, GST invoiced, shipped worldwide.',
    btn1: { text: 'Browse catalog', href: '/shop' },
    btn2: { text: 'Request quote', href: '/contact' },
    letter: '🍳',
  },
  {
    eyebrow: 'Honest bulk pricing',
    title: 'One inquiry. One consolidated quote.',
    sub: "Add products to your inquiry list and we'll deliver consolidated quotes with tiered bulk pricing, ex-works rates and transparent shipping.",
    btn1: { text: 'Build inquiry list', href: '/shop' },
    btn2: { text: 'Talk to sales', href: '/contact' },
    letter: '💰',
  },
  // Summer Sale banner — shown as-is from /public/banners/summer-sale.jpg.
  // The whole banner is clickable; the image already contains all copy + CTA,
  // so nothing is overlaid on top of it.
  {
    variant: 'image',
    imageSrc: '/banners/summer-sale.jpg',
    alt: 'Summer Sale — Up to 40% off high-performance ice machines',
    href: '/shop?q=ice',
  },
  {
    eyebrow: 'Export-ready',
    title: 'DDP shipping to 40+ countries.',
    sub: 'Duty-paid shipping to US, UK, UAE, EU and beyond. See landed cost before you commit. All equipment commercial-grade, GST-invoiced from India.',
    btn1: { text: 'View export options', href: '/shop' },
    btn2: { text: 'Get DDP quote', href: '/contact' },
    letter: '🌍',
  },
  {
    eyebrow: 'Quote in 4 hours',
    title: 'Dedicated sales team. No 14-day wait.',
    sub: 'Mon–Sat, 10am–7pm IST. Create your inquiry list, and our team will follow up with bulk pricing, lead times, payment terms and full spec sheets — same day.',
    btn1: { text: 'WhatsApp chat', href: 'https://wa.me/919890352455', external: true },
    btn2: { text: 'Request quote', href: '/contact' },
    letter: '⚡',
  },
];

function FeatureIcon({ name, color }: { name: 'timer' | 'badge' | 'bolt'; color: string }) {
  const common = {
    width: 20,
    height: 20,
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (name === 'timer')
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 1.5" />
        <path d="M9 2h6" />
      </svg>
    );
  if (name === 'badge')
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="m12 2 2.39 2.39L17.7 3l.9 3.31L22 7.3l-1.39 3.31L22 13.9l-3.39.99L17.7 18.2l-3.31-.9L12 19.7l-2.39-2.4L6.3 18.2l-.9-3.31L2 13.9l1.39-3.31L2 7.3l3.39-.99L6.3 3l3.31.9L12 2z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <circle cx="12" cy="12" r="9" />
      <polygon
        points="13 7 9 13 12 13 11 17 15 11 12 11 13 7"
        fill={color}
        stroke="none"
      />
    </svg>
  );
}

/**
 * Hero carousel.
 *
 * If `banners` is non-empty it drives the carousel (admin-managed slides from
 * the Banners page). Otherwise the built-in `SLIDES` array is used as a
 * fallback so the home page always has something to show.
 */
export function HeroCarousel({ banners }: { banners?: PublicBanner[] } = {}) {
  const useDb = !!banners && banners.length > 0;
  const count = useDb ? banners!.length : SLIDES.length;

  const [idx, setIdx] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused.current) setIdx((i) => (i + 1) % count);
    }, 2500);
    return () => clearInterval(id);
  }, [count]);

  const go = (n: number) => setIdx(((n % count) + count) % count);

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="relative">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {useDb
            ? banners!.map((b, i) => (
                <div key={`b-${b.id}`} className="flex-shrink-0 w-full">
                  <AdminBannerSlide banner={b} />
                </div>
              ))
            : SLIDES.map((s, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-full"
              style={{
                background:
                  s.variant === 'promo' ? s.background : undefined,
              }}
            >
              {s.variant === 'image' ? (
                /* Image slide — render the provided asset exactly as-is,
                   via a background-image so layout stays stable even if the
                   file is missing (you'll see the fallback gradient instead
                   of a broken-image icon). The whole banner is clickable. */
                <Link
                  href={s.href}
                  aria-label={s.alt}
                  className="block w-full"
                >
                  {/* On mobile let the natural 1908:553 aspect drive the
                      height (no min-height = no horizontal cropping). The
                      desktop minimum is reapplied at ≥ md so the hero
                      stays prominent on big screens. */}
                  <div
                    role="img"
                    aria-label={s.alt}
                    className="w-full md:min-h-[320px]"
                    style={{
                      aspectRatio: '1908 / 553',
                      backgroundImage: `url(${s.imageSrc})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      backgroundColor: '#D7EEFB',
                    }}
                  />
                </Link>
              ) : (
                /* Solid cream background for default slides, shown via this inner wrapper */
                <div className={s.variant === 'promo' ? '' : 'bg-cream'}>
                  <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-10 min-h-[420px] grid md:grid-cols-[1.1fr_1fr] grid-cols-1 items-center gap-8">
                    {s.variant === 'promo' ? (
                      <PromoSlide slide={s} />
                    ) : (
                      <DefaultSlide slide={s} />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(idx - 1)}
          aria-label="Previous slide"
          className="absolute top-1/2 left-4 -translate-y-1/2 w-12 h-12 rounded-full bg-white/95 text-ink grid place-items-center text-2xl shadow-md hover:bg-brand hover:text-white z-[2]"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => go(idx + 1)}
          aria-label="Next slide"
          className="absolute top-1/2 right-4 -translate-y-1/2 w-12 h-12 rounded-full bg-white/95 text-ink grid place-items-center text-2xl shadow-md hover:bg-brand hover:text-white z-[2]"
        >
          ›
        </button>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-[2]">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`w-7 h-1 rounded-sm transition-colors ${
                i === idx ? 'bg-brand' : 'bg-black/20'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Admin-managed banner slide. The image fills a fixed 1908:553 box with
 * `object-cover`, so any upload size is center-cropped to fit. If the admin
 * set a link target (product / category / URL), the entire banner is one
 * big clickable area; otherwise it's purely decorative.
 */
function AdminBannerSlide({ banner: b }: { banner: PublicBanner }) {
  const img = (
    <img
      src={b.imageUrl}
      alt={b.alt || ''}
      className="absolute inset-0 w-full h-full object-cover"
      draggable={false}
    />
  );
  return (
    <div className="relative w-full overflow-hidden md:min-h-[320px]" style={{ aspectRatio: '1908 / 553' }}>
      {b.ctaHref ? (
        <Link href={b.ctaHref} aria-label={b.alt || 'Promotional banner'} className="absolute inset-0 block">
          {img}
        </Link>
      ) : (
        img
      )}
    </div>
  );
}

function DefaultSlide({
  slide: s,
}: {
  slide: Extract<Slide, { variant?: 'default' }>;
}) {
  return (
    <>
      <div>
        <div className="text-xs font-bold tracking-[2px] uppercase text-brand mb-3.5">
          {s.eyebrow}
        </div>
        <h1 className="text-[clamp(2rem,3.4vw,3.1rem)] leading-tight mb-4.5 -tracking-[0.5px]">
          {s.title}
        </h1>
        <p className="text-base text-ink-soft max-w-[520px] mb-6">{s.sub}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={s.btn1.href}
            className="hero-btn"
            target={s.btn1.external ? '_blank' : undefined}
            rel={s.btn1.external ? 'noopener' : undefined}
          >
            {s.btn1.text}
          </Link>
          <Link href={s.btn2.href} className="hero-btn hero-btn-secondary">
            {s.btn2.text}
          </Link>
        </div>
      </div>
      <div className="hidden md:grid place-items-center">
        <div
          className="w-[360px] h-[360px] rounded-full grid place-items-center text-7xl font-head font-black text-brand"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, #fff 0, #E8DCC4 70%)',
            boxShadow: 'inset 0 0 0 16px rgba(255,255,255,.5)',
          }}
        >
          {s.letter}
        </div>
      </div>
    </>
  );
}

function PromoSlide({
  slide: s,
}: {
  slide: Extract<Slide, { variant: 'promo' }>;
}) {
  return (
    <>
      <div>
        <h1
          className="font-head font-bold leading-[1.05] mb-4 text-[clamp(2.2rem,4.2vw,3.6rem)]"
          style={{ color: s.titleColor }}
        >
          {s.title}
        </h1>
        <p
          className="text-[clamp(1rem,1.4vw,1.25rem)] leading-snug mb-3 max-w-[440px]"
          style={{ color: s.bodyColor }}
        >
          {s.subtitle}
        </p>
        <p
          className="font-head font-bold text-[clamp(1rem,1.3vw,1.2rem)] mb-6"
          style={{ color: s.bodyColor }}
        >
          {s.tagline}
        </p>

        <Link
          href={s.cta.href}
          className="inline-flex items-center px-7 py-3 font-head text-sm font-bold tracking-widest uppercase rounded-md hover:opacity-90 hover:-translate-y-0.5 transition"
          style={{ background: s.ctaBg, color: s.ctaText }}
        >
          {s.cta.text}
        </Link>

        <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-2.5">
          {s.features.map((f) => (
            <li
              key={f.label}
              className="flex items-center gap-2 text-[13.5px]"
              style={{ color: s.bodyColor }}
            >
              <span
                className="w-9 h-9 rounded-full grid place-items-center bg-white/55 shrink-0"
                style={{ boxShadow: '0 1px 2px rgba(12,46,59,.08)' }}
              >
                <FeatureIcon name={f.icon} color={s.titleColor} />
              </span>
              <span className="font-medium">{f.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden md:grid place-items-center relative">
        {/* Warm sunlit glow behind the product */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 -right-6 w-60 h-60 rounded-full opacity-60"
          style={{
            background:
              'radial-gradient(circle, rgba(255,220,150,.9) 0%, rgba(255,220,150,0) 70%)',
          }}
        />
        <div
          className="w-[320px] h-[320px] rounded-[36px] grid place-items-center text-[9rem] backdrop-blur-sm"
          style={{
            background:
              'radial-gradient(circle at 30% 25%, rgba(255,255,255,.9) 0%, rgba(255,255,255,.35) 55%, rgba(255,255,255,0) 75%)',
          }}
        >
          <span className="drop-shadow-md">{s.productEmoji}</span>
        </div>
      </div>
    </>
  );
}
