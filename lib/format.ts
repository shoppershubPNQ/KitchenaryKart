export function inr(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function letter(s: string | null | undefined): string {
  return (s || '?').trim().charAt(0).toUpperCase();
}

export function savingsPercent(price: number, mrp?: number | null): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

const CLOUDINARY_BASE = `https://res.cloudinary.com/${
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || 'ddvay7jt0'
}/image/upload/f_auto,q_auto,w_1600,c_limit/kk`;

/**
 * Resolve a stored image URL to a directly-servable URL.
 *
 * DB paths look like `/images/{sku}/1.png`. Previously these were served via a
 * 308 redirect to Cloudinary (app/images/[...path]/route.ts), so every rendered
 * image was a redirect hop — Ahrefs flagged ~3,973 image redirects, and it
 * wastes crawl budget + slows LCP. We now emit the FINAL Cloudinary URL
 * directly (same mapping the route used: `kk/<path>`, f_auto,q_auto), plus a
 * `w_1600,c_limit` delivery cap so over-large originals are downscaled on the
 * fly (fixes "image file size too large"). The /images route stays as a
 * fallback for any cached/legacy links. Absolute URLs (e.g. per-variant
 * Cloudinary URLs) are returned untouched.
 */
export function imgSrc(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:/i.test(url)) return url;
  const m = url.match(/^\/?images\/(.+)$/i);
  if (!m) return url;
  return `${CLOUDINARY_BASE}/${m[1]}`;
}

/** "20 May 2026" format from an ISO string. Used on order pages. */
export function dateShortFromIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
