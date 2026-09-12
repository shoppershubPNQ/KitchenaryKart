/**
 * The brand a product is sold under.
 *
 * VAMA and Veratti are the business's own brands (owner, 2026-09-12). Their
 * products carry the brand in the name ("VAMA SS Salt & Pepper Set",
 * "Veratti Full SS Premium Induction - K3"); everything else is sold as
 * Kitchenary Kart. There is no brand column in the DB, so the name decides.
 *
 * Deliberately NOT a list of every word that looks like a brand: "Zapata"
 * appears in a few product names but is not one of our brands.
 */
export const STORE_BRAND = 'Kitchenary Kart';

const HOUSE_BRANDS: Array<{ name: string; re: RegExp }> = [
  { name: 'VAMA', re: /\bvama\b/i },
  { name: 'Veratti', re: /\bveratti\b/i },
];

export function productBrand(productName: string | null | undefined): string {
  if (productName) {
    for (const b of HOUSE_BRANDS) if (b.re.test(productName)) return b.name;
  }
  return STORE_BRAND;
}
