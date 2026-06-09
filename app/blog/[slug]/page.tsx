import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { BlogProse } from '@/components/BlogProse';
import { buildArticleJsonLd, buildCrumbsJsonLd } from '@/lib/json-ld';

interface Params {
  params: { slug: string };
}

export const revalidate = 3600;

// Pre-render every post at build time (small, fixed set).
export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: 'Not found' };
  const canonical = `/blog/${post.slug}`;
  return {
    title: `${post.title} — KitchenaryKart`,
    description: post.description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: post.title,
      description: post.description,
      siteName: 'KitchenaryKart',
      locale: 'en_IN',
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BlogPostPage({ params }: Params) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const others = getAllPosts().filter((p) => p.slug !== post.slug).slice(0, 2);

  const articleLd = buildArticleJsonLd({
    slug: post.slug,
    title: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated,
    author: post.author,
  });
  const crumbsLd = buildCrumbsJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}
      />

      <article className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-10 md:py-14">
        <nav className="text-xs text-muted flex items-center gap-2 mb-6 flex-wrap">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="opacity-60">/</span>
          <Link href="/blog" className="hover:text-brand">Blog</Link>
          <span className="opacity-60">/</span>
          <span className="text-ink font-medium line-clamp-1">{post.title}</span>
        </nav>

        <header className="mb-8 max-w-[68ch]">
          <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand">
            {post.tag}
          </span>
          <h1 className="font-head text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold text-ink leading-tight mt-3 mb-4">
            {post.title}
          </h1>
          <div className="text-xs text-muted flex items-center gap-2">
            <span>By {post.author}</span>
            <span className="opacity-50">·</span>
            <span>{fmtDate(post.date)}</span>
            <span className="opacity-50">·</span>
            <span>{post.readMins} min read</span>
          </div>
        </header>

        <BlogProse body={post.body} />

        {others.length > 0 && (
          <aside className="mt-14 pt-8 border-t border-line">
            <h2 className="font-head text-[18px] font-bold text-ink mb-4">
              More guides
            </h2>
            <ul className="space-y-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/blog/${o.slug}`}
                    className="text-brand underline underline-offset-2 hover:opacity-80"
                  >
                    {o.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </article>
    </>
  );
}
