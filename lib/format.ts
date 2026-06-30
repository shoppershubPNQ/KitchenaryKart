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

const CLOUDINARY_HOST = `https://res.cloudinary.com/${
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || 'ddvay7jt0'
}/image/upload`;

/**
 * Resolve a stored image URL to a directly-servable Cloudinary URL.
 *
 * DB paths look like `/images/{sku}/1.png`. We emit the FINAL Cloudinary URL
 * directly (no 308 redirect hop — Ahrefs flagged ~3,973 of those), with
 * `f_auto,q_auto,w_<width>,c_limit` so over-large originals are downscaled on
 * the fly.
 *
 * `width` caps the delivered pixel width — pass a SMALL value for product
 * cards / thumbnails so a 250px grid slot doesn't download a 1600px image
 * (a big LCP / Core-Web-Vitals + bandwidth win across the catalog). Defaults
 * to 1600 for full-size use (PDP hero, OG cards, JSON-LD, merchant feed).
 * Absolute URLs (per-variant Cloudinary URLs) are returned untouched.
 */
export function imgSrc(url: string | null | undefined, width = 1600): string {
  if (!url) return '';
  if (/^https?:/i.test(url)) return url;
  const m = url.match(/^\/?images\/(.+)$/i);
  if (!m) return url;
  return `${CLOUDINARY_HOST}/f_auto,q_auto,w_${width},c_limit/kk/${m[1]}`;
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
