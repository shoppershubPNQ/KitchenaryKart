import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';
import { getProductBySku, type PublicProductWithVariants } from './products';

/* ---------- public shapes ---------- */

export interface SpotlightSpec { label: string; value: string }
export interface SpotlightWhyBuy { title: string; text: string }
export interface SpotlightCmpRow { feature: string; kk: string; others: string }

export interface SpotlightContent {
  id: number;
  slug: string;
  productSku: string;
  eyebrow: string | null;
  headline: string | null;
  videoUrl: string | null;
  videoPoster: string | null;
  keyFeatures: string[];
  specifications: SpotlightSpec[];
  packagingIncludes: string[];
  idealFor: string[];
  whyBuy: SpotlightWhyBuy[];
  comparison: { rows: SpotlightCmpRow[] };
  careDisposal: string | null;
  description: string | null;
}

/** Content + the live product it features (price/stock/images). `product` is
 *  null if the linked SKU no longer resolves. */
export interface SpotlightWithProduct {
  content: SpotlightContent;
  product: PublicProductWithVariants | null;
}

/* ---------- tolerant JSON parsers (mirror lib/products.parseFaqs) ---------- */

function strArray(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? safeJson(v) : [];
  return (Array.isArray(arr) ? arr : []).map((x) => String(x ?? '').trim()).filter(Boolean);
}
function specArray(v: unknown): SpotlightSpec[] {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? safeJson(v) : [];
  return (Array.isArray(arr) ? arr : [])
    .map((x: any) => ({ label: String(x?.label ?? '').trim(), value: String(x?.value ?? '').trim() }))
    .filter((x) => x.label || x.value);
}
function whyArray(v: unknown): SpotlightWhyBuy[] {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? safeJson(v) : [];
  return (Array.isArray(arr) ? arr : [])
    .map((x: any) => ({ title: String(x?.title ?? '').trim(), text: String(x?.text ?? '').trim() }))
    .filter((x) => x.title || x.text);
}
function cmpRows(v: unknown): SpotlightCmpRow[] {
  const obj = typeof v === 'string' ? safeJson(v) : v;
  const rows = (obj as any)?.rows;
  return (Array.isArray(rows) ? rows : [])
    .map((x: any) => ({ feature: String(x?.feature ?? '').trim(), kk: String(x?.kk ?? '').trim(), others: String(x?.others ?? '').trim() }))
    .filter((x) => x.feature || x.kk || x.others);
}
function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return []; }
}

function toContent(row: any): SpotlightContent {
  return {
    id: row.id,
    slug: row.slug,
    productSku: row.productSku,
    eyebrow: row.eyebrow ?? null,
    headline: row.headline ?? null,
    videoUrl: row.videoUrl ?? null,
    videoPoster: row.videoPoster ?? null,
    keyFeatures: strArray(row.keyFeatures),
    specifications: specArray(row.specifications),
    packagingIncludes: strArray(row.packagingIncludes),
    idealFor: strArray(row.idealFor),
    whyBuy: whyArray(row.whyBuy),
    comparison: { rows: cmpRows(row.comparison) },
    careDisposal: row.careDisposal ?? null,
    description: row.description ?? null,
  };
}

/* ---------- cached row reads (tag 'spotlight') ---------- */

const _rowBySlug = unstable_cache(
  async (slug: string) => {
    const row = await prisma.spotlight.findFirst({ where: { slug, isActive: true } });
    return row ? toContent(row) : null;
  },
  ['kk:spotlight-by-slug'],
  { revalidate: 300, tags: ['spotlight'] },
);

const _activeRows = unstable_cache(
  async () => {
    const rows = await prisma.spotlight.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      take: 5,
    });
    return rows.map(toContent);
  },
  ['kk:spotlight-active'],
  { revalidate: 300, tags: ['spotlight'] },
);

/* ---------- public API (hydrates live product at request time) ---------- */

/** The dedicated /featured/<slug> page. Null if no active spotlight for slug. */
export async function getSpotlightBySlug(slug: string): Promise<SpotlightWithProduct | null> {
  const content = await _rowBySlug(slug);
  if (!content) return null;
  // getProductBySku is separately cached under the 'products' tag, so live
  // price/stock stay in sync without re-caching them under 'spotlight'.
  const product = await getProductBySku(content.productSku);
  return { content, product };
}

/** The first active spotlight — for the home page teaser. Null if none. */
export async function getHomeSpotlight(): Promise<SpotlightWithProduct | null> {
  const rows = await _activeRows();
  if (rows.length === 0) return null;
  const content = rows[0];
  const product = await getProductBySku(content.productSku);
  return { content, product };
}
