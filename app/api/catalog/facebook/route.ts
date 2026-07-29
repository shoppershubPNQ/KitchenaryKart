/**
 * GET /api/catalog/facebook.xml
 *
 * Meta Product Catalog feed in the RSS 2.0 + Google Merchant Center
 * dialect that Meta Commerce Manager accepts. One <item> per active
 * product with an image. Add this URL as a "Scheduled Feed" in
 * Commerce Manager and Meta will refresh nightly; once the catalog
 * is linked to your WhatsApp Business account, the same products
 * show up in WhatsApp Catalog automatically.
 *
 * Spec reference:
 *   https://www.facebook.com/business/help/120325381656392
 *   https://developers.facebook.com/docs/commerce-platform/catalog/fields
 *
 * Required fields per item: id, title, description, link, image_link,
 * availability, condition, price (currency-formatted), brand.
 * Recommended: google_product_category, gtin or mpn, item_group_id
 * for variants.
 *
 * We deliberately skip products with no imageUrl — Meta rejects feeds
 * with missing images and one bad product can poison the whole feed
 * (the entire run gets quarantined).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { imgSrc } from '@/lib/format';

export const dynamic = 'force-dynamic';
// Re-render at most once an hour. Meta's scheduled pull is typically
// daily — anything more frequent than that is wasted DB work.
export const revalidate = 3600;

const SITE_URL = 'https://kitchenarykart.com';
const BRAND = 'Kitchenary Kart';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toAbsoluteImage(url: string | null): string | null {
  if (!url) return null;
  const src = imgSrc(url);
  if (/^https?:/i.test(src)) return src;
  return `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
}

export async function GET() {
  const rows = await prisma.product.findMany({
    where: { status: 'active' },
    select: {
      sku: true,
      name: true,
      description: true,
      category: true,
      subcategory: true,
      price: true,
      mrp: true,
      imageUrl: true,
      images: true,
      stock: true,
      hsnCode: true,
      variants: {
        select: {
          skuSuffix: true,
          variantValue: true,
          priceModifier: true,
          price: true,
          mrp: true,
          stock: true,
          imageUrl: true,
          images: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Feed the CHILD (variant) listings, mirroring the storefront + the Google
  // merchant feed. Advertising the parent row was wrong on both counts: its
  // stock column can read 0 while the variants are stocked (46 products), so
  // Meta was told "out of stock" for items customers can actually buy, and the
  // link pointed at the parent instead of the size being advertised. Variants
  // are tied together with g:item_group_id so Meta treats them as one family.
  type Feed = {
    sku: string; name: string; description: string | null; category: string | null;
    subcategory: string | null; price: number; mrp: number | null; imageUrl: string | null;
    images: string[]; stock: number; groupId: string | null;
  };
  const products: Feed[] = [];
  for (const row of rows) {
    const parentPrice = Number(row.price);
    const parentMrp = row.mrp ? Number(row.mrp) : null;
    const parentImages = Array.isArray(row.images) ? (row.images as string[]) : [];
    const base = {
      description: row.description, category: row.category, subcategory: row.subcategory,
    };
    if (!row.variants.length) {
      products.push({
        ...base, sku: row.sku, name: row.name, price: parentPrice, mrp: parentMrp,
        imageUrl: row.imageUrl, images: parentImages, stock: row.stock, groupId: null,
      });
      continue;
    }
    const mrpRatio = parentMrp && parentPrice > 0 ? parentMrp / parentPrice : 0;
    for (const v of row.variants) {
      if (!v.skuSuffix) continue;
      const price = v.price != null ? Number(v.price) : parentPrice + Number(v.priceModifier ?? 0);
      const mrp = v.mrp != null ? Number(v.mrp) : mrpRatio > 1 ? Math.round(price * mrpRatio) : parentMrp;
      const vImages = Array.isArray(v.images) ? (v.images as string[]) : [];
      const qualifier = (v.variantValue || '').trim();
      products.push({
        ...base,
        sku: v.skuSuffix,
        name: qualifier ? `${row.name} — ${qualifier}` : row.name,
        price, mrp,
        imageUrl: v.imageUrl ?? row.imageUrl,
        images: vImages.length ? vImages : parentImages,
        stock: v.stock,
        groupId: row.sku,
      });
    }
  }

  const items = products
    // Meta rejects items with no image or price <= 0.
    .filter((p) => p.imageUrl && p.price > 0)
    .map((p) => {
      const img = toAbsoluteImage(p.imageUrl);
      if (!img) return null;
      const price = Number(p.price);
      const mrp = p.mrp ? Number(p.mrp) : null;
      const link = `${SITE_URL}/product/${encodeURIComponent(p.sku)}`;
      const desc =
        p.description ||
        `${p.name} — commercial-grade ${p.subcategory || p.category || 'kitchen equipment'} from Kitchenary Kart. GST-invoiced, 12-month warranty, pan-India delivery.`;
      const additionalImages = (Array.isArray(p.images) ? (p.images as string[]) : [])
        .slice(0, 9) // Meta cap = 10 additional images
        .map(toAbsoluteImage)
        .filter((u): u is string => !!u && u !== img);

      // Sale price (the discounted offer) vs price (the list/MRP).
      // Meta uses both to show the strikethrough.
      const listPrice = mrp && mrp > price ? mrp : price;
      const salePrice = mrp && mrp > price ? price : null;

      return `    <item>
      <g:id>${xmlEscape(p.sku)}</g:id>
      <g:title>${xmlEscape(p.name)}</g:title>
      <g:description>${xmlEscape(desc.slice(0, 4500))}</g:description>
      <g:link>${xmlEscape(link)}</g:link>
      <g:image_link>${xmlEscape(img)}</g:image_link>${additionalImages
        .map((u) => `\n      <g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`)
        .join('')}
      <g:availability>${p.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${listPrice.toFixed(2)} INR</g:price>${
        salePrice != null
          ? `\n      <g:sale_price>${salePrice.toFixed(2)} INR</g:sale_price>`
          : ''
      }
      <g:brand>${xmlEscape(BRAND)}</g:brand>
      <g:mpn>${xmlEscape(p.sku)}</g:mpn>${
        p.groupId ? `\n      <g:item_group_id>${xmlEscape(p.groupId)}</g:item_group_id>` : ''
      }${
        p.category
          ? `\n      <g:product_type>${xmlEscape([p.category, p.subcategory].filter(Boolean).join(' &gt; '))}</g:product_type>`
          : ''
      }
    </item>`;
    })
    .filter((s): s is string => !!s);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Kitchenary Kart Product Catalog</title>
    <link>${SITE_URL}</link>
    <description>Commercial kitchen equipment from Kitchenary Kart — products listed for Meta Commerce / WhatsApp Business Catalog ingestion.</description>
${items.join('\n')}
  </channel>
</rss>
`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Cache at the edge for 1 hour — Meta pulls daily, so anything
      // more aggressive than that is wasted bandwidth.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
