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
 *
 * Absolute Cloudinary URLs (per-variant images stored as
 * `…/image/upload/v123/kk/<sku>/variant-…/x.webp`) are ALSO right-sized: the
 * same transform is injected after `/image/upload/`. Previously these were
 * returned untouched, so a 250px card downloaded a full-res image — the
 * bandwidth leak that pushed the Cloudinary account past its free quota and
 * got image delivery disabled. Non-Cloudinary hosts, and URLs that already
 * carry a transform, are returned untouched.
 */
export function imgSrc(url: string | null | undefined, width = 1600): string {
  if (!url) return '';
  const transform = `f_auto,q_auto,w_${width},c_limit`;
  if (/^https?:/i.test(url)) {
    const marker = '/image/upload/';
    const at = url.indexOf(marker);
    if (at === -1) return url; // not a Cloudinary upload URL — leave as-is
    const restStart = at + marker.length;
    const firstSeg = url.slice(restStart).split('/')[0];
    // A transform segment starts with a Cloudinary param like `w_`,`f_`,`c_`…
    // A version (`v123…`) or bare public id does not — prepend the transform.
    if (/(?:^|,)[a-z]{1,3}_/.test(firstSeg)) return url;
    return `${url.slice(0, restStart)}${transform}/${url.slice(restStart)}`;
  }
  const m = url.match(/^\/?images\/(.+)$/i);
  if (!m) return url;
  return `${CLOUDINARY_HOST}/${transform}/kk/${m[1]}`;
}

/**
 * Trim a meta description to <= `max` chars at a word boundary, appending an
 * ellipsis when cut. Whitespace is collapsed first. Keeps SERP/social snippets
 * under the audit's "meta description too long" limit (~160). Safe on any
 * source string (product description, blog excerpt, template fallback).
 */
export function clampDescription(text: string | null | undefined, max = 160): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1); // leave room for the ellipsis
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–—-]+$/, '') + '…';
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
