/**
 * Google Merchant Center product feed served at /merchant-feed.xml.
 *
 * RSS 2.0 + g: namespace — the format Merchant Center fetches on a schedule.
 * Submit the URL in Merchant Center → Products → Feeds → "Scheduled fetch".
 *
 * Notes for whoever maintains this:
 *  - Products WITHOUT an image are excluded (image_link is required and
 *    imageless items get disapproved anyway).
 *  - Descriptions are sanitised: Merchant Center policy forbids phone
 *    numbers, promotional text ("free delivery", "best price") and links in
 *    the description, all of which our generated copy contains — so we strip
 *    those sentences for the feed only (the on-site PDP copy is untouched).
 *  - We declare identifier_exists=no (own-brand catalogue, no manufacturer
 *    GTINs) and pass brand. Set shipping + tax in the Merchant Center account
 *    settings (simpler than per-item shipping here).
 *  - google_product_category is a sensible default per category; refine in
 *    Merchant Center if a category mis-classifies.
 */
import { getAllShopProducts } from '@/lib/products';
import { imgSrc } from '@/lib/format';

const SITE_URL = 'https://kitchenarykart.com';

// Refresh hourly (matches the catalogue's other ISR windows).
export const revalidate = 3600;

// Closest valid Google product taxonomy per internal category.
const GOOGLE_CATEGORY: Record<string, string> = {
  'HOT EQUIPMENT': 'Business & Industrial > Food Service',
  'COLD EQUIPMENT': 'Business & Industrial > Food Service',
  'KITCHEN & BAKING EQUIPMENT': 'Business & Industrial > Food Service',
  'BUFFET & TABLEWARE': 'Home & Garden > Kitchen & Dining > Tableware',
  'BAR & BEVERAGE ACCESSORIES': 'Home & Garden > Kitchen & Dining > Barware',
  'HOUSEKEEPING & ROOM ESSENTIALS': 'Business & Industrial > Janitorial & Sanitation',
  ACCESSORIES: 'Business & Industrial > Food Service',
  'POLYRATTAN BASKET': 'Home & Garden > Kitchen & Dining > Food Storage',
  'SPARE PARTS': 'Business & Industrial > Food Service',
};
const GOOGLE_CATEGORY_FALLBACK = 'Business & Industrial > Food Service';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toAbsolute(url: string): string {
  const src = imgSrc(url);
  if (/^https?:/i.test(src)) return src;
  return `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}

/** Strip sentences that violate Merchant Center description policy. */
function feedDescription(desc: string | null, name: string, category: string | null): string {
  const base = (desc || '').replace(/\s+/g, ' ').trim();
  const fallback = `${name} — commercial-grade ${
    (category || 'kitchen equipment').toLowerCase()
  } for restaurants, hotels, cafés and cloud kitchens.`;
  if (!base) return fallback;
  const sentences = base.split(/(?<=[.!?])\s+/);
  const banned =
    /(whatsapp|\+?\s*91[\d\s-]{7,}|\bhttps?:|free[^.]*delivery|input tax credit|gst\s+(tax\s+)?invoice|\bupi\b|\bemi\b|bulk pricing)/i;
  const kept = sentences.filter((s) => !banned.test(s));
  const out = kept.join(' ').trim();
  return (out || fallback).slice(0, 4900);
}

function feedTitle(name: string): string {
  const n = name.trim();
  const t = /\bcommercial\b/i.test(n) ? n : `Commercial ${n}`;
  return t.slice(0, 150);
}

export async function GET() {
  const products = await getAllShopProducts();

  const items: string[] = [];
  for (const p of products) {
    if (!p.imageUrl) continue; // image_link is required

    const link = `${SITE_URL}/product/${encodeURIComponent(p.sku)}`;
    const image = toAbsolute(p.imageUrl);
    const extra = (p.images || [])
      .filter((u) => u && u !== p.imageUrl)
      .slice(0, 10)
      .map((u) => `    <g:additional_image_link>${xmlEscape(toAbsolute(u))}</g:additional_image_link>`)
      .join('\n');

    const hasDiscount = !!(p.mrp && p.mrp > p.price);
    const regular = hasDiscount ? (p.mrp as number) : p.price;
    const priceLine = `    <g:price>${regular.toFixed(2)} INR</g:price>`;
    const saleLine = hasDiscount ? `\n    <g:sale_price>${p.price.toFixed(2)} INR</g:sale_price>` : '';

    const gCat = (p.category && GOOGLE_CATEGORY[p.category]) || GOOGLE_CATEGORY_FALLBACK;
    const productType = [p.category, p.subcategory].filter(Boolean).join(' > ') || 'Commercial Kitchen Equipment';

    items.push(
      `  <item>
    <g:id>${xmlEscape(p.sku)}</g:id>
    <g:title>${xmlEscape(feedTitle(p.name))}</g:title>
    <g:description>${xmlEscape(feedDescription(p.description, p.name, p.category))}</g:description>
    <g:link>${xmlEscape(link)}</g:link>
    <g:image_link>${xmlEscape(image)}</g:image_link>${extra ? '\n' + extra : ''}
    <g:availability>${p.stock > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
${priceLine}${saleLine}
    <g:brand>Kitchenary Kart</g:brand>
    <g:condition>new</g:condition>
    <g:identifier_exists>no</g:identifier_exists>
    <g:google_product_category>${xmlEscape(gCat)}</g:google_product_category>
    <g:product_type>${xmlEscape(productType)}</g:product_type>
  </item>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Kitchenary Kart — Commercial Kitchen Equipment</title>
  <link>${SITE_URL}</link>
  <description>Commercial kitchen, bar, buffet and housekeeping equipment with GST invoicing and pan-India delivery.</description>
${items.join('\n')}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
