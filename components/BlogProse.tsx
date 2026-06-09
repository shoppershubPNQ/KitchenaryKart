/**
 * Renders blog post blocks (see lib/blog.BlogBlock) as styled prose.
 *
 * Paragraphs support inline markdown links `[text](/path)`, parsed into
 * Next <Link> elements so internal links are client-navigated and pass
 * link equity. No dangerouslySetInnerHTML — content is always escaped.
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
      <Link key={key++} href={href} className="text-brand underline underline-offset-2 hover:opacity-80">
        {label}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return nodes;
}

export function BlogProse({ body }: { body: BlogBlock[] }) {
  return (
    <div className="max-w-[68ch]">
      {body.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2
                key={i}
                className="font-head text-[clamp(1.3rem,2.2vw,1.7rem)] font-bold text-ink mt-10 mb-4"
              >
                {block.text}
              </h2>
            );
          case 'p':
            return (
              <p key={i} className="text-[16px] leading-relaxed text-ink/85 mb-5">
                {renderInline(block.text)}
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className="list-disc pl-5 mb-6 space-y-2 text-[16px] leading-relaxed text-ink/85">
                {block.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            );
          case 'cta':
            return (
              <Link
                key={i}
                href={block.href}
                className="inline-flex items-center gap-2 my-4 px-5 py-3 rounded-lg bg-brand text-white font-semibold text-[15px] hover:opacity-90 transition"
              >
                {block.label} <span aria-hidden="true">→</span>
              </Link>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
