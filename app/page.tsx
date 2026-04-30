import Link from 'next/link';
import { HeroCarousel } from '@/components/HeroCarousel';
import { CategoryTiles } from '@/components/CategoryTiles';
import { HomeTabs } from '@/components/HomeTabs';
import { TrustStrip } from '@/components/TrustStrip';
import { PromoCarousel } from '@/components/PromoCarousel';
import { WatchAndShop } from '@/components/WatchAndShop';
import { getCategoryTree, getHomePageData } from '@/lib/products';
import { getActiveBanners } from '@/lib/banners';

export const revalidate = 300; // regenerate home at most every 5 min

export default async function HomePage() {
  const [home, tree, banners, promoSlides] = await Promise.all([
    getHomePageData(),
    getCategoryTree(),
    getActiveBanners('hero'),
    getActiveBanners('secondary'),
  ]);
  const { bestsellers, newArrivals, watchShop } = home;

  return (
    <>
      <HeroCarousel banners={banners} />
      <CategoryTiles tree={tree} />
      <TrustStrip />

      <section className="pt-14 pb-0">
        <HomeTabs bestsellers={bestsellers} newArrivals={newArrivals} />
      </section>

      <PromoCarousel slides={promoSlides} />

      <WatchAndShop products={watchShop} />
    </>
  );
}
