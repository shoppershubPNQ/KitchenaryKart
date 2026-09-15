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

/** Separators where a long product name moves from "what it is" to detail. */
const NAME_CUTS = [' with ', ' - ', ' | ', ' – ', ' (', ', '];

/** "Electric Planetary Mixer with 3 Whisk Attachments & …" -> "Electric Planetary Mixer". */
function shortMachineName(name: string): string {
  let cut = name.length;
  for (const sep of NAME_CUTS) {
    const i = name.indexOf(sep);
    if (i >= 12 && i < cut) cut = i;
  }
  return name.slice(0, cut).trim();
}

/** "Bowl Capacity: 7L | Dough Capacity: 1.25kg/Batch / 600W" -> "7L · 600W". */
function shortSizeLabel(label: string): string {
  return label
    .split(' / ')
    .map((part) => part.split(' | ')[0].replace(/^[^:]{1,30}:\s*/, '').trim())
    .filter(Boolean)
    .join(' · ');
}

export interface FitsGroup {
  /** Short machine name, shown once. */
  name: string;
  /** One chip per size of that machine that this part fits. */
  items: Array<{ sku: string; label: string }>;
}

/**
 * The "Fits:" block, grouped by machine: the name once, then a chip per size
 * ("Electric Planetary Mixer" — 7L · 600W, 10L · 800W). A flat list of full
 * listing names ran every size's long name and spec text together.
 */
export function groupMachines(machines: PublicProduct[]): FitsGroup[] {
  const groups = new Map<string, FitsGroup>();
  for (const m of machines) {
    const at = m.name.lastIndexOf(' — ');
    const base = at > 0 ? m.name.slice(0, at) : m.name;
    const label = at > 0 ? shortSizeLabel(m.name.slice(at + 3)) : '';
    const name = shortMachineName(base);
    const g = groups.get(name) ?? { name, items: [] };
    g.items.push({ sku: m.sku, label });
    groups.set(name, g);
  }
  return [...groups.values()];
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
