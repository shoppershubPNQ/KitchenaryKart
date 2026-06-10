/**
 * Structured B2B product-details block, shown full-width below the
 * gallery/buy area on the PDP. Replaces the old "wall of text"
 * description with a scannable, conversion-oriented layout:
 *
 *   1. Overview            — lead paragraph
 *   2. Key Features        — icon cards from the product's hard specs
 *   3. Suitable For        — HORECA audience chips
 *   4. Technical Specs     — full spec table
 *   5. Detailed Description— remaining description paragraphs
 *   6. Why Choose Us       — trust grid (factual, shared)
 *   7. FAQ                 — zero-JS <details> accordion
 *
 * Data-driven so it works for every product: sections with no data
 * (e.g. no specs, no extra paragraphs) are skipped gracefully. Uses
 * the site brand token (#A01818) — NOT a one-off colour. Content max
 * width ~900px, mobile-first.
 */
import type { ProductFaq } from '@/lib/products';

type Spec = [string, string | null];

interface Props {
  name: string;
  description: string | null;
  specs: Spec[];
  faqs: ProductFaq[];
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  Power: (
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
  ),
  Capacity: (
    <>
      <path d="M5 8h14l-1.5 12h-11z" />
      <path d="M5 8 4 4h16l-1 4" />
    </>
  ),
  Dimensions: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 9h18M9 3v18" />
    </>
  ),
  Weight: (
    <>
      <path d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
      <path d="M6 7h12l3 13H3z" />
    </>
  ),
};

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const SUITABLE_FOR = [
  'Restaurants',
  'Hotels',
  'Cafés',
  'Cloud Kitchens',
  'Bakeries',
  'Caterers',
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-head text-[clamp(1.2rem,2vw,1.55rem)] font-bold text-ink mb-5 flex items-center gap-3">
      <span className="inline-block w-1 h-6 rounded bg-brand" aria-hidden="true" />
      {children}
    </h2>
  );
}

export function PdpDetails({ name, description, specs, faqs }: Props) {
  const presentSpecs = specs.filter(([, v]) => v && String(v).trim());

  // Split description into paragraphs; drop the standard trust paragraph
  // (its content lives in "Why Choose Us") only when there's more than
  // one paragraph, so single-paragraph generic copy is kept intact.
  const paras = (description || '')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  const isTrust = (p: string) => /GST tax invoice/i.test(p) && /WhatsApp/i.test(p);
  const contentParas = paras.length > 1 ? paras.filter((p) => !isTrust(p)) : paras;
  const overview = contentParas[0] || '';
  const detailed = contentParas.slice(1);

  // Key-feature cards from the product's hard specs (these are what
  // equipment buyers scan for). Skip the section if none are present.
  const featureSpecs = presentSpecs.filter(([k]) =>
    ['Power', 'Capacity', 'Dimensions', 'Weight'].includes(k),
  );

  return (
    <section className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] pb-16">
      <div className="max-w-[900px] mx-auto space-y-12">
        {/* 1. Overview */}
        {overview && (
          <div>
            <SectionHeading>Product Overview</SectionHeading>
            <p className="text-[16px] md:text-[17px] leading-relaxed text-ink/90">
              {overview}
            </p>
          </div>
        )}

        {/* 2. Key Features (icon cards) */}
        {featureSpecs.length > 0 && (
          <div>
            <SectionHeading>Key Features</SectionHeading>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {featureSpecs.map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-xl border border-line bg-bg-soft p-4 flex flex-col gap-2"
                >
                  <span className="w-10 h-10 rounded-full grid place-items-center bg-white border border-line text-brand">
                    <svg {...ICON_PROPS}>{FEATURE_ICONS[k]}</svg>
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    {k}
                  </span>
                  <span className="text-[14px] font-semibold text-ink leading-snug">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Suitable For */}
        <div>
          <SectionHeading>Suitable For</SectionHeading>
          <div className="flex flex-wrap gap-2.5">
            {SUITABLE_FOR.map((s) => (
              <span
                key={s}
                className="px-4 py-2 rounded-full bg-bg-soft border border-line text-[14px] font-medium text-ink"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 4. Technical Specifications */}
        {presentSpecs.length > 0 && (
          <div>
            <SectionHeading>Technical Specifications</SectionHeading>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-[14.5px]">
                <tbody>
                  {presentSpecs.map(([k, v], i) => (
                    <tr key={k} className={i % 2 === 1 ? 'bg-bg-soft' : 'bg-white'}>
                      <th
                        scope="row"
                        className="text-left font-semibold text-muted align-top w-[40%] md:w-[30%] px-4 py-3"
                      >
                        {k}
                      </th>
                      <td className="text-ink font-medium px-4 py-3">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Detailed Description */}
        {detailed.length > 0 && (
          <div>
            <SectionHeading>Detailed Description</SectionHeading>
            <div className="space-y-4">
              {detailed.map((p, i) => (
                <p key={i} className="text-[15.5px] leading-relaxed text-ink/85">
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 6. Why Choose Us */}
        <div>
          <SectionHeading>Why Choose Kitchenary Kart</SectionHeading>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-[15px] leading-relaxed text-ink/85">
            <li><strong className="text-ink">GST invoice</strong> on every order — full Input Tax Credit</li>
            <li><strong className="text-ink">Direct brand pricing</strong> — no middleman markup</li>
            <li><strong className="text-ink">Free pan-India delivery</strong> above ₹3,000</li>
            <li><strong className="text-ink">Bulk &amp; HORECA pricing</strong> on request</li>
            <li><strong className="text-ink">Secure payments</strong> — UPI, Card &amp; EMI</li>
            <li><strong className="text-ink">7-day returns</strong> on manufacturing defects</li>
          </ul>
        </div>

        {/* 7. FAQ */}
        {faqs.length > 0 && (
          <div>
            <SectionHeading>Frequently Asked Questions</SectionHeading>
            <div className="divide-y divide-line border-y border-line">
              {faqs.map((f, i) => (
                <details key={i} className="group py-1">
                  <summary className="flex items-start justify-between gap-4 cursor-pointer list-none py-4 text-[15px] font-semibold text-ink hover:text-brand transition-colors">
                    <span>{f.q}</span>
                    <span
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-brand transition-transform duration-200 group-open:rotate-45 text-xl leading-none"
                    >
                      +
                    </span>
                  </summary>
                  <div className="pb-5 pr-8 text-[14px] leading-relaxed text-muted">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
