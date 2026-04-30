/**
 * Serves product images that live in the sibling `website/images/` folder.
 *
 * Perf notes:
 *  - Disk reads are wrapped in a small in-process LRU so hot images (home
 *    page cards, category tiles) are served straight from memory. Capped at
 *    ~64 MB total so we don't balloon memory in dev.
 *  - Cache-Control uses a one-year max-age with `immutable`. Files here are
 *    addressed by SKU; when an image changes we bump its filename.
 *  - Strong ETag + 304 short-circuit to avoid shipping bytes when the
 *    browser already has a valid copy.
 */
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';

const ROOT = path.resolve(process.cwd(), '..', 'website', 'images');

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const MAX_CACHE_BYTES = 64 * 1024 * 1024;

interface CacheEntry {
  buffer: Buffer;
  mime: string;
  etag: string;
}

// Tiny LRU — Map preserves insertion order, so bumping an entry on hit keeps
// the oldest at the head for eviction.
const cache = new Map<string, CacheEntry>();
let cachedBytes = 0;

function readAndCache(fullPath: string): CacheEntry | null {
  const hit = cache.get(fullPath);
  if (hit) {
    // Bump recency.
    cache.delete(fullPath);
    cache.set(fullPath, hit);
    return hit;
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(fullPath);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;
  const buffer = fs.readFileSync(fullPath);
  const mime = MIME[path.extname(fullPath).toLowerCase()] ?? 'application/octet-stream';
  const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const entry: CacheEntry = { buffer, mime, etag };

  cache.set(fullPath, entry);
  cachedBytes += buffer.length;

  // Evict oldest entries until we're under the budget.
  while (cachedBytes > MAX_CACHE_BYTES) {
    const firstKey = cache.keys().next().value;
    if (!firstKey) break;
    const evicted = cache.get(firstKey)!;
    cachedBytes -= evicted.buffer.length;
    cache.delete(firstKey);
  }
  return entry;
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const rel = params.path.map(decodeURIComponent).join('/');
    const full = path.resolve(ROOT, rel);
    if (!full.startsWith(ROOT)) {
      return new Response('Forbidden', { status: 403 });
    }
    const entry = readAndCache(full);
    if (!entry) return new Response('Not found', { status: 404 });

    // 304 short-circuit — saves re-sending the body when the client's copy
    // is still valid.
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: entry.etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new Response(new Uint8Array(entry.buffer), {
      status: 200,
      headers: {
        'Content-Type': entry.mime,
        'Content-Length': String(entry.buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: entry.etag,
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
