// Keep a stable nav order and short labels regardless of DB ordering.
export const CATEGORY_ORDER = [
  'HOT EQUIPMENT',
  'COLD EQUIPMENT',
  'BUFFET & TABLEWARE',
  'BAR & BEVERAGE ACCESSORIES',
  'KITCHEN & BAKING EQUIPMENT',
  'HOUSEKEEPING & ROOM ESSENTIALS',
  'ACCESSORIES',
  'POLYRATTAN BASKET',
  'SPARE PARTS',
];

export const CATEGORY_SHORT: Record<string, string> = {
  'HOT EQUIPMENT': 'Hot Equipment',
  'COLD EQUIPMENT': 'Cold Equipment',
  'BUFFET & TABLEWARE': 'Buffet & Tableware',
  'BAR & BEVERAGE ACCESSORIES': 'Bar & Beverage',
  'KITCHEN & BAKING EQUIPMENT': 'Kitchen & Baking',
  'HOUSEKEEPING & ROOM ESSENTIALS': 'Housekeeping',
  ACCESSORIES: 'Accessories',
  'POLYRATTAN BASKET': 'Polyrattan',
  'SPARE PARTS': 'Spare Parts',
};

export function catLabel(cat: string): string {
  return CATEGORY_SHORT[cat] ?? cat;
}
