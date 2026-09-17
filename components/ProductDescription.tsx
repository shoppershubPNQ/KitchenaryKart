/**
 * Product description, rendered as real structure instead of one pre-line blob.
 *
 * Descriptions are plain text typed in admin. Until 2026-09-17 the page showed
 * them with `whitespace-pre-line`, which kept line breaks but nothing else: a
 * bullet that wrapped fell back under its "•", "Key Features" looked like body
 * text, and every paragraph had a ragged right edge (owner: "aage peeche right
 * ki line" — wanted both edges straight).
 *
 * The rules are deliberately conservative, because this renders every product:
 * a survey of the catalogue found 1,353 of 1,364 descriptions are a single
 * paragraph (→ one justified <p>, same words as before), 11 are paragraphs
 * separated by blank lines (→ <p> each), and only hand-formatted ones carry
 * headings or bullets. Nothing is guessed from ordinary prose.
 *
 *   blank line            → new block
 *   "• ", "* " or "- "    → bullet (consecutive bullets make one list)
 *   short line, no end punctuation, followed by bullets → heading
 *   "Label: text" (label ≤ 30 chars, starts capital)    → bold label
 *   first block: one short sentence, with more after it → lead line
 *
 * Justified from sm up only. On a phone-width column, justifying stretches the
 * gaps between words far more than a ragged edge costs.
 *
 * Server component — no JavaScript reaches the browser.
 */

const BULLET = /^\s*(?:[•*]|-(?=\s))\s+/;
// Label may start with a digit ("400 g Capacity:", "1880 W Rated Power:"). No
// commas allowed inside it, so ordinary prose ("Designed for cafés, hotels:")
// never gets a bold run-in.
const LABEL = /^([A-Z0-9][A-Za-z0-9 &/'’.-]{1,30}):\s+(.+)$/;

type Block =
  | { kind: 'lead'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'list'; items: string[] };

function parse(raw: string): Block[] {
  const chunks = raw
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((c) => c.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);

  const blocks: Block[] = [];
  chunks.forEach((lines, i) => {
    // A chunk can mix prose and bullets; walk it and group consecutive bullets.
    let prose: string[] = [];
    let items: string[] = [];
    const flushProse = () => {
      if (prose.length) blocks.push({ kind: 'para', text: prose.join(' ') });
      prose = [];
    };
    const flushItems = () => {
      if (items.length) blocks.push({ kind: 'list', items });
      items = [];
    };
    for (const line of lines) {
      if (BULLET.test(line)) {
        flushProse();
        items.push(line.replace(BULLET, ''));
      } else {
        flushItems();
        prose.push(line);
      }
    }
    flushProse();
    flushItems();

    const nextFirst = chunks[i + 1]?.[0] ?? '';
    const last = blocks[blocks.length - 1];
    if (last?.kind === 'para' && lines.length === 1) {
      const t = last.text;
      if (t.length <= 40 && !/[.!?:;,]$/.test(t) && BULLET.test(nextFirst)) {
        blocks[blocks.length - 1] = { kind: 'heading', text: t };
      } else if (i === 0 && chunks.length > 1 && t.length <= 80 && /[.!?]$/.test(t)) {
        blocks[blocks.length - 1] = { kind: 'lead', text: t };
      }
    }
  });
  return blocks;
}

/** "Care & Use: For dry grinding only…" → bold "Care & Use:" then the rest. */
function withLabel(text: string) {
  const m = text.match(LABEL);
  if (!m) return text;
  return (
    <>
      <strong className="font-semibold text-ink">{m[1]}:</strong> {m[2]}
    </>
  );
}

export function ProductDescription({ text }: { text: string }) {
  const blocks = parse(text);
  const justify = 'sm:text-justify hyphens-auto [text-justify:inter-word]';

  return (
    <div lang="en" className="max-w-[1100px] text-[15.5px] leading-[1.75] text-ink/85">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'lead':
            return (
              <p key={i} className="mb-3 font-head text-[17px] font-semibold leading-snug text-ink md:text-[18px]">
                {b.text}
              </p>
            );
          case 'heading':
            return (
              <h3 key={i} className="mb-2.5 mt-6 font-head text-[16px] font-bold text-ink md:text-[17px]">
                {b.text}
              </h3>
            );
          case 'list':
            return (
              <ul key={i} className="mb-5 space-y-2.5">
                {b.items.map((item, j) => (
                  // Hanging indent: the dot sits in the gutter, so a wrapped
                  // line lines up with the text above it, not under the dot.
                  <li key={j} className={`relative pl-6 ${justify}`}>
                    <span aria-hidden="true" className="absolute left-1 top-[0.72em] h-1.5 w-1.5 rounded-full bg-brand" />
                    {withLabel(item)}
                  </li>
                ))}
              </ul>
            );
          default:
            return (
              <p key={i} className={`mb-4 last:mb-0 ${justify}`}>
                {withLabel(b.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
