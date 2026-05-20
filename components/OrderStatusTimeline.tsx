/**
 * Visual order-status timeline — four pills with a connecting line,
 * highlighting the current state.
 *
 * Stops:
 *   1. Order placed   (always lit — every visible order has been placed)
 *   2. Processing     (paymentStatus === "completed")
 *   3. Shipped        (orderStatus === "shipped" OR shippedAt set)
 *   4. Delivered      (orderStatus === "delivered" OR deliveredAt set)
 *
 * Cancelled orders are surfaced separately above the timeline so it
 * doesn't have to encode a fifth state.
 */
import { dateShortFromIso } from '@/lib/format';

interface Props {
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}

interface Stop {
  label: string;
  reached: boolean;
  when: string | null;
}

export function OrderStatusTimeline({
  orderStatus,
  paymentStatus,
  createdAt,
  shippedAt,
  deliveredAt,
}: Props) {
  if (orderStatus === 'cancelled') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
        This order has been <strong>cancelled</strong>. Contact support if you need help.
      </div>
    );
  }

  const isPaid = paymentStatus === 'completed';
  const isShipped =
    orderStatus === 'shipped' || orderStatus === 'delivered' || !!shippedAt;
  const isDelivered = orderStatus === 'delivered' || !!deliveredAt;

  const stops: Stop[] = [
    { label: 'Order placed', reached: true, when: createdAt },
    { label: 'Processing', reached: isPaid, when: null },
    { label: 'Shipped', reached: isShipped, when: shippedAt },
    { label: 'Delivered', reached: isDelivered, when: deliveredAt },
  ];

  return (
    <ol className="flex flex-col md:flex-row md:items-start gap-3 md:gap-0 relative">
      {stops.map((s, i) => {
        const isLast = i === stops.length - 1;
        const nextReached = !isLast && stops[i + 1].reached;
        return (
          <li
            key={s.label}
            className="md:flex-1 flex md:flex-col md:items-center gap-3 md:gap-2 relative"
          >
            <div
              className={`shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full grid place-items-center font-semibold text-sm md:text-base border-2 transition-colors ${
                s.reached
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-slate-400 border-slate-300'
              }`}
              aria-current={
                s.reached && (isLast || !stops[i + 1].reached) ? 'step' : undefined
              }
            >
              {s.reached ? '✓' : i + 1}
            </div>
            <div className="md:text-center min-w-0">
              <div
                className={`text-[13px] font-semibold ${
                  s.reached ? 'text-ink' : 'text-slate-400'
                }`}
              >
                {s.label}
              </div>
              {s.when && (
                <div className="text-[11px] text-muted mt-0.5">
                  {dateShortFromIso(s.when)}
                </div>
              )}
            </div>
            {!isLast && (
              <div
                className={`hidden md:block absolute top-5 left-1/2 w-full h-[2px] z-[-1] ${
                  nextReached ? 'bg-brand' : 'bg-slate-200'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

const PILL_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  refunded: 'bg-slate-100 text-slate-600 border-slate-200',
};

const PILL_LABEL: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  completed: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

export function StatusPill({ status }: { status: string }) {
  const cls = PILL_STYLES[status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  const label = PILL_LABEL[status] ?? status;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cls}`}
    >
      {label}
    </span>
  );
}
