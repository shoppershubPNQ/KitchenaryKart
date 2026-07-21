import Link from 'next/link';
import { HeroCarousel } from '@/components/HeroCarousel';
import { CategoryTiles } from '@/components/CategoryTiles';
import { HomeTabs } from '@/components/HomeTabs';
import { TrustStrip } from '@/components/TrustStrip';
import { PromoCarousel } from '@/components/PromoCarousel';
import { WatchAndShopLazy } from '@/components/WatchAndShopLazy';
import { getCategoryTree, getHomePageData } from '@/lib/products';
import { getActiveBanners } from '@/lib/banners';
import { getActiveReels } from '@/lib/reels';
import { getHomeSpotlight } from '@/lib/spotlight';
import { SpotlightTeaser } from '@/components/SpotlightTeaser';

export const revalidate = 300; // regenerate home at most every 5 min

export default async function HomePage() {
  const [home, tree, banners, promoSlides, reels, spotlight] = await Promise.all([
    getHomePageData(),
    getCategoryTree(),
    getActiveBanners('hero'),
    getActiveBanners('secondary'),
    getActiveReels(),
    getHomeSpotlight(),
  ]);
  const { bestsellers, newArrivals, watchShop } = home;

  return (
    <>
      {/* Semantic H1 for SEO + accessibility — the hero is image-only, so the
          home page had no <h1>. Visually hidden; crawled + read by screen readers. */}
      <h1 className="sr-only">
        KitchenaryKart — Commercial Kitchen Equipment Supplier in India
      </h1>
      <HeroCarousel banners={banners} />
      <CategoryTiles tree={tree} />

      <section className="pt-14 pb-0 mb-14">
        <HomeTabs bestsellers={bestsellers} newArrivals={newArrivals} />
      </section>

      {/* Featured Spotlight — only renders when an active spotlight exists. */}
      {spotlight && (
        <section className="mb-14">
          <SpotlightTeaser data={spotlight} />
        </section>
      )}

      <TrustStrip />

      <PromoCarousel slides={promoSlides} />

      <WatchAndShopLazy reels={reels} products={watchShop} />
    </>
  );
}
