/**
 * PDP reviews section. Server component that renders the summary +
 * approved reviews list. The "Write a review" CTA is delegated to a
 * client child (ReviewWriteCTA) so it can react to the user's auth
 * + buyer-eligibility state.
 */
import { Stars } from '@/lib/rating';
import { dateShortFromIso } from '@/lib/format';
import type { PublicReview, ReviewSummary } from '@/lib/reviews';
import { ReviewWriteCTA } from './ReviewWriteCTA';

interface Props {
  productSku: string;
  productName: string;
  summary: ReviewSummary;
  reviews: PublicReview[];
}

export function ReviewsSection({ productSku, productName, summary, reviews }: Props) {
  const totalForBars = Math.max(1, summary.count);

  return (
    <section id="reviews" className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-12 border-t border-line">
      <h2 className="font-head text-2xl text-ink mb-6">Customer reviews</h2>

      <div className="grid md:grid-cols-[280px_1fr] gap-8 mb-8">
        {/* Summary card */}
        <div className="bg-bg-soft rounded-lg p-5">
          {summary.count > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-head text-4xl font-bold text-ink">
                  {summary.average.toFixed(1)}
                </span>
                <span className="text-muted text-sm">/ 5</span>
              </div>
              <div className="mt-1.5"><Stars value={summary.average} size="md" /></div>
              <div className="text-xs text-muted mt-1">
                Based on {summary.count} verified review{summary.count === 1 ? '' : 's'}
              </div>

              {/* Rating distribution bars */}
              <ul className="mt-4 space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const n = summary.distribution[star - 1];
                  const pct = Math.round((n / totalForBars) * 100);
                  return (
                    <li key={star} className="flex items-center gap-2 text-xs">
                      <span className="text-muted w-6 text-right">{star}★</span>
                      <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-muted w-6">{n}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="text-sm text-muted">
              <p className="font-semibold text-ink mb-1">No reviews yet.</p>
              <p>Be the first to share your experience with this product.</p>
            </div>
          )}

          <div className="mt-5">
            <ReviewWriteCTA productSku={productSku} productName={productName} />
          </div>
        </div>

        {/* Reviews list */}
        <div>
          {reviews.length === 0 ? (
            <div className="text-sm text-muted py-6">
              Once verified buyers post reviews, they'll appear here.
            </div>
          ) : (
            <ul className="space-y-5">
              {reviews.map((r) => (
                <li key={r.id} className="border-b border-line pb-5 last:border-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Stars value={r.rating} size="sm" />
                    <span className="text-xs text-success font-semibold">
                      ✓ Verified buyer
                    </span>
                  </div>
                  {r.title && (
                    <div className="font-semibold text-ink text-[15px] mb-1">
                      {r.title}
                    </div>
                  )}
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                    {r.body}
                  </p>
                  <div className="text-xs text-muted mt-2">
                    {r.customerName} · {dateShortFromIso(r.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
