/**
 * PDP <title> builder. Lives here rather than in app/product/[sku]/page.tsx so
 * it can be run against every product and variant in the catalogue — a page
 * file cannot export helpers.
 *
 * Keyword: product names already carry the product type ("Electric UFO Burger
 * Machine", "Bain Marie with Glass") but lack the one high-intent modifier
 * restaurant/hotel buyers search — "Commercial" — so it is prepended unless
 * the name already has it. The clean product name stays the on-page H1.
 *
 * Length: Google truncates titles past ~60–65 chars. In order of preference:
 *   1. "Commercial <name> — <variant> — KitchenaryKart" when it all fits;
 *   2. drop the brand suffix (the brand is still in OG siteName + the domain);
 *   3. still too long, on a VARIANT page: keep the variant and shorten the
 *      name. The variant is the only thing that tells two sizes of one product
 *      apart — the old rule cut the whole string at 60, which dropped it from
 *      483 of 909 variant pages (2026-09-11), so every size carried the same
 *      <title>. The name is shortened at a descriptor separator first
 *      ("… Table Mats - (Quantity: 6pcs)"), then by dropping the added
 *      "Commercial", and only then at a word — cutting words off the end
 *      removes the product noun ("Bread Mould" -> "Bread"), which is the
 *      part a buyer actually searches;
 *   4. a page without a variant keeps the original rule: cut at a word.
 */
export const PDP_TITLE_MAX = 60;
export const PDP_BRAND_SUFFIX = ' — KitchenaryKart';

/** Shorter than this, a shortened name stops being readable. */
const MIN_NAME = 20;
/** Where a product name moves from "what it is" to "extra detail". */
const SEPARATORS = [' - ', ' | ', ' – ', ' — ', ' (', ', '];
/** Never end a title on one of these. */
const TRAILING = /[\s–—\-|,:;(\/]+$/;
/** ...nor on a word that only connects to what was cut off ("Basket with").
 *  Deliberately NOT "a" or "in": those end real names ("Type A", "12 in"). */
const DANGLING_WORD = /\s+(with|and|for|of|on|to|the|&|\+)$/i;
/** Where a long variant label can be shortened to its leading part. */
const LABEL_SEPARATORS = [' | ', ' / ', ', '];

function tidyEnd(s: string): string {
  let out = s.replace(TRAILING, '').trim();
  for (let prev = ''; prev !== out; ) {
    prev = out;
    out = out.replace(DANGLING_WORD, '').replace(TRAILING, '').trim();
  }
  return out;
}

/** Cut at the last word boundary inside `max`. */
function cutAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return tidyEnd(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut);
}

/** Every prefix of `s` that ends just before a separator, longest first. */
function headsAtSeparators(s: string): string[] {
  const at = new Set<number>();
  for (const sep of SEPARATORS) {
    for (let i = s.indexOf(sep); i > 0; i = s.indexOf(sep, i + 1)) at.add(i);
  }
  return [...at].sort((a, b) => b - a).map((i) => s.slice(0, i).replace(TRAILING, '').trim());
}

/** The longest readable version of the name that fits `room`. */
function shortenName(withKeyword: string, base: string, room: number): string {
  const fits = (x: string) => x.length >= MIN_NAME && x.length <= room;
  for (const h of headsAtSeparators(withKeyword)) if (fits(h)) return h;
  if (base !== withKeyword) {
    if (fits(base)) return base;
    for (const h of headsAtSeparators(base)) if (fits(h)) return h;
  }
  // Last resort, a word cut. Drop the added "Commercial" first: it frees 11
  // characters for the end of the name, where the product noun usually sits
  // ("… Electric HOT Bain Marie", not "Commercial … Electric HOT Bain").
  return cutAtWord(base !== withKeyword ? base : withKeyword, room);
}

/**
 * Some variants store their value as a JSON object even when the variant type
 * is not "Multi" (e.g. {"Size":"40L","Capacity":"40 litre"}), which put raw
 * JSON in the title. Show the values instead: "40L / 40 litre".
 */
function readableVariant(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith('{')) return s;
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj === 'object') {
      const vals = [...new Set(Object.values(obj).map((x) => String(x).trim()).filter(Boolean))];
      if (vals.length) return vals.join(' / ');
    }
  } catch {
    // not JSON after all — use as-is
  }
  return s;
}

export function pdpSeoTitle(name: string, variant = ''): string {
  const base = name.trim();
  const withKeyword = /\bcommercial\b/i.test(base) ? base : `Commercial ${base}`;
  let v = readableVariant(variant);
  // A label too long to leave room for a readable name keeps its leading part:
  // "Bowl Capacity: 7L | Dough Capacity: 1.25kg/Batch / 600W" -> "Bowl Capacity: 7L".
  // Dropping the whole label (the old outcome) gave all six planetary mixer
  // sizes the same title.
  if (v && PDP_TITLE_MAX - (v.length + 3) < MIN_NAME) {
    const cuts: number[] = [];
    for (const sep of LABEL_SEPARATORS) {
      for (let i = v.indexOf(sep); i > 0; i = v.indexOf(sep, i + 1)) cuts.push(i);
    }
    const label = v;
    const fit = cuts
      .sort((a, b) => b - a)
      .map((i) => label.slice(0, i).trim())
      .find((h) => PDP_TITLE_MAX - (h.length + 3) >= MIN_NAME);
    if (fit) v = fit;
  }
  const tail = v ? ` — ${v}` : '';

  if (withKeyword.length + tail.length + PDP_BRAND_SUFFIX.length <= PDP_TITLE_MAX) {
    return `${withKeyword}${tail}${PDP_BRAND_SUFFIX}`;
  }
  if (withKeyword.length + tail.length <= PDP_TITLE_MAX) return `${withKeyword}${tail}`;

  const room = PDP_TITLE_MAX - tail.length;
  if (tail && room >= MIN_NAME) {
    return `${shortenName(withKeyword, base, room) ?? cutAtWord(withKeyword, room)}${tail}`;
  }
  // No variant, or a variant so long the name would be unreadable: cut the whole string.
  return cutAtWord(`${withKeyword}${tail}`, PDP_TITLE_MAX);
}
