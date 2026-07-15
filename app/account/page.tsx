import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SignOutButton } from '@/components/SignOutButton';

/**
 * Customer account landing page. Server-rendered: if not signed in, bounce
 * home (AuthModal is triggered from the header, not from a deep link).
 */
export const dynamic = 'force-dynamic';

// Auth-gated, personalised — never index. (robots.txt also disallows
// /account/; this is the belt-and-suspenders meta for any known URL.)
export const metadata: Metadata = {
  title: 'My Account',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = getCustomerSession();
  if (!session) redirect('/');

  const customer = await prisma.customer.findUnique({
    where: { id: session.cid },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
  if (!customer) redirect('/');

  const initials = customer.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const memberSince = new Date(customer.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-14">
      <h1 className="font-head text-3xl text-ink mb-1.5">
        Hi, {customer.name.split(' ')[0]}!
      </h1>
      <p className="text-muted mb-8">Manage your account and orders.</p>

      <div className="grid md:grid-cols-[280px_1fr] gap-8">
        <aside className="bg-bg-soft rounded-xl p-5 self-start md:sticky md:top-[132px]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 rounded-full bg-brand text-white grid place-items-center font-head font-bold text-lg select-none">
              {initials || '👤'}
            </div>
            <div className="min-w-0">
              <div className="font-head font-semibold text-ink truncate">
                {customer.name}
              </div>
              <div className="text-xs text-muted truncate">{customer.email}</div>
            </div>
          </div>

          <nav className="mt-5 flex flex-col gap-1 text-sm">
            <Link
              href="/account"
              aria-current="page"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-white text-brand font-semibold shadow-sm"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
              </svg>
              Profile
            </Link>
            <Link
              href="/account/orders"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-ink hover:bg-white hover:text-brand transition"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
              </svg>
              My Orders
            </Link>
            <Link
              href="/wishlist"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-ink hover:bg-white hover:text-brand transition"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
              Wishlist
            </Link>
            <Link
              href="/shop"
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-ink hover:bg-white hover:text-brand transition"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
              </svg>
              Continue shopping
            </Link>

            <div className="my-2 border-t border-line" />
            <SignOutButton />
          </nav>
        </aside>

        <div className="min-w-0">
          {/* Quick actions */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <Link
              href="/account/orders"
              className="group flex items-center gap-4 bg-white border border-line rounded-xl p-5 hover:border-brand hover:shadow-sm transition"
            >
              <div className="w-11 h-11 shrink-0 rounded-lg bg-brand/10 text-brand grid place-items-center">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-head font-semibold text-ink">My Orders</div>
                <div className="text-xs text-muted">Track & review past orders</div>
              </div>
              <span className="ml-auto text-brand opacity-0 group-hover:opacity-100 transition">→</span>
            </Link>
            <Link
              href="/wishlist"
              className="group flex items-center gap-4 bg-white border border-line rounded-xl p-5 hover:border-brand hover:shadow-sm transition"
            >
              <div className="w-11 h-11 shrink-0 rounded-lg bg-brand/10 text-brand grid place-items-center">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-head font-semibold text-ink">Wishlist</div>
                <div className="text-xs text-muted">Items you've saved for later</div>
              </div>
              <span className="ml-auto text-brand opacity-0 group-hover:opacity-100 transition">→</span>
            </Link>
          </div>

          <section className="bg-white border border-line rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h2 className="font-head text-lg text-ink">Profile details</h2>
            </div>
            <dl className="divide-y divide-line">
              {[
                ['Name', customer.name],
                ['Phone', customer.phone || '—'],
                ['Email', customer.email],
                ['Member since', memberSince],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-4 px-6 py-3.5 text-sm"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-ink font-medium break-words">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="px-6 py-4 text-xs text-muted bg-bg-soft border-t border-line">
              Need to update your details? Drop us a line at{' '}
              <a
                href="mailto:sales@kitchenarykart.com"
                className="text-brand font-medium hover:underline"
              >
                sales@kitchenarykart.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
