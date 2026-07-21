import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Buying Guides & Kitchen Equipment Blog',
  description:
    'Practical buying guides and setup checklists for commercial kitchen equipment — bain maries, snowflake machines, cloud-kitchen gear and more, written for Indian restaurants and HORECA businesses.',
  alternates: { canonical: '/blog' },
};

// Content is static (authored in lib/blog.ts) — render once, cache long.
export const revalidate = 3600;

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BlogIndex() {
  const posts = getAllPosts();
  // Newest post leads as a full-width feature; the rest fill the grid.
  const [featured, ...rest] = posts;

  return (
    <div className="max-w-[1240px] mx-auto px-[6mm] md:px-[1.5cm] py-10 md:py-14">
      <nav className="text-xs text-muted flex items-center gap-2 mb-8">
        <Link href="/" className="hover:text-brand transition-colors">Home</Link>
        <span className="opacity-50">/</span>
        <span className="text-ink font-medium">Blog</span>
      </nav>

      <header className="mb-10 md:mb-12 max-w-[64ch]">
        <span className="text-[11px] font-bold uppercase tracking-[2px] text-brand">
          Kitchenary Kart Journal
        </span>
        <h1 className="font-head text-[clamp(1.9rem,3.6vw,2.7rem)] font-bold text-ink leading-tight mt-2 mb-4">
          Buying Guides & Kitchen Equipment Blog
        </h1>
        <p className="text-[17px] leading-relaxed text-muted">
          Honest, practical guides to choosing and setting up commercial kitchen
          equipment — written for restaurant owners, café founders, cloud-kitchen
          operators and chefs across India.
        </p>
      </header>

      {featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="group block rounded-2xl border border-line bg-bg-soft p-7 md:p-9 mb-8 md:mb-10 hover:border-brand hover:shadow-md transition"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-white bg-brand rounded px-2 py-0.5">
                  Latest
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand">
                  {featured.tag}
                </span>
              </div>
              <h2 className="font-head text-[clamp(1.4rem,2.6vw,2rem)] font-bold text-ink leading-snug mb-3 group-hover:text-brand transition-colors">
                {featured.title}
              </h2>
              <p className="text-[15px] md:text-[16px] leading-relaxed text-muted max-w-[62ch] mb-4">
                {featured.description}
              </p>
              <div className="text-xs text-muted flex items-center gap-2">
                <span>{fmtDate(featured.date)}</span>
                <span className="opacity-50">·</span>
                <span>{featured.readMins} min read</span>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-2 text-brand font-head font-bold text-[13px] uppercase tracking-wider">
              Read guide
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {rest.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col rounded-xl border border-line bg-white p-6 hover:border-brand hover:shadow-md hover:-translate-y-0.5 transition"
          >
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand mb-3">
              {post.tag}
            </span>
            <h2 className="font-head text-[18px] font-bold text-ink leading-snug mb-2 group-hover:text-brand transition-colors">
              {post.title}
            </h2>
            <p className="text-[14px] leading-relaxed text-muted flex-1 mb-4 line-clamp-3">
              {post.description}
            </p>
            <div className="text-xs text-muted flex items-center gap-2 pt-3 border-t border-line">
              <span>{fmtDate(post.date)}</span>
              <span className="opacity-50">·</span>
              <span>{post.readMins} min read</span>
              <span aria-hidden="true" className="ml-auto text-brand opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
