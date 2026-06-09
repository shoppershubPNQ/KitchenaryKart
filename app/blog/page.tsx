import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Buying Guides & Kitchen Equipment Blog — KitchenaryKart',
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

  return (
    <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-10 md:py-14">
      <nav className="text-xs text-muted flex items-center gap-2 mb-6">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span className="opacity-60">/</span>
        <span className="text-ink font-medium">Blog</span>
      </nav>

      <header className="mb-10 max-w-[60ch]">
        <h1 className="font-head text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold text-ink mb-3">
          Buying Guides & Kitchen Equipment Blog
        </h1>
        <p className="text-[16px] leading-relaxed text-muted">
          Honest, practical guides to choosing and setting up commercial kitchen
          equipment — written for restaurant owners, café founders, cloud-kitchen
          operators and chefs across India.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col rounded-xl border border-line p-6 hover:border-brand hover:shadow-sm transition"
          >
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand mb-3">
              {post.tag}
            </span>
            <h2 className="font-head text-[19px] font-bold text-ink leading-snug mb-2 group-hover:text-brand transition-colors">
              {post.title}
            </h2>
            <p className="text-[14px] leading-relaxed text-muted flex-1 mb-4">
              {post.description}
            </p>
            <div className="text-xs text-muted flex items-center gap-2">
              <span>{fmtDate(post.date)}</span>
              <span className="opacity-50">·</span>
              <span>{post.readMins} min read</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
