import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPolicyBySlug } from '@/lib/policies';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await getPolicyBySlug(params.slug);
  if (!p) return { title: 'Not found — KitchenaryKart' };
  return {
    title: `${p.title} — KitchenaryKart`,
    description: p.body.slice(0, 160).replace(/\s+/g, ' '),
  };
}

/**
 * Lightweight markdown-ish block parser. Splits the body on blank lines,
 * then for each block detects sub-headings (`## …`), bullet lists
 * (`- `, `* `, `• `), or numbered lists (`1. `, `2. `, …). Anything else
 * renders as a paragraph. Keeps the editor as a plain textarea while
 * still letting the public page show real lists and section breaks.
 */
type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

function parseBody(raw: string): Block[] {
  const blocks: Block[] = [];
  const groups = raw.split(/\n{2,}/);
  for (const group of groups) {
    const lines = group.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines.length === 1 && /^##\s+/.test(lines[0])) {
      blocks.push({ kind: 'h2', text: lines[0].replace(/^##\s+/, '') });
      continue;
    }
    const allBullet = lines.every((l) => /^[-*•]\s+/.test(l));
    if (allBullet) {
      blocks.push({
        kind: 'ul',
        items: lines.map((l) => l.replace(/^[-*•]\s+/, '')),
      });
      continue;
    }
    const allNumber = lines.every((l) => /^\d+[.)]\s+/.test(l));
    if (allNumber) {
      blocks.push({
        kind: 'ol',
        items: lines.map((l) => l.replace(/^\d+[.)]\s+/, '')),
      });
      continue;
    }
    blocks.push({ kind: 'p', text: lines.join(' ') });
  }
  return blocks;
}

export default async function PolicyPage({
  params,
}: {
  params: { slug: string };
}) {
  const policy = await getPolicyBySlug(params.slug);
  if (!policy) notFound();

  const blocks = parseBody(policy.body);

  return (
    <div className="bg-bg-soft">
      <nav className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-4 text-xs text-muted flex items-center gap-2 flex-wrap">
        <Link href="/" className="hover:text-brand">Home</Link>
        <span className="opacity-60">/</span>
        <span className="text-ink font-medium">{policy.title}</span>
      </nav>

      <div className="max-w-[900px] mx-auto px-[6mm] md:px-[1.5cm] pb-20 pt-2">
        <article className="bg-white rounded-xl border border-line shadow-sm px-6 sm:px-12 py-10">
          {/* Brand-red top accent */}
          <div className="h-1 w-16 bg-brand rounded mb-6" />
          <h1 className="font-head text-[clamp(1.8rem,3vw,2.4rem)] text-ink mb-8">
            {policy.title}
          </h1>

          {blocks.length === 0 ? (
            <p className="text-muted italic">
              This policy hasn&rsquo;t been written yet. Please check back soon.
            </p>
          ) : (
            <div className="space-y-5 text-[15px] leading-7 text-ink-soft font-bold">
              {blocks.map((b, i) => {
                if (b.kind === 'h2') {
                  return (
                    <h2
                      key={i}
                      className="font-head text-[clamp(1.05rem,1.4vw,1.25rem)] text-ink mt-8 mb-2 pt-2"
                    >
                      {b.text}
                    </h2>
                  );
                }
                if (b.kind === 'ul') {
                  return (
                    <ul key={i} className="space-y-2 ml-2">
                      {b.items.map((it, j) => (
                        <li key={j} className="flex gap-3">
                          <span
                            className="flex-shrink-0 mt-[0.55em] w-1.5 h-1.5 rounded-full bg-brand"
                            aria-hidden="true"
                          />
                          <span className="flex-1 whitespace-pre-line">{it}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                if (b.kind === 'ol') {
                  return (
                    <ol key={i} className="space-y-2 ml-2 list-decimal list-inside marker:text-brand marker:font-extrabold">
                      {b.items.map((it, j) => (
                        <li key={j} className="whitespace-pre-line pl-1">
                          {it}
                        </li>
                      ))}
                    </ol>
                  );
                }
                return (
                  <p key={i} className="whitespace-pre-line">
                    {b.text}
                  </p>
                );
              })}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
