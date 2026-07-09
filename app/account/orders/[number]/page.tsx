import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getCustomerSession } from '@/lib/auth';
import { loadPublicOrder } from '@/lib/orders';
import { OrderDetailView } from '@/components/OrderDetailView';

export const dynamic = 'force-dynamic';

// Auth-gated single-order view — never index.
export const metadata: Metadata = {
  title: 'Order — KitchenaryKart',
  robots: { index: false, follow: false },
};

interface Props {
  params: { number: string };
}

export default async function OrderDetailPage({ params }: Props) {
  const session = getCustomerSession();
  if (!session) redirect('/');

  const order = await loadPublicOrder(decodeURIComponent(params.number), {
    customerId: session.cid,
  });
  if (!order) notFound();

  return (
    <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-14">
      <div className="text-sm mb-4">
        <Link href="/account/orders" className="text-brand hover:underline">
          ← All orders
        </Link>
      </div>
      <OrderDetailView order={order} canDownloadInvoice />
    </div>
  );
}
