import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

/**
 * Resolved collection rules for the home page. Indexed by slug so callers
 * can quickly look up which subcategories belong under "bestsellers" /
 * "new-arrivals". When a slug isn't configured (or has no subs), the value
 * is `null` and callers fall back to their default behaviour.
 */
export interface CollectionRule {
  slug: string;
  name: string;
  /** Legacy: subcategory names admin used to pick (still read for back-compat). */
  subcategories: string[];
  /** New: explicit list of product SKUs admin curated for this collection. */
  productSkus: string[];
  isActive: boolean;
}

function strList(raw: unknown): string[] {
  return Array.isArray(raw)
    ? (raw as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
}

async function _getCollections(): Promise<Record<string, CollectionRule>> {
  const rows = await prisma.collection.findMany();
  const out: Record<string, CollectionRule> = {};
  for (const r of rows) {
    out[r.slug] = {
      slug: r.slug,
      name: r.name,
      subcategories: strList(r.subcategories),
      productSkus: strList((r as any).productSkus),
      isActive: r.isActive,
    };
  }
  return out;
}

/** 5-minute cache; busted by admin via /api/revalidate?tag=collections. */
export const getCollections = unstable_cache(
  _getCollections,
  ['kk:collections'],
  { revalidate: 300, tags: ['collections'] },
);
