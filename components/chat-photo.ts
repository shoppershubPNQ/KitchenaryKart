'use client';

/**
 * Chat photos - loaded by components/ChatPanel with import() only when the
 * customer picks a photo, so it never adds weight to a page load.
 *
 * preparePhoto(): the photo the chat sends to the assistant. Decoded upright
 * (EXIF rotation), drawn on white (transparent PNGs would turn black as JPEG),
 * long side at most 1024 px, JPEG under ~300 KB. Drawing on a canvas also
 * drops the camera's EXIF / GPS data. Plus a small thumbnail (data URL) for the
 * chat bubbles and localStorage - the full photo is never stored in the browser.
 *
 * photoHints(): our catalogue matches from the site's existing photo search
 * (components/ImageSearchButton's in-browser MobileCLIP model + POST
 * /api/image-search, the same code path, the same shared model). Only the SKUs
 * go to the chat, as hints the admin re-checks. Never rejects: any failure
 * means no hints. Called only when a photo is SENT (never when it is picked),
 * and skipped on Data Saver / 2G / 3G: the first use in a browser downloads a
 * ~25 MB model and runs it on the main thread.
 *
 * Request contract (web <-> admin): scratchpad chatbot-mic-camera-notes.md, "Contract".
 */
import { canRunModel, decodePhoto, loadModel, modelLoaded, photoToSquare } from './ImageSearchButton';

/** Long side of the photo sent to the assistant (≈1,000-1,400 image tokens). */
const MAX_SIDE = 1024;
const FALLBACK_SIDE = 768;
const QUALITIES = [0.82, 0.72, 0.62];
const TARGET_BYTES = 300_000;
/** Never send more than this (the contract's client guarantee; the server caps at 420,000). */
export const PHOTO_MAX_BYTES = 400_000;
/** Refuse to even decode a bigger file (a phone photo is 2-12 MB). */
const INPUT_MAX_BYTES = 40 * 1024 * 1024;
const THUMB_SIDE = 240;
const THUMB_MAX_CHARS = 40_000;
export const MAX_PHOTO_HINTS = 8;
/** The catalogue's SKU characters (e.g. KKPB0060-H1/1-WBWOL, KKHE0141-288(C06), KKSP0154-GV+K). */
const SKU_RE = /^[A-Za-z0-9][A-Za-z0-9().+/_-]{0,79}$/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export type PhotoErrorCode = 'not_image' | 'too_big' | 'decode';

export type PreparedPhoto = {
  /** Base64 JPEG, no "data:" prefix. */
  data: string;
  bytes: number;
  width: number;
  height: number;
  /** Small JPEG data URL for the bubbles. */
  thumb: string;
  /** The JPEG itself (for the photo search). */
  jpeg: Blob;
};

function photoError(code: PhotoErrorCode): Error & { code: PhotoErrorCode } {
  const e = new Error(code) as Error & { code: PhotoErrorCode };
  e.code = code;
  return e;
}

/** The photo on a white canvas, scaled (never up) so its long side is at most `side`. */
function fit(src: CanvasImageSource, w: number, h: number, side: number): HTMLCanvasElement {
  const r = Math.min(1, side / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * r));
  c.height = Math.max(1, Math.round(h * r));
  const ctx = c.getContext('2d');
  if (!ctx) throw photoError('decode');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function toJpeg(c: HTMLCanvasElement, q: number): Promise<Blob> {
  return new Promise((ok, bad) => {
    try {
      c.toBlob((b) => (b ? ok(b) : bad(photoError('decode'))), 'image/jpeg', q);
    } catch {
      bad(photoError('decode'));
    }
  });
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((ok, bad) => {
    const r = new FileReader();
    r.onload = () => {
      const s = typeof r.result === 'string' ? r.result : '';
      const data = s.slice(s.indexOf(',') + 1);
      if (s.startsWith('data:') && BASE64_RE.test(data)) ok(data);
      else bad(photoError('decode'));
    };
    r.onerror = () => bad(photoError('decode'));
    r.readAsDataURL(b);
  });
}

function thumbnail(c: HTMLCanvasElement): string {
  for (const [side, q] of [[THUMB_SIDE, 0.7], [160, 0.6]] as const) {
    const url = fit(c, c.width, c.height, side).toDataURL('image/jpeg', q);
    if (url.startsWith('data:image/jpeg;base64,') && url.length <= THUMB_MAX_CHARS) return url;
  }
  throw photoError('decode');
}

/** Throws an Error with `code` ('not_image' | 'too_big' | 'decode'). */
export async function preparePhoto(file: Blob): Promise<PreparedPhoto> {
  if (file.type && !file.type.startsWith('image/')) throw photoError('not_image');
  if (file.size > INPUT_MAX_BYTES) throw photoError('too_big');
  let photo: Awaited<ReturnType<typeof decodePhoto>>;
  try {
    photo = await decodePhoto(file);
  } catch {
    throw photoError('decode');
  }
  try {
    let src: CanvasImageSource = photo.src;
    let w = photo.w;
    let h = photo.h;
    if (!w || !h) throw photoError('decode');
    // Halve big camera photos in steps first (as photoToSquare does) - one
    // 12 MP -> 1024 px jump aliases badly.
    while (Math.max(w, h) > MAX_SIDE * 2) {
      const c = document.createElement('canvas');
      c.width = Math.round(w / 2);
      c.height = Math.round(h / 2);
      const ctx = c.getContext('2d');
      if (!ctx) throw photoError('decode');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, c.width, c.height);
      src = c;
      w = c.width;
      h = c.height;
    }
    let best: { canvas: HTMLCanvasElement; blob: Blob } | null = null;
    outer: for (const side of [MAX_SIDE, FALLBACK_SIDE]) {
      const canvas = fit(src, w, h, side);
      for (const q of QUALITIES) {
        const blob = await toJpeg(canvas, q);
        if (!best || blob.size < best.blob.size) best = { canvas, blob };
        if (blob.size <= TARGET_BYTES) break outer;
      }
    }
    if (!best || best.blob.size > PHOTO_MAX_BYTES) throw photoError('too_big');
    const data = await blobToBase64(best.blob);
    return {
      data,
      bytes: best.blob.size,
      width: best.canvas.width,
      height: best.canvas.height,
      thumb: thumbnail(best.canvas),
      jpeg: best.blob,
    };
  } finally {
    photo.done();
  }
}

/** The photo-search model is already loaded in this page (the header's photo
 *  search shares it), so hints come back in about a second. */
export const hintsModelReady = (): boolean => modelLoaded();

/** Hints are worth the model download / CPU on this connection: not with Data
 *  Saver on, not on 2G / 3G (Network Information API; unknown = allowed). */
export function hintsAllowed(): boolean {
  try {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!c) return true;
    if (c.saveData === true) return false;
    return !/(^|-)(2g|3g)$/.test(String(c.effectiveType ?? ''));
  } catch {
    return true;
  }
}

/**
 * Up to 8 catalogue SKUs that look like the photo, best first, or [] (weak
 * match, no WebAssembly SIMD, Data Saver / slow connection, model download
 * failed, offline...). The first call downloads the ~25 MB model (then the
 * browser caches it); the header's photo search shares the same loaded model.
 * Once `signal` is aborted (the chat stopped waiting), the photo is not run
 * through the model any more - a download already under way still finishes and
 * is cached for the next photo, but no main-thread work is spent on this one.
 */
export async function photoHints(jpeg: Blob, signal?: AbortSignal): Promise<string[]> {
  try {
    if (!canRunModel() || !hintsAllowed() || signal?.aborted) return [];
    const embed = await loadModel();
    if (signal?.aborted) return [];
    const v = await embed(await photoToSquare(jpeg));
    if (signal?.aborted) return [];
    const res = await fetch('/api/image-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ v: v.map((x) => Math.round(x * 1e5) / 1e5) }),
      cache: 'no-store',
      signal,
    });
    if (!res.ok) return [];
    const d = (await res.json()) as { hits?: unknown; match?: unknown } | null;
    if (!d || (d.match !== 'strong' && d.match !== 'similar') || !Array.isArray(d.hits)) return [];
    const out: string[] = [];
    for (const hit of d.hits as { sku?: unknown }[]) {
      const sku = hit && typeof hit.sku === 'string' ? hit.sku : '';
      if (SKU_RE.test(sku) && !out.includes(sku)) out.push(sku);
      if (out.length >= MAX_PHOTO_HINTS) break;
    }
    return out;
  } catch {
    return [];
  }
}
