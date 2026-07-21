import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DEFAULT_OG_IMAGES } from '@/lib/og';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { clampDescription } from '@/lib/format';
import { BlogProse } from '@/components/BlogProse';
import { buildArticleJsonLd, buildCrumbsJsonLd, buildFaqJsonLd } from '@/lib/json-ld';

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
  // Article titles are keyword-rich and often already ~55-64 chars; the
  // " — KitchenaryKart" brand suffix pushed the <title> over 60 (audit
  // "title too long"). Drop the suffix on blog titles (brand stays in the
  // domain + OG siteName) via `absolute`. Descriptions clamped to <=160.
  const metaDescription = clampDescription(post.description);
  return {
    title: { absolute: post.title },
    description: metaDescription,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: post.title,
      description: metaDescription,
      siteName: 'KitchenaryKart',
      locale: 'en_IN',
      images: DEFAULT_OG_IMAGES,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: metaDescription,
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
  const faqLd = post.faqs?.length
    ? buildFaqJsonLd(post.faqs.map((f) => ({ q: f.q, a: f.a })))
    : null;

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
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* Centred reading column. Previously the article was max-w-site
          (1600px) while its content was capped at ~68ch with no centring, so
          on desktop the whole post hugged the left edge with a huge empty
          gutter on the right. One narrow, centred column fixes that. */}
      <article className="max-w-[760px] mx-auto px-[6mm] md:px-8 py-10 md:py-14">
        <nav className="text-xs text-muted flex items-center gap-2 mb-8 flex-wrap">
          <Link href="/" className="hover:text-brand transition-colors">Home</Link>
          <span className="opacity-50">/</span>
          <Link href="/blog" className="hover:text-brand transition-colors">Blog</Link>
          <span className="opacity-50">/</span>
          <span className="text-ink font-medium line-clamp-1">{post.title}</span>
        </nav>

        <header className="mb-8 pb-8 border-b border-line">
          <span className="inline-flex items-center rounded-full bg-brand/10 text-brand text-[11px] font-bold uppercase tracking-[1.5px] px-3 py-1">
            {post.tag}
          </span>
          <h1 className="font-head text-[clamp(1.9rem,3.6vw,2.7rem)] font-bold text-ink leading-[1.15] mt-4 mb-5">
            {post.title}
          </h1>
          <div className="text-[13px] text-muted flex items-center gap-2.5 flex-wrap">
            <span className="font-medium text-ink-soft">By {post.author}</span>
            <span className="opacity-40">·</span>
            <span>{fmtDate(post.date)}</span>
            <span className="opacity-40">·</span>
            <span>{post.readMins} min read</span>
          </div>
        </header>

        <BlogProse body={post.body} />

        {post.faqs && post.faqs.length > 0 && (
          <section className="mt-14">
            <h2 className="font-head text-[clamp(1.35rem,2.4vw,1.75rem)] font-bold text-ink mb-6">
              Frequently asked questions
            </h2>
            <dl className="space-y-3">
              {post.faqs.map((f, i) => (
                <div key={i} className="rounded-xl border border-line bg-bg-soft p-5">
                  <dt className="font-head font-bold text-ink text-[16px] mb-2">{f.q}</dt>
                  <dd className="text-[15.5px] leading-relaxed text-ink-soft">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {others.length > 0 && (
          <aside className="mt-14 pt-10 border-t border-line">
            <h2 className="font-head text-[18px] font-bold text-ink mb-5">
              Keep reading
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/blog/${o.slug}`}
                  className="group rounded-xl border border-line p-5 hover:border-brand hover:shadow-sm transition"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-brand">
                    {o.tag}
                  </span>
                  <span className="block font-head font-bold text-ink text-[15px] leading-snug mt-1.5 group-hover:text-brand transition-colors">
                    {o.title}
                  </span>
                  <span className="block text-xs text-muted mt-2">{o.readMins} min read</span>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </article>
    </>
  );
}
