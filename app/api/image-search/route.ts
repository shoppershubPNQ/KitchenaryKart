/**
 * POST /api/image-search   body: { v: number[512] }
 *
 * Photo search. The browser turns the customer's photo into a 512-number
 * fingerprint (components/ImageSearchButton) and posts only that; we rank the
 * catalogue photos by similarity (lib/image-search) and answer with live
 * product cards — today's price, stock and photo from the cached search index,
 * so a product drafted or deleted since the index was built never shows.
 *
 * `match` tells the dialog how sure we are (thresholds measured 2026-10-06 on
 * phone-style snaps of our products, other people's photos of the same kinds
 * of equipment, and unrelated photos):
 *   strong  ≥ 0.72  the photographed product or its close siblings
 *   similar ≥ 0.45  the same kind of equipment, not necessarily the model
 *   weak    < 0.45  probably not something we sell (cats, cars, people: 0.20–0.37)
 * `looksLike` is the subcategory most of the top matches share, so the dialog
 * can offer "see all Waffle Makers".
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSearchIndex, type SearchIndexItem } from '@/lib/products';
import { IMAGE_SEARCH_DIM, imageIndexMatchesModel, matchImage } from '@/lib/image-search';

export const dynamic = 'force-dynamic';

const STRONG = 0.72;
const WEAK = 0.45;
/** Keep matches within this of the best one… */
const GAP = 0.2;
/** …but always show at least this many (fewer for a weak match), at most MAX. */
const MIN_HITS = 12;
const WEAK_HITS = 8;
const MAX_HITS = 24;
/**
 * Spare-part listings often show the whole machine (or its plates), so a photo
 * of a machine can match its spares first. Order spares slightly lower; a photo
 * of the actual part still matches its spare far better than any machine.
 */
const SPARE_PENALTY = 0.04;

type ImageHit = {
  sku: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
  subcategory: string | null;
  stock: number;
  score: number;
};

const isSpare = (i: SearchIndexItem) => /^spares? for\b/i.test(i.name) || /^spares?\b/i.test(i.subcategory ?? '');

export async function POST(req: NextRequest) {
  if (!imageIndexMatchesModel) {
    console.error('image-search: data/image-search-index.json was built with a different model/dtype than the browser runs — rebuild it');
    return NextResponse.json({ error: 'Photo search is unavailable' }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const raw = (body as { v?: unknown })?.v;
  if (
    !Array.isArray(raw) ||
    raw.length !== IMAGE_SEARCH_DIM ||
    !raw.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e4)
  ) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const q = Float32Array.from(raw as number[]);
  const norm = Math.hypot(...q);
  if (!norm || !Number.isFinite(norm)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  for (let k = 0; k < q.length; k++) q[k] /= norm;

  const index = await getSearchIndex();
  const byParent = new Map<string, SearchIndexItem[]>();
  for (const item of index) {
    const list = byParent.get(item.parent);
    if (list) list.push(item);
    else byParent.set(item.parent, [item]);
  }

  // Resolve each matched product to a live card, skipping ones drafted/deleted since the build.
  const live: { item: SearchIndexItem; score: number; rank: number }[] = [];
  for (const m of matchImage(q, 120)) {
    const items = byParent.get(m.sku);
    if (!items) continue;
    // A size's own photo → that size. The shared product photo → a size the
    // customer can buy (the product's own row first), not a sold-out one.
    const item =
      (m.variant && items.find((i) => i.sku === m.variant)) ||
      items.find((i) => i.sku === m.sku && i.stock > 0) ||
      items.find((i) => i.stock > 0) ||
      items.find((i) => i.sku === m.sku) ||
      items[0];
    live.push({ item, score: m.score, rank: m.score - (isSpare(item) ? SPARE_PENALTY : 0) });
  }
  // Listings sharing the very same photo tie exactly — the one in stock goes first.
  live.sort((a, b) => b.rank - a.rank || Number(b.item.stock > 0) - Number(a.item.stock > 0));

  // How sure we are comes from the best raw score, not from the spare-penalised order.
  const best = live.reduce((m, h) => Math.max(m, h.score), 0);
  const match: 'strong' | 'similar' | 'weak' = best >= STRONG ? 'strong' : best >= WEAK ? 'similar' : 'weak';
  const floor = match === 'weak' ? WEAK_HITS : MIN_HITS;
  const kept = live.filter((h, i) => i < floor || h.score >= best - GAP).slice(0, match === 'weak' ? WEAK_HITS : MAX_HITS);

  // Sold-out last (the store's listing rule) — except the closest match, which
  // is most likely the very product in the photo.
  const ordered = kept.length > 1
    ? [kept[0], ...kept.slice(1).filter((h) => h.item.stock > 0), ...kept.slice(1).filter((h) => h.item.stock <= 0)]
    : kept;

  const hits: ImageHit[] = ordered.map(({ item, score }) => ({
    sku: item.sku,
    name: item.name,
    price: item.price,
    imageUrl: item.imageUrl,
    category: item.category,
    subcategory: item.subcategory,
    stock: item.stock,
    score: Math.round(score * 1000) / 1000,
  }));

  // Score-weighted vote over the closest few products.
  let looksLike: { category: string; subcategory: string } | null = null;
  if (match !== 'weak') {
    const votes = new Map<string, { category: string; subcategory: string; w: number }>();
    let total = 0;
    for (const { item, score } of kept.slice(0, 8)) {
      if (!item.category || !item.subcategory) continue;
      const key = `${item.category}\u0000${item.subcategory}`;
      total += score;
      const cur = votes.get(key);
      if (cur) cur.w += score;
      else votes.set(key, { category: item.category, subcategory: item.subcategory, w: score });
    }
    const top = [...votes.values()].sort((a, b) => b.w - a.w)[0];
    if (top && top.w / total >= 0.5) looksLike = { category: top.category, subcategory: top.subcategory };
  }

  return NextResponse.json({ hits, looksLike, match }, { headers: { 'Cache-Control': 'no-store' } });
}
