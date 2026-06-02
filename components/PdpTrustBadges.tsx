/**
 * Trust-badge row shown on every PDP between the price block and the
 * variant selector.
 *
 * Five badges, chosen to reduce friction on a ₹10K+ commercial-
 * equipment purchase from an unfamiliar D2C site:
 *
 *   1. GST Invoice — Input Tax Credit eligible
 *        Speaks directly to the B2B buyer's wallet. Indian restaurant
 *        / cloud-kitchen owners can claim back the 18% GST on their
 *        next filing, effectively making the equipment 18% cheaper.
 *        Single biggest trust signal for HORECA buyers in India.
 *   2. Free Shipping (orders > ₹5,000)
 *        Removes the "what's shipping going to cost me?" mental block.
 *   3. Secure Payment (UPI · Card · EMI)
 *        Reassurance for first-time buyers worried about card fraud
 *        on an unfamiliar storefront.
 *   4. Easy Returns (7-day on defects)
 *        Safety net that gives high-AOV buyers permission to commit.
 *   5. WhatsApp Us
 *        Clickable CTA. Differentiates us from Amazon / Flipkart
 *        where you can't talk to a real human pre-purchase.
 *
 * Layout: stacked column on mobile (each badge full-width, very
 * readable), single 5-column row on desktop. Mirrors the visual style
 * of FooterTrustUpper for consistency.
 *
 * Warranty was intentionally omitted — different SKUs ship with
 * different warranty terms and a blanket "12-month warranty" claim
 * would be inaccurate for some products.
 */

interface Badge {
  label: string;
  sub: string;
  icon: React.ReactNode;
  href?: string;
  external?: boolean;
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const BADGES: Badge[] = [
  {
    label: 'GST Invoice',
    sub: 'Input Tax Credit eligible',
    icon: (
      <svg viewBox="0 0 24 24" {...ICON_PROPS}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    label: 'Free Shipping',
    sub: 'Orders above ₹3,000',
    icon: (
      <svg viewBox="0 0 24 24" {...ICON_PROPS}>
        <rect x="1" y="3" width="15" height="13" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: 'Secure Payment',
    sub: 'UPI · Card · EMI',
    icon: (
      <svg viewBox="0 0 24 24" {...ICON_PROPS}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    label: 'Easy Returns',
    sub: '7-day on defects',
    icon: (
      <svg viewBox="0 0 24 24" {...ICON_PROPS}>
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp Us',
    sub: '+91 98903 52455',
    href:
      'https://wa.me/919890352455?text=' +
      encodeURIComponent(
        'Hi 👋\nI came across Kitchenary Kart and would like more details about a product on your site.',
      ),
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" {...ICON_PROPS}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
      </svg>
    ),
  },
];

function BadgeContent({ b }: { b: Badge }) {
  return (
    <>
      <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-white border border-line text-brand">
        {b.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-head font-bold text-[12.5px] text-ink leading-tight">
          {b.label}
        </span>
        <span className="block text-[11px] text-muted leading-tight mt-0.5 truncate">
          {b.sub}
        </span>
      </span>
    </>
  );
}

export function PdpTrustBadges() {
  return (
    <div
      role="list"
      aria-label="Buyer protection and benefits"
      className="grid grid-cols-1 md:grid-cols-5 gap-2 my-5 p-3 bg-bg-soft border border-line rounded-lg"
    >
      {BADGES.map((b) => {
        const wrapClass =
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md transition';
        if (b.href) {
          return (
            <a
              key={b.label}
              role="listitem"
              href={b.href}
              {...(b.external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              className={`${wrapClass} hover:bg-white hover:shadow-sm cursor-pointer`}
            >
              <BadgeContent b={b} />
            </a>
          );
        }
        return (
          <div key={b.label} role="listitem" className={wrapClass}>
            <BadgeContent b={b} />
          </div>
        );
      })}
    </div>
  );
}
