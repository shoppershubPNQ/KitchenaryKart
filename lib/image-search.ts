/**
 * Search the catalogue by photo — server half.
 *
 * Every product photo (main + second photo + each size's own photo) was turned
 * into a 512-number "fingerprint" by the MobileCLIP-S0 image model (fp16) and
 * stored in data/image-search-index.json. The customer's phone runs the SAME
 * model on their photo (components/ImageSearchButton) and posts only its
 * fingerprint here; we rank catalogue photos by cosine similarity and keep the
 * best photo per product. The customer's photo itself never leaves the device.
 *
 * Rebuild the index after adding products / changing photos:
 *   cd admin && npx tsx scripts/build-image-search-index.ts   (then deploy web)
 * Products deleted or drafted since the last build simply drop out (the route
 * only returns products still in the live search index); new products are
 * invisible to photo search until a rebuild.
 */
import data from '@/data/image-search-index.json';
import { IMAGE_MODEL_DTYPE, IMAGE_MODEL_ID } from './image-search-model';

interface IndexFile {
  model: string;
  dtype: string;
  dim: number;
  built: string;
  /** Product (parent) SKU of each photo row. */
  p: string[];
  /** Size SKU when the photo is that size's own photo, else null. */
  v: (string | null)[];
  /** Row-major Int8 fingerprints (each L2-normalised, ×127), base64. */
  vecs: string;
}

const index = data as IndexFile;

export const IMAGE_SEARCH_DIM = index.dim;

/**
 * False when the index was built with a different model/dtype than the browser
 * runs — its fingerprints would rank nonsense, so the route refuses instead.
 */
export const imageIndexMatchesModel = index.model === IMAGE_MODEL_ID && index.dtype === IMAGE_MODEL_DTYPE;

let matrix: Int8Array | null = null;
function vectors(): Int8Array {
  if (!matrix) {
    const buf = Buffer.from(index.vecs, 'base64');
    matrix = new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  return matrix;
}

export interface ImageMatch {
  /** Product (parent) SKU. */
  sku: string;
  /** The size whose own photo matched best, if any. */
  variant: string | null;
  /** Cosine similarity, about -1..1 (same product photo ≈ 0.9+). */
  score: number;
}

/** Best-matching photo per product, highest first. `q` must be L2-normalised. */
export function matchImage(q: Float32Array, limit: number): ImageMatch[] {
  const m = vectors();
  const dim = index.dim;
  const best = new Map<string, ImageMatch>();
  for (let i = 0, o = 0; i < index.p.length; i++, o += dim) {
    let s = 0;
    for (let k = 0; k < dim; k++) s += m[o + k] * q[k];
    s /= 127;
    const sku = index.p[i];
    const cur = best.get(sku);
    if (!cur || s > cur.score) best.set(sku, { sku, variant: index.v[i], score: s });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
