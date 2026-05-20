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

/**
 * Image URLs in the DB look like `/images/{sku}/1.png`. This web app serves
 * them from disk via app/images/[...path]/route.ts, so relative URLs resolve
 * against the current origin.
 */
export function imgSrc(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:/i.test(url)) return url;
  return url;
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
