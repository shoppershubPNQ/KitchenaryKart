import type { Metadata } from 'next';
import { WishlistGrid } from './WishlistGrid';

export const metadata: Metadata = {
  title: 'Your wishlist — KitchenaryKart',
  description:
    'Products you have saved on KitchenaryKart. Move them to your cart or share the list with your team.',
  alternates: { canonical: '/wishlist' },
};

export default function WishlistPage() {
  return (
    <div className="max-w-site mx-auto px-[6mm] md:px-[1.5cm] py-14">
      <div className="mb-8">
        <h1 className="font-head text-3xl text-ink">Your wishlist</h1>
        <p className="text-muted text-sm mt-1">
          Saved items live in your browser — bookmark this page or sign in to
          your account to keep them across devices.
        </p>
      </div>
      <WishlistGrid />
    </div>
  );
}
