import type { Metadata } from 'next';
import { TrackForm } from './TrackForm';

export const metadata: Metadata = {
  title: 'Track your order',
  description:
    'Track your KitchenaryKart order using your order number and the phone number you placed the order with. See order status, shipment tracking and delivery updates.',
  alternates: { canonical: '/track' },
  // Personalised utility page — thin/duplicate to Google and no SEO value.
  // Keep it crawlable for links but out of the index.
  robots: { index: false, follow: true },
};

export default function TrackPage({
  searchParams,
}: {
  searchParams?: { order?: string };
}) {
  const prefillOrder = (searchParams?.order ?? '').toString();

  return (
    <div className="max-w-2xl mx-auto px-[6mm] md:px-[1.5cm] py-14">
      <h1 className="font-head text-3xl text-ink mb-2">Track your order</h1>
      <p className="text-muted text-sm mb-8">
        Enter your order number and the phone number you placed the order with.
        For full order history,{' '}
        <a href="/account" className="text-brand hover:underline">
          sign in to your account
        </a>
        .
      </p>

      <TrackForm prefillOrder={prefillOrder} />
    </div>
  );
}
