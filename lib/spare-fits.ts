/**
 * Spare part <-> machine links for the product page.
 *
 * `spare-fits.json` maps a spare's SKU to the machine SKUs it fits. It holds
 * only the GREEN (model/capacity-matched) rows of the owner's mapping sheet
 * KK-SPARE-TO-MACHINE-MAPPING-2026-09-11.xlsx — a wrong link would sell a part
 * that doesn't fit. Regenerate with admin/scripts/_tmp-build-spare-fits.ts.
 *
 * Why it matters: spares rank on Google page 1, machines sit on page 2. Links
 * from spare pages to their machines pass that ranking on, and machine pages
 * listing their spares help buyers who already own one.
 *
 * Card data comes from the live active catalogue, so a machine that goes to
 * draft or is deleted simply drops out — no dead links.
 */
import fitsJson from './spare-fits.json';
import { getAllShopProducts, type PublicProduct } from './products';

const FITS = fitsJson as Record<string, string[]>;

const SPARES_FOR: Record<string, string[]> = {};
for (const [spare, machines] of Object.entries(FITS)) {
  for (const m of machines) (SPARES_FOR[m] ||= []).push(spare);
}

/** How many spare cards a machine page shows (the grid shows 5, then "View all"). */
const MAX_SPARES = 24;

/**
 * `skus` = every SKU this page answers for: the URL's SKU, the parent SKU and
 * its variant SKUs — the mapping may name either a parent or one size of it.
 */
export async function getSpareFitLinks(
  skus: string[],
): Promise<{ fitsMachines: PublicProduct[]; spareParts: PublicProduct[] }> {
  const own = new Set(skus.filter(Boolean));
  const machineSkus = new Set<string>();
  const spareSkus = new Set<string>();
  for (const s of own) {
    for (const m of FITS[s] ?? []) machineSkus.add(m);
    for (const sp of SPARES_FOR[s] ?? []) spareSkus.add(sp);
  }
  if (machineSkus.size === 0 && spareSkus.size === 0) return { fitsMachines: [], spareParts: [] };

  const bySku = new Map((await getAllShopProducts()).map((p) => [p.sku, p]));
  const pick = (list: Set<string>) =>
    [...list].filter((s) => !own.has(s)).map((s) => bySku.get(s)).filter((p): p is PublicProduct => !!p);

  const inStockFirst = (a: PublicProduct, b: PublicProduct) =>
    Number((b.stock ?? 0) > 0) - Number((a.stock ?? 0) > 0);

  return {
    fitsMachines: pick(machineSkus),
    spareParts: pick(spareSkus).sort(inStockFirst).slice(0, MAX_SPARES),
  };
}
