/**
 * GET /api/search?q=<query>&limit=<n>
 *
 * Lightweight live-search endpoint that powers the header autocomplete
 * dropdown. Returns a small JSON payload of matching products (sku,
 * name, price, imageUrl, category) so the dropdown can render
 * thumbnails + prices without a second fetch.
 *
 * Matches the same fields as the full shop search:
 *   - Product.name        ILIKE %q%
 *   - Product.sku         ILIKE %q%
 *   - Product.subcategory ILIKE %q%
 *   - ProductVariant.skuSuffix ILIKE %q%   (variant SKU search)
 *
 * Variants are NOT flattened on the server side here — that would
 * double the payload for very little autocomplete value. If the buyer
 * presses enter / clicks "See all results", they land on /shop?q=...
 * which uses the variant-flattened list anyway.
 *
 * Cached for 60 s on the edge — a typo'd query won't re-hit Neon on
 * every keystroke from the same network.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    const q = (url.searchParams.get('q') || '').trim();
    const limit = Math.min(
      12,
      Math.max(1, parseInt(url.searchParams.get('limit') || '6', 10)),
    );

    // Empty query → empty hits. Don't return the entire catalog by accident.
    if (q.length < 2) {
      return NextResponse.json({ q, hits: [] as SearchHit[] });
    }

    const rows = await prisma.product.findMany({
      where: {
        status: 'active',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { subcategory: { contains: q, mode: 'insensitive' } },
          {
            variants: {
              some: {
                skuSuffix: { contains: q, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      orderBy: [
        // Boost in-stock products to the top of the dropdown.
        { stock: 'desc' },
        { name: 'asc' },
      ],
      take: limit,
      select: {
        sku: true,
        name: true,
        price: true,
        imageUrl: true,
        category: true,
      },
    });

    const hits: SearchHit[] = rows.map((r) => ({
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
