/**
 * Wide promotional banner strip used on the homepage (e.g. "Summer Sale –
 * Ice Machines"). All copy lives in the `BANNER` object below — change the
 * title, subtitle, tagline, CTA href/label, feature bullets or background
 * gradient in one place and everything updates.
 *
 * Swap `productEmoji` for an `<img src="/banners/ice-machine.png" />` when
 * you have a real product cut-out — the right column will size automatically.
 */
import Link from 'next/link';

// ─── Editable banner content ───────────────────────────────────────────────
const BANNER = {
  title: 'Summer Sale',
  subtitle: 'Stay Cool with High-Performance Ice Machines',
  tagline: 'Up to 40% OFF',
  cta: { text: 'Shop Now', href: '/shop?q=ice' },
  features: [
    { icon: 'timer', label: 'Fast Ice Production' },
    { icon: 'badge', label: 'Commercial Grade Performance' },
    { icon: 'bolt', label: 'Energy-Efficient' },
  ] as const,
  // Light icy gradient — matches the reference art.
  background:
    'linear-gradient(135deg,#D7EEFB 0%,#B5DDF1 45%,#E2F1FA 75%,#FFE9C2 100%)',
  // Colors for the text and CTA — tweak to re-skin the banner.
  titleColor: '#0C2E3B',     // deep navy
  bodyColor: '#133748',
  ctaBg: '#1F6F8A',          // teal
  ctaText: '#ffffff',
  iconColor: '#0C2E3B',
  // Right-hand visual. Swap this for an <img> when a real asset is ready.
  productEmoji: '🧊',
};
// ───────────────────────────────────────────────────────────────────────────

function FeatureIcon({ name, color }: { name: string; color: string }) {
  const common = {
    width: 22,
    height: 22,
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'timer':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 1.5" />
          <path d="M9 2h6" />
        </svg>
      );
    case 'badge':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="m12 2 2.39 2.39L17.7 3l.9 3.31L22 7.3l-1.39 3.31L22 13.9l-3.39.99L17.7 18.2l-3.31-.9L12 19.7l-2.39-2.4L6.3 18.2l-.9-3.31L2 13.9l1.39-3.31L2 7.3l3.39-.99L6.3 3l3.31.9L12 2z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'bolt':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9" />
          <polygon points="13 7 9 13 12 13 11 17 15 11 12 11 13 7" fill={color} stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

export function PromoBanner() {
  return (
    <section className="py-10">
      <div className="max-w-site mx-auto px-[1.5cm]">
        <div
          className="relative rounded-2xl overflow-hidden shadow-sm"
          style={{ background: BANNER.background }}
        >
          <div className="grid md:grid-cols-[1.2fr_1fr] grid-cols-1 items-center gap-8 p-8 md:p-12">
            {/* Left column — headline + CTA + features */}
            <div>
              <h2
                className="font-head font-bold leading-[1.05] mb-4 text-[clamp(2rem,4vw,3.4rem)]"
                style={{ color: BANNER.titleColor }}
              >
                {BANNER.title}
              </h2>
              <p
                className="text-[clamp(1rem,1.4vw,1.25rem)] leading-snug mb-3 max-w-[440px]"
                style={{ color: BANNER.bodyColor }}
              >
                {BANNER.subtitle}
              </p>
              <p
                className="font-head font-bold text-[clamp(1rem,1.3vw,1.2rem)] mb-6"
                style={{ color: BANNER.bodyColor }}
              >
                {BANNER.tagline}
              </p>

              <Link
                href={BANNER.cta.href}
                className="inline-flex items-center px-7 py-3 font-head text-sm font-bold tracking-widest uppercase rounded-md hover:opacity-90 hover:-translate-y-0.5 transition"
                style={{ background: BANNER.ctaBg, color: BANNER.ctaText }}
              >
                {BANNER.cta.text}
              </Link>

              <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                {BANNER.features.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center gap-2.5 text-[14px]"
                    style={{ color: BANNER.bodyColor }}
                  >
                    <span
                      className="w-9 h-9 rounded-full grid place-items-center bg-white/55 shrink-0"
                      style={{ boxShadow: '0 1px 2px rgba(12,46,59,.08)' }}
                    >
                      <FeatureIcon name={f.icon} color={BANNER.iconColor} />
                    </span>
                    <span className="font-medium">{f.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right column — product visual */}
            <div className="hidden md:grid place-items-center">
              <div
                className="w-[300px] h-[300px] rounded-[32px] grid place-items-center text-[9rem] backdrop-blur-sm"
                style={{
                  background:
                    'radial-gradient(circle at 30% 25%, rgba(255,255,255,.9) 0%, rgba(255,255,255,.35) 55%, rgba(255,255,255,0) 75%)',
                }}
              >
                <span className="drop-shadow-md">{BANNER.productEmoji}</span>
              </div>
            </div>
          </div>

          {/* Decorative highlight blobs */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 w-60 h-60 rounded-full opacity-60"
            style={{
              background:
                'radial-gradient(circle, rgba(255,220,150,.9) 0%, rgba(255,220,150,0) 70%)',
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -left-12 w-72 h-72 rounded-full opacity-50"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 70%)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
