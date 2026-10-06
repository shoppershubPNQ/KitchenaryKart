'use client';

/**
 * Camera button for the search bar — find products from a photo.
 *
 * The customer takes a photo (phone camera) or uploads / drops / pastes one.
 * We fit it onto a white square, the way every catalogue photo was prepared,
 * and run the MobileCLIP-S0 image model IN THE BROWSER (transformers.js from
 * jsDelivr, weights from Hugging Face; ~25 MB the first time, then cached by
 * the browser). Only the resulting 512-number fingerprint goes to
 * /api/image-search — the photo itself is never uploaded.
 *
 * The model and dtype MUST match the catalogue index — both come from
 * lib/image-search-model. The download starts only when the customer reaches
 * for a photo (Take / Upload / drop / paste), never just from opening the dialog.
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { imgSrc, inr } from '@/lib/format';
import { IMAGE_MODEL_DTYPE, IMAGE_MODEL_ID } from '@/lib/image-search-model';
import { isPlainClick, useBackdropClose, useModal } from './useModal';

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
const SIDE = 320;

type Hit = {
  sku: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
  subcategory: string | null;
  stock: number;
  score: number;
};
type Match = 'strong' | 'similar' | 'weak';
type Result = { hits: Hit[]; looksLike: { category: string; subcategory: string } | null; match: Match };
type Phase = 'pick' | 'working' | 'results';

const HEADINGS: Record<Match, string> = {
  strong: 'Matching products',
  similar: 'Similar products',
  weak: 'No close match — closest products',
};

/* ---- the model: loaded once per page, shared by every button instance ---- */

type Embed = (canvas: HTMLCanvasElement) => Promise<number[]>;
let embedPromise: Promise<Embed> | null = null;
let loadAttempts = 0;
let onModelProgress: ((pct: number) => void) | null = null;

/** Rejects with an Error whose name is 'LoadError' when the library or model can't be downloaded. */
function loadModel(): Promise<Embed> {
  if (!embedPromise) {
    embedPromise = (async () => {
      // A failed import() stays failed for that URL for the life of the page, so
      // a retry asks for a fresh URL.
      const url = TRANSFORMERS_URL + (loadAttempts++ ? `?retry=${loadAttempts}` : '');
      try {
        const t: any = await import(/* webpackIgnore: true */ url);
        t.env.allowLocalModels = false;
        if (loadAttempts > 1) {
          // onnxruntime import()s its own glue file from a fixed URL — bust that too on a retry.
          const base = TRANSFORMERS_URL.replace(/[^/]+$/, '');
          t.env.backends.onnx.wasm.wasmPaths = {
            mjs: `${base}ort-wasm-simd-threaded.jsep.mjs?retry=${loadAttempts}`,
            wasm: `${base}ort-wasm-simd-threaded.jsep.wasm`,
          };
        }
        // Progress of the model weights only — the small config files would read
        // as 100% before the ~23 MB download even starts.
        const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status !== 'progress' || !p.file?.endsWith('.onnx') || !p.total) return;
          onModelProgress?.(Math.min(100, Math.round((100 * (p.loaded ?? 0)) / p.total)));
        };
        const [processor, model] = await Promise.all([
          t.AutoProcessor.from_pretrained(IMAGE_MODEL_ID, { progress_callback }),
          t.CLIPVisionModelWithProjection.from_pretrained(IMAGE_MODEL_ID, { dtype: IMAGE_MODEL_DTYPE, device: 'wasm', progress_callback }),
        ]);
        return async (canvas: HTMLCanvasElement) => {
          const { image_embeds } = await model(await processor(t.RawImage.fromCanvas(canvas)));
          return Array.from(image_embeds.data as Float32Array);
        };
      } catch (e) {
        const err = new Error(String((e as Error)?.message ?? e));
        err.name = 'LoadError';
        throw err;
      }
    })();
    // A failed download (offline, blocked CDN) may be retried on the next try.
    embedPromise.catch(() => { embedPromise = null; });
  }
  return embedPromise;
}

/** The model needs WebAssembly with SIMD (every current phone browser has it). */
function canRunModel(): boolean {
  try {
    return typeof WebAssembly === 'object' && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
  } catch {
    return false;
  }
}

/**
 * Decode the photo, upright per the camera's EXIF rotation. createImageBitmap
 * decodes off-screen; img.decode() would wait while the page is hidden (as it
 * briefly is when a phone returns from the camera app), so it's only the fallback.
 */
async function decodePhoto(file: Blob): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { src: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('decode')); img.src = url; });
      return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => {} };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Fit the photo on a white square, the way every catalogue photo was prepared. */
async function photoToSquare(file: Blob): Promise<HTMLCanvasElement> {
  const photo = await decodePhoto(file);
  try {
    let src: CanvasImageSource = photo.src;
    let w = photo.w, h = photo.h;
    if (!w || !h) throw new Error('empty image');
    // Halve big camera photos in steps — one 12 MP → 320 px jump aliases badly.
    while (Math.max(w, h) > SIDE * 2) {
      const c = document.createElement('canvas');
      c.width = Math.round(w / 2); c.height = Math.round(h / 2);
      c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
      src = c; w = c.width; h = c.height;
    }
    const out = document.createElement('canvas');
    out.width = out.height = SIDE;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SIDE, SIDE);
    ctx.imageSmoothingQuality = 'high';
    const r = Math.min(SIDE / w, SIDE / h);
    ctx.drawImage(src, (SIDE - w * r) / 2, (SIDE - h * r) / 2, w * r, h * r);
    return out;
  } finally {
    photo.done();
  }
}

export function ImageSearchButton({
  className = '',
  iconSize = 20,
  onNavigate,
}: {
  className?: string;
  iconSize?: number;
  /** Called when a result link is followed — e.g. the menu drawer closes itself. */
  onNavigate?: () => void;
}) {
  const [supported, setSupported] = useState(true);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('pick');
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<'model' | 'match'>('model');
  const [pct, setPct] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [touch, setTouch] = useState(false);
  const runRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSupported(canRunModel());
    setTouch(window.matchMedia?.('(pointer: coarse)').matches ?? false);
    return () => { if (onModelProgress === setPct) onModelProgress = null; };
  }, []);

  const close = useCallback(() => {
    runRef.current++; // ignore any search still running
    setOpen(false);
    setDragging(false);
  }, []);
  useModal(open, dialogRef, close);
  const backdrop = useBackdropClose(close);
  const followLink = (e: MouseEvent) => {
    if (!isPlainClick(e)) return; // new tab: keep the results here
    close();
    onNavigate?.();
  };

  const reset = () => {
    runRef.current++;
    setPhase('pick'); setPreview(null); setResult(null); setError(null); setPct(null);
  };

  const openDialog = () => {
    reset();
    setOpen(true);
  };

  /** Start downloading the model while the customer frames / picks the photo. */
  const prefetch = () => {
    onModelProgress = setPct;
    loadModel().catch(() => { /* reported when they search */ });
  };

  const search = useCallback(async (file: Blob) => {
    const run = ++runRef.current;
    const fail = (msg: string) => {
      if (run !== runRef.current) return;
      setPreview(null); setResult(null); setPhase('pick'); setError(msg);
    };
    if (file.type && !file.type.startsWith('image/')) return fail('Please choose a photo (JPG or PNG).');
    let canvas: HTMLCanvasElement;
    try {
      canvas = await photoToSquare(file);
    } catch {
      return fail('We couldn\'t open this photo. Please try a JPG or PNG photo.');
    }
    if (run !== runRef.current) return;
    setError(null); setResult(null);
    setPreview(canvas.toDataURL('image/jpeg', 0.85));
    setPhase('working');
    setStep('model');
    onModelProgress = setPct;
    let embed: Embed;
    try {
      embed = await loadModel();
    } catch {
      return fail('Photo search could not load. Please check your internet connection and try again.');
    }
    if (run !== runRef.current) return;
    try {
      setStep('match');
      const v = await embed(canvas);
      const res = await fetch('/api/image-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ v: v.map((x) => Math.round(x * 1e5) / 1e5) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Result;
      if (run !== runRef.current) return;
      setResult({
        hits: Array.isArray(data.hits) ? data.hits : [],
        looksLike: data.looksLike ?? null,
        match: data.match === 'strong' || data.match === 'similar' ? data.match : 'weak',
      });
      setPhase('results');
    } catch {
      fail('Photo search didn\'t work this time. Please try again — if it keeps failing, reload the page.');
    }
  }, []);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // picking the same photo again must fire again
    if (f) void search(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('image/'));
    if (f) void search(f);
  };

  // A pasted image (Ctrl+V) searches too.
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); void search(f); }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [open, search]);

  if (!supported) return null;

  const pickButtons = (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      {touch && (
        <button type="button" onClick={() => { prefetch(); cameraRef.current?.click(); }} className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-brand text-white font-semibold hover:opacity-90">
          <CameraIcon size={18} /> Take a photo
        </button>
      )}
      <button
        type="button"
        onClick={() => { prefetch(); uploadRef.current?.click(); }}
        className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full font-semibold ${touch ? 'border border-line text-ink hover:border-brand hover:text-brand' : 'bg-brand text-white hover:opacity-90'}`}
      >
        <UploadIcon size={18} /> {touch ? 'Pick from gallery' : 'Choose a photo'}
      </button>
    </div>
  );

  const panel = open ? (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/40 sm:p-4"
      {...backdrop}
      // Drops anywhere over the dialog or the dimmed page search — never navigate the tab to the file.
      onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
      onDragLeave={(e) => { if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
      onDrop={onDrop}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search by photo"
        tabIndex={-1}
        className="w-full sm:max-w-3xl max-h-[92vh] supports-[height:100dvh]:max-h-[92dvh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">Search by photo</h2>
          <button type="button" onClick={close} aria-label="Close photo search" className="w-9 h-9 rounded-full grid place-items-center text-muted hover:bg-bg-soft hover:text-ink">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 py-5">
          {phase === 'pick' && (
            <div className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${dragging ? 'border-brand bg-bg-soft' : 'border-line'}`}>
              <div className="mx-auto w-16 h-16 rounded-full bg-bg-soft grid place-items-center text-brand">
                <CameraIcon size={30} />
              </div>
              <p className="mt-4 text-base font-semibold text-ink">Find a product from a photo</p>
              <p className="mt-1 text-sm text-ink-soft">
                {touch ? 'Take a clear photo of the product, or pick one from your gallery.' : 'Choose a photo of the product, or drag & drop / paste an image here.'}
              </p>
              <div className="mt-5">{pickButtons}</div>
              {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
              <p className="mt-5 text-xs text-muted">Your photo is checked on your device — it is not uploaded.</p>
            </div>
          )}

          {phase === 'working' && (
            <div className="py-6 flex flex-col items-center text-center" aria-live="polite">
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Your photo" width={160} height={160} className="w-40 h-40 rounded-lg border border-line object-contain" />
              )}
              <span className="mt-5 inline-block w-7 h-7 rounded-full border-[3px] border-line border-t-brand animate-spin" aria-hidden />
              <p className="mt-3 text-base font-semibold text-ink">
                {step === 'match'
                  ? 'Finding matching products…'
                  : pct === 100
                    ? 'Starting photo search…'
                    : `Getting photo search ready…${pct != null ? ` ${pct}%` : ''}`}
              </p>
              {step === 'model' && <p className="mt-1 text-xs text-muted">Only the first time — later searches are quick.</p>}
            </div>
          )}

          {phase === 'results' && result && (
            <div>
              <div className="flex items-center gap-3">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Your photo" width={56} height={56} className="w-14 h-14 rounded-md border border-line object-contain shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-ink" aria-live="polite">
                    {result.hits.length === 0 ? 'No matching products' : HEADINGS[result.match]}
                  </p>
                  {result.looksLike && (
                    <Link
                      href={`/shop?cat=${encodeURIComponent(result.looksLike.category)}&sub=${encodeURIComponent(result.looksLike.subcategory)}`}
                      onClick={followLink}
                      className="text-sm text-brand font-semibold hover:underline"
                    >
                      See all {result.looksLike.subcategory} →
                    </Link>
                  )}
                </div>
                <button type="button" onClick={reset} className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-line text-sm font-semibold text-ink hover:border-brand hover:text-brand">
                  <CameraIcon size={16} /> New photo
                </button>
              </div>
              {(result.match === 'weak' || result.hits.length === 0) && (
                <p className="mt-3 text-sm text-ink-soft">Try a clearer photo of just the product, on a plain background.</p>
              )}
              {result.hits.length > 0 && (
                <ul className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {result.hits.map((h) => (
                    <li key={h.sku}>
                      <Link href={`/product/${encodeURIComponent(h.sku)}`} onClick={followLink} className="group block h-full rounded-lg border border-line bg-white overflow-hidden hover:border-brand transition">
                        <span className="block aspect-square p-2 bg-white">
                          {h.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgSrc(h.imageUrl, 300)} alt={h.name} width={300} height={300} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                          ) : (
                            <span className="w-full h-full grid place-items-center text-xs text-muted">No image</span>
                          )}
                        </span>
                        <span className="block px-2.5 pb-2.5">
                          <span className="block text-[13px] leading-snug text-ink line-clamp-2 min-h-[2.5em] group-hover:text-brand">{h.name}</span>
                          <span className="mt-1 block text-sm font-bold text-ink">{inr(h.price)}</span>
                          {h.stock <= 0 && <span className="block text-[11px] font-semibold text-red-600">Out of stock</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" tabIndex={-1} onChange={onFile} />
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" tabIndex={-1} onChange={onFile} />
      </div>
    </div>
  ) : null;

  return (
    <>
      <button type="button" onClick={openDialog} aria-label="Search by photo" title="Search by photo" className={className}>
        <CameraIcon size={iconSize} />
      </button>
      {panel && createPortal(panel, document.body)}
    </>
  );
}

function CameraIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 4h-5L7.5 6.5H4.5A2 2 0 0 0 2.5 8.5v10a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-10a2 2 0 0 0-2-2h-3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function UploadIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
    </svg>
  );
}
