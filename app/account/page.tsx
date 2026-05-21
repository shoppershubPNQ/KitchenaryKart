import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Customer account landing page. Server-rendered: if not signed in, bounce
 * home (AuthModal is triggered from the header, not from a deep link).
 */
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = getCustomerSession();
  if (!session) redirect('/');

  const customer = await prisma.customer.findUnique({
    where: { id: session.cid },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
  if (!customer) redirect('/');

  return (
    <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-14">
      <h1 className="font-head text-3xl text-ink mb-2">Hi, {customer.name.split(' ')[0]}!</h1>
      <p className="text-muted mb-8">Manage your account and orders.</p>

      <div className="grid md:grid-cols-[260px_1fr] gap-8">
        <aside className="bg-bg-soft rounded-lg p-4 self-start">
          <div className="font-head font-semibold text-ink">{customer.name}</div>
          <div className="text-xs text-muted mt-0.5">{customer.phone}</div>
          <div className="text-xs text-muted">{customer.email}</div>
          <nav className="mt-4 flex flex-col gap-1 text-sm">
            <Link href="/account" className="px-3 py-2 rounded bg-white text-brand font-semibold">
              Profile
            </Link>
            <Link href="/account/orders" className="px-3 py-2 rounded hover:bg-white text-ink">
              My Orders
            </Link>
            <Link href="/wishlist" className="px-3 py-2 rounded hover:bg-white text-ink">
              Wishlist
            </Link>
            <Link href="/shop" className="px-3 py-2 rounded hover:bg-white text-ink">
              Continue shopping
            </Link>
          </nav>
        </aside>

        <section className="bg-white border border-line rounded-lg p-6">
          <h2 className="font-head text-lg mb-4 text-ink">Profile details</h2>
          <dl className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
            <dt className="text-muted">Name</dt>
            <dd className="text-ink">{customer.name}</dd>
            <dt className="text-muted">Phone</dt>
            <dd className="text-ink">{customer.phone || '—'}</dd>
            <dt className="text-muted">Email</dt>
            <dd className="text-ink">{customer.email}</dd>
            <dt className="text-muted">Member since</dt>
            <dd className="text-ink">{new Date(customer.createdAt).toLocaleDateString('en-IN')}</dd>
          </dl>
          <p className="mt-6 text-xs text-muted">
            Need to update your details? Drop us a line at{' '}
            <a href="mailto:sales@kitchenarykart.com" className="text-brand hover:underline">
              sales@kitchenarykart.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
