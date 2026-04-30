/**
 * Cache-busting endpoint.
 *
 * POST /api/revalidate?tag=banners
 * Body may omit — only the `tag` query param is read.
 *
 * Protected by a shared-secret header so only the admin panel can trigger
 * revalidation. Set `REVALIDATE_SECRET` in both web and admin .env to the
 * same value.
 */
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

const ALLOWED_TAGS = new Set([
  'banners',
  'category-tree',
  'category-counts',
  'collections',
  'policies',
  'social',
]);

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET || '';
  const header = req.headers.get('x-revalidate-secret') || '';
  // When no secret is configured we still allow local revalidation — useful
  // in dev. In prod you should set one.
  if (secret && secret !== header) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const tag = url.searchParams.get('tag') || '';
  if (!ALLOWED_TAGS.has(tag)) {
    return NextResponse.json({ error: 'Unknown tag' }, { status: 400 });
  }
  revalidateTag(tag);
  return NextResponse.json({ revalidated: true, tag });
}
