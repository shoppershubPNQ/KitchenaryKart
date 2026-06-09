/**
 * PDP FAQ accordion.
 *
 * Pure server component built on native <details>/<summary> so it needs
 * zero client JS — the questions+answers are in the initial HTML, which
 * is exactly what Google's FAQPage rich result and AI crawlers want to
 * read. The matching FAQPage JSON-LD is emitted from the PDP itself.
 */
import type { ProductFaq } from '@/lib/products';

export function ProductFaqSection({ faqs }: { faqs: ProductFaq[] }) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      aria-labelledby="pdp-faq-heading"
      className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] pb-14"
    >
      <h2
        id="pdp-faq-heading"
        className="font-head text-[clamp(1.25rem,2vw,1.6rem)] font-bold text-ink mb-1.5"
      >
        Frequently Asked Questions
      </h2>
      <p className="text-sm text-muted mb-6">
        Common questions about ordering, GST invoicing, delivery and bulk pricing.
      </p>

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
    </section>
  );
}
