'use client';

/**
 * Variant picker for product detail pages.
 *
 * - 1-axis (e.g. Size only): renders a single row of buttons.
 * - 2-axis (Size × Color): renders two rows, one per axis. When the user
 *   picks one of each, we look for the variant matching BOTH values.
 *
 * Selecting a variant navigates to its SKU URL via the Next.js router
 * (history-replace style — no full page load). Price + stock indicators
 * upstream re-render from the new SKU's data.
 */
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { inr } from '@/lib/format';
import type { PublicVariant } from '@/lib/products';

interface Props {
  variants: PublicVariant[];
  currentSku: string;
}

export function VariantSelector({ variants, currentSku }: Props) {
  const router = useRouter();

  // Figure out which axes exist across the variant set.
  // For 1-axis variants, axisValues is a string. For 2-axis it's an object.
  const axes = useMemo(() => {
    const axisMap = new Map<string, Set<string>>();
    for (const v of variants) {
      if (typeof v.axisValues === 'string') {
        const type = v.variantType || 'Variant';
        if (!axisMap.has(type)) axisMap.set(type, new Set());
        axisMap.get(type)!.add(v.axisValues);
      } else {
        for (const [type, val] of Object.entries(v.axisValues)) {
          if (val == null) continue;
          if (!axisMap.has(type)) axisMap.set(type, new Set());
          axisMap.get(type)!.add(String(val));
        }
      }
    }
    return [...axisMap.entries()].map(([type, valueSet]) => ({
      type,
      values: [...valueSet],
    }));
  }, [variants]);

  // Find what's currently selected for each axis (from currentSku)
  const current = variants.find((v) => v.sku === currentSku);
  const currentSelection: Record<string, string> = useMemo(() => {
    if (!current) return {};
    if (typeof current.axisValues === 'string') {
      return { [current.variantType]: current.axisValues };
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(current.axisValues)) {
      if (v != null) out[k] = String(v);
    }
    return out;
  }, [current]);

  function pickValue(axisType: string, value: string) {
    // Build the desired selection (current + new pick for this axis)
    const target = { ...currentSelection, [axisType]: value };
    // Find a variant matching ALL axis values in `target`
    const match = variants.find((v) => {
      const vals = typeof v.axisValues === 'string'
        ? { [v.variantType]: v.axisValues }
        : (v.axisValues as Record<string, string>);
      return Object.entries(target).every(([t, val]) => String(vals[t] ?? '') === val);
    });
    if (match) router.push(`/product/${encodeURIComponent(match.sku)}`);
  }

  if (variants.length <= 1 || axes.length === 0) return null;

  return (
    <div className="space-y-4 mb-5">
      {axes.map((axis) => (
        <div key={axis.type}>
          <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">
            Choose {axis.type}: <span className="text-ink font-bold">{currentSelection[axis.type] || '—'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {axis.values.map((value) => {
              const isSelected = currentSelection[axis.type] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => pickValue(axis.type, value)}
                  className={`px-4 py-2 text-sm font-medium rounded-md border transition ${
                    isSelected
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-white text-ink hover:border-brand hover:text-brand'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {current && (
        <div className="text-xs text-muted">
          Variant SKU: <span className="font-mono text-ink">{current.sku}</span>
          {' · '}
          <span className={current.stock > 0 ? 'text-success' : 'text-red-600'}>
            {current.stock > 0 ? `${current.stock} in stock` : 'Out of stock'}
          </span>
          {' · '}
          <span className="text-ink font-semibold">{inr(current.price)}</span>
        </div>
      )}
    </div>
  );
}
