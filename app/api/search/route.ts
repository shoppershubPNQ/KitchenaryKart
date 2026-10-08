/**
 * GET /api/search?q=<query>&limit=<n>
 *
 * Lightweight live-search endpoint that powers the header autocomplete
 * dropdown. Returns a small JSON payload of matching products (sku,
 * name, price, imageUrl, category) so the dropdown can render
 * thumbnails + prices without a second fetch.
 *
 * SMART SEARCH: instead of a raw `ILIKE %q%` (which can't tolerate a typo),
 * this ranks a cached in-memory index with the shared fuzzy ranker
 * (`lib/search`). Correct spellings surface the most accurate match first;
 * misspellings ("kettel") still surface similar products ("kettle"). The
 * index is variant-flattened, so a variant SKU / composed name resolves too —
 * matching what /shop?q=... shows.
 *
 * Cached for 60 s on the edge; the underlying index is itself cached 5 min
 * server-side, so keystroke-frequency queries rank in memory rather than
 * re-hitting Neon.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSearchIndex } from '@/lib/products';
import { getCollections } from '@/lib/collections';
import { MAX_QUERY_CHARS, rankItems } from '@/lib/search';
import { collectionIntent } from '@/lib/search-intent';

export const revalidate = 60;

type SearchHit = {
  sku: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // Capped (see MAX_QUERY_CHARS): a long spoken sentence would cost an
    // edit-distance pass per extra word on every keystroke-rate request.
    const q = (url.searchParams.get('q') || '').trim().slice(0, MAX_QUERY_CHARS);
    const limit = Math.min(
      12,
      Math.max(1, parseInt(url.searchParams.get('limit') || '6', 10)),
    );

    // Min 3 chars. Was 2, raised to 3 because 2-char queries match too
    // much ("le", "ba", "ic") — high DB cost, low autocomplete value.
    if (q.length < 3) {
      return NextResponse.json({ q, hits: [] as SearchHit[] });
    }

    const index = await getSearchIndex();
    // "top selling" / "बेस्ट सेलर" / "new arrivals" → that list, as on /shop (lib/search-intent.ts): the
    // curated SKUs in the curator's order, else the product flags; one row per product, sold-out last.
    const intent = collectionIntent(q);
    let ranked: typeof index = [];
    if (intent) {
      const rule = (await getCollections())[intent];
      const curated = rule && rule.isActive !== false ? rule.productSkus : [];
      const flag = intent === 'bestsellers' ? 'isBestseller' : 'isNewArrival';
      const parents = curated.length ? curated : [...new Set(index.filter((r) => r[flag]).map((r) => r.parent))];
      ranked = parents
        .flatMap((sku) => index.find((r) => r.sku === sku) ?? index.find((r) => r.parent === sku) ?? [])
        .sort((a, b) => (a.stock > 0 ? 0 : 1) - (b.stock > 0 ? 0 : 1));
    }
    if (!ranked.length) ranked = rankItems(index, q);
    ranked = ranked.slice(0, limit);

    const hits: SearchHit[] = ranked.map((r) => ({
      sku: r.sku,
      name: r.name,
      price: Number(r.price),
      imageUrl: r.imageUrl,
      category: r.category,
    }));

    return NextResponse.json(
      { q, hits },
      {
        headers: {
          // Edge-cache for 60 s, allow stale for 5 min while we revalidate.
          'Cache-Control':
            'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (e) {
    // Don't 500 the dropdown — degrade gracefully to empty hits so the
    // input still works.
    return NextResponse.json(
      { q: '', hits: [] as SearchHit[], error: (e as Error).message },
      { status: 200 },
    );
  }
}
