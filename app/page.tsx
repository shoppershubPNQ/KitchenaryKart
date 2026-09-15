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
import { OfferTicker } from '@/components/OfferTicker';
import { MarketplaceStrip } from '@/components/MarketplaceStrip';
import { getOfferTicker } from '@/lib/offer-ticker';

export const revalidate = 300; // regenerate home at most every 5 min

export default async function HomePage() {
  const [home, tree, banners, promoSlides, reels, spotlight, ticker] = await Promise.all([
    getHomePageData(),
    getCategoryTree(),
    getActiveBanners('hero'),
    getActiveBanners('secondary'),
    getActiveReels(),
    getHomeSpotlight(),
    getOfferTicker(),
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
      {/* Scrolling offer line — admin: Content → Offer ticker. Hidden when off. */}
      {ticker && <OfferTicker ticker={ticker} />}
      <CategoryTiles tree={tree} />

      {/* Featured Spotlight — sits directly under the categories so the single
          hero product leads the page. Only renders when an active spotlight exists. */}
      {spotlight && (
        <section className="pt-10">
          <SpotlightTeaser data={spotlight} />
        </section>
      )}

      <section className="pt-4 pb-0 mb-14">
        <HomeTabs bestsellers={bestsellers} newArrivals={newArrivals} />
      </section>

      <TrustStrip />

      {/* "Also on Amazon & Flipkart" — static trust note, no links. */}
      <MarketplaceStrip />

      <PromoCarousel slides={promoSlides} />

      <WatchAndShopLazy reels={reels} products={watchShop} />
    </>
  );
}
