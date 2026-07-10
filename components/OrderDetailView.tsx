/**
 * Full order view: status timeline, tracking, items, totals, shipping
 * address. Used on both the logged-in /account/orders/[number] page
 * and the public /track result page.
 *
 * Server component — receives the already-loaded public-safe data
 * from lib/orders.ts so this component never reaches the DB itself.
 */
import Link from 'next/link';
import { imgSrc, inr, dateShortFromIso } from '@/lib/format';
import { OrderStatusTimeline, StatusPill } from './OrderStatusTimeline';
import type { PublicOrder } from '@/lib/orders';
import { computeOrderSummary } from '@/lib/order-summary';

export function OrderDetailView({
  order,
  // Only the logged-in /account view passes this — the guest /track page
  // has no customer session, so the (auth-gated) invoice download is hidden
  // there. Shown only for paid orders.
  canDownloadInvoice = false,
}: {
  order: PublicOrder;
  canDownloadInvoice?: boolean;
}) {
  // Customers can leave reviews once the order has been shipped or
  // delivered. The PDP's #reviews anchor opens the existing review
  // CTA so we don't have to duplicate the auth/eligibility UI here.
  const canReview =
    order.orderStatus === 'shipped' || order.orderStatus === 'delivered';
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">Order</div>
          <h1 className="font-mono text-2xl font-bold text-ink">{order.orderNumber}</h1>
          <div className="text-sm text-muted mt-1">
            Placed {dateShortFromIso(order.createdAt)}
            {order.invoiceNumber && (
              <>
                {' · Invoice '}
                <span className="font-mono">{order.invoiceNumber}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <div className="flex items-center gap-2">
            <StatusPill status={order.orderStatus} />
            <StatusPill status={order.paymentStatus} />
          </div>
          {canDownloadInvoice && order.paymentStatus === 'completed' && (
            <a
              href={`/api/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
            >
              <span aria-hidden>⬇</span> Download Tax Invoice
            </a>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-line rounded-lg p-5 md:p-6">
        <OrderStatusTimeline
          orderStatus={order.orderStatus}
          paymentStatus={order.paymentStatus}
          createdAt={order.createdAt}
          shippedAt={order.shippedAt}
          deliveredAt={order.deliveredAt}
        />
      </div>

      {/* Tracking */}
      {order.trackingNumber && (
        <div className="bg-bg-soft border border-line rounded-lg p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Shipment tracking
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {order.carrierName && (
              <span className="font-semibold text-ink">{order.carrierName}</span>
            )}
            <span className="font-mono text-ink">{order.trackingNumber}</span>
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand hover:underline"
              >
                Track on carrier site →
              </a>
            )}
          </div>
          {order.shippedAt && (
            <div className="text-xs text-muted mt-2">
              Shipped on {dateShortFromIso(order.shippedAt)}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-line font-semibold text-ink">
          Items ({order.items.length})
        </div>
        <ul className="divide-y divide-line">
          {order.items.map((it, idx) => (
            <li key={`${it.productSku}-${idx}`} className="flex gap-4 p-4">
              <div className="w-16 h-16 rounded bg-bg-soft overflow-hidden shrink-0 grid place-items-center">
                {it.imageUrl ? (
                  // Reverted from next/image 2026-05-23 — same /images/* issue.
                  <img
                    src={imgSrc(it.imageUrl)}
                    alt={it.productName}
                    width={64}
                    height={64}
                    loading="lazy"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-muted">
                    {it.productSku.slice(0, 3)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink line-clamp-2">
                  {it.productName}
                </div>
                <div className="text-[11px] text-muted font-mono mt-0.5">
                  {it.productSku}
                </div>
                <div className="text-xs text-muted mt-1">
                  Qty {it.quantity} × {inr(it.unitPrice)}
                </div>
                {canReview && it.productSku && (
                  <Link
                    href={`/product/${encodeURIComponent(it.productSku)}#reviews`}
                    className="inline-block text-[11px] font-semibold text-brand hover:underline mt-1.5"
                  >
                    Write a review →
                  </Link>
                )}
              </div>
              <div className="text-sm font-semibold text-ink shrink-0">
                {inr(it.lineTotal)}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Address + totals */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-line rounded-lg p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Shipping address
          </div>
          <div className="text-sm text-ink whitespace-pre-line">
            {order.shippingAddress || '—'}
          </div>
        </div>
        <div className="bg-white border border-line rounded-lg p-5 text-sm">
          <div className="text-xs text-muted uppercase tracking-wider mb-3">
            Order summary
          </div>
          {(() => {
            // Shared helper — same ladder + numbers as the invoice / admin /
            // cart. GST on the discounted Net Value.
            const summary = computeOrderSummary(
              order.items.map((it) => ({
                price: it.lineTotal,
                qty: 1, // lineTotal already covers the line's quantity
                taxPercent: it.taxPercent,
              })),
              order.discountAmount,
              order.shippingCost, // stored shipping = what the customer paid
            );
            return (
              <dl className="space-y-1.5">
                <Row label="Excluding GST Price (Net Price)" value={inr(summary.netPrice)} />
                {summary.discountPct > 0 && (
                  <Row label={`Discount (${summary.discountPct}%)`} value={`− ${inr(summary.discountAmount)}`} />
                )}
                {summary.discountPct > 0 && (
                  <Row label="Net Value" value={inr(summary.netValue)} />
                )}
                <Row label={`Shipping Fee${summary.shipping === 0 ? ' (Free)' : ''}`} value={inr(summary.shipping)} />
                <Row label={`GST (${summary.gstRateLabel})`} value={inr(summary.gstAmount)} />
                {summary.roundOff !== 0 && (
                  <Row label="Round Off" value={`${summary.roundOff > 0 ? '+ ' : '− '}${inr(Math.abs(summary.roundOff))}`} />
                )}
                <div className="border-t border-line pt-2 mt-2">
                  <Row label="Net Payable Amount" value={inr(summary.netPayable)} bold />
                </div>
              </dl>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? 'font-semibold text-ink' : 'text-muted'}>{label}</dt>
      <dd className={bold ? 'font-bold text-ink' : 'text-ink'}>{value}</dd>
    </div>
  );
}
