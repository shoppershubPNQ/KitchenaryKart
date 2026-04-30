import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

/**
 * Public-facing banner shape consumed by the HeroCarousel. CTA link is
 * pre-resolved into a single `href` field — the admin can target a product
 * SKU, a category, or a raw URL, and the backend picks the right one.
 */
export interface PublicBanner {
  id: number;
  imageUrl: string;
  alt: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  ctaHref: string | null;
}

async function _getActiveBanners(
  placement: 'hero' | 'secondary' = 'hero',
): Promise<PublicBanner[]> {
  const rows = await prisma.banner.findMany({
    where: { isActive: true, placement },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
  return rows.map((b) => {
    let ctaHref: string | null = null;
    if (b.productSku) {
      ctaHref = `/product/${encodeURIComponent(b.productSku)}`;
    } else if (b.category) {
      // Banner 1 (hero) writes a category name into `b.category`; Banner 2
      // (secondary) writes a subcategory name into the same field. The query
      // param chosen here matches what /shop's filter expects.
      const param = placement === 'secondary' ? 'sub' : 'cat';
      ctaHref = `/shop?${param}=${encodeURIComponent(b.category)}`;
    } else if (b.ctaHref) {
      ctaHref = b.ctaHref;
    }
    return {
      id: b.id,
      imageUrl: b.imageUrl,
      alt: b.alt ?? b.title ?? '',
      eyebrow: b.eyebrow,
      title: b.title,
      subtitle: b.subtitle,
      ctaText: b.ctaText,
      ctaHref,
    };
  });
}

/** 5-minute cache; matches the home page's ISR cadence. */
export const getActiveBanners = unstable_cache(
  _getActiveBanners,
  ['kk:active-banners'],
  { revalidate: 300, tags: ['banners'] },
);
