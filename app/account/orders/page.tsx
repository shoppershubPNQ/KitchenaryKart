import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/auth';
import { listOrdersForCustomer } from '@/lib/orders';
import { inr, dateShortFromIso } from '@/lib/format';
import { StatusPill } from '@/components/OrderStatusTimeline';

export const dynamic = 'force-dynamic';

// Auth-gated order history — never index.
export const metadata: Metadata = {
  title: 'My Orders',
  robots: { index: false, follow: false },
};

export default async function OrdersListPage() {
  const session = getCustomerSession();
  if (!session) redirect('/');

  const orders = await listOrdersForCustomer(session.cid);

  return (
    <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-14">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-head text-3xl text-ink">My Orders</h1>
          <p className="text-muted text-sm mt-1">
            {orders.length === 0
              ? 'You haven\'t placed any orders yet.'
              : `${orders.length} order${orders.length === 1 ? '' : 's'} on file.`}
          </p>
        </div>
        <Link href="/account" className="text-sm text-brand hover:underline">
          ← Back to profile
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-bg-soft rounded-lg p-10 text-center">
          <div className="text-4xl mb-3">🛍️</div>
          <p className="text-ink mb-4">Nothing here yet. Start browsing the catalog.</p>
          <Link
            href="/shop"
            className="inline-block px-6 py-2.5 bg-brand text-white rounded-md font-semibold text-sm hover:opacity-90"
          >
            Shop now
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.orderNumber}
              href={`/account/orders/${encodeURIComponent(o.orderNumber)}`}
              className="block bg-white border border-line rounded-lg p-4 md:p-5 hover:border-brand hover:shadow-sm transition"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-ink">{o.orderNumber}</span>
                    <StatusPill status={o.orderStatus} />
                    {o.paymentStatus !== 'completed' && (
                      <StatusPill status={o.paymentStatus} />
                    )}
                  </div>
                  <div className="text-xs text-muted mt-1.5">
                    Placed {dateShortFromIso(o.createdAt)} · {o.itemCount} item
                    {o.itemCount === 1 ? '' : 's'}
                  </div>
                  {o.trackingNumber && (
                    <div className="text-xs text-muted mt-0.5">
                      {o.carrierName ? `${o.carrierName} · ` : 'Tracking '}
                      <span className="font-mono">{o.trackingNumber}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-head text-lg font-bold text-ink">
                    {inr(o.totalAmount)}
                  </div>
                  <div className="text-xs text-brand mt-1">View details →</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
