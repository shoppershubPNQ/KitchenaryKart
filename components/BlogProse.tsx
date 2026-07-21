/**
 * Renders blog post blocks (see lib/blog.BlogBlock) as styled prose.
 *
 * Paragraphs support inline markdown links `[text](/path)`, parsed into
 * Next <Link> elements so internal links are client-navigated and pass
 * link equity. No dangerouslySetInnerHTML — content is always escaped.
 *
 * Width is controlled by the parent article's reading column, so the
 * blocks here fill their container rather than capping their own measure.
 */
import Link from 'next/link';
import { Fragment } from 'react';
import type { BlogBlock } from '@/lib/blog';

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

function renderInline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  let key = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const [, label, href] = m;
    nodes.push(
      <Link key={key++} href={href} className="text-brand font-medium underline underline-offset-2 decoration-brand/40 hover:decoration-brand transition">
        {label}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return nodes;
}

export function BlogProse({ body }: { body: BlogBlock[] }) {
  // The first paragraph reads as an intro/standfirst — rendered larger and
  // darker than the body copy that follows.
  const leadIndex = body.findIndex((b) => b.type === 'p');

  return (
    <div className="mt-8">
      {body.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2
                key={i}
                className="font-head text-[clamp(1.35rem,2.4vw,1.75rem)] font-bold text-ink mt-12 mb-4"
              >
                {block.text}
              </h2>
            );
          case 'p':
            return (
              <p
                key={i}
                className={
                  i === leadIndex
                    ? 'text-[19px] leading-[1.7] text-ink mb-6'
                    : 'text-[17px] leading-[1.75] text-ink-soft mb-5'
                }
              >
                {renderInline(block.text)}
              </p>
            );
          case 'ul':
            return (
              <ul
                key={i}
                className="list-disc pl-5 mb-6 space-y-2.5 text-[17px] leading-[1.7] text-ink-soft marker:text-brand"
              >
                {block.items.map((it, j) => (
                  <li key={j} className="pl-1">{renderInline(it)}</li>
                ))}
              </ul>
            );
          case 'cta':
            return (
              <div key={i} className="my-8">
                <Link
                  href={block.href}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-brand text-white font-head font-bold text-[13px] uppercase tracking-wider hover:bg-brand-dark transition"
                >
                  {block.label} <span aria-hidden="true">→</span>
                </Link>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
