/**
 * Default Open Graph / social-share image.
 *
 * Next.js REPLACES (does not deep-merge) the parent `openGraph` when a route
 * exports its own openGraph block, so any page that overrides openGraph must
 * re-declare an image — otherwise the root's og:image is dropped and crawlers
 * flag the page as "Open Graph tags incomplete". Every page that sets its own
 * openGraph should spread this in as `images`.
 */
export const DEFAULT_OG_IMAGES = [
  {
    url: '/logo.png',
    width: 2000,
    height: 2000,
    alt: 'KitchenaryKart — Commercial Kitchen Equipment',
  },
];
