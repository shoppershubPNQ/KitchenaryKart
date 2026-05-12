/**
 * Deterministic pseudo-rating helpers, shared between the product card and
 * the product detail page. The same SKU always produces the same numbers
 * across server and client renders, so the badge stays stable when the
 * page hydrates.
 *
 * Replace `pseudoRating()` with a real review-data lookup when the schema
 * grows a Review model.
 */
import * as React from 'react';

export function pseudoRating(sku: string): { stars: number; count: number } {
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;

  // Stars: 4.0 – 5.0 in 0.1 steps (11 possible values).
  const stars = 4 + ((h % 11) / 10);

  // Count is anti-correlated with rating — a freshly listed item with a few
  // ecstatic buyers shows fewer reviews than one that's been kicked around
  // and averaged down. 5.0 → ~10, 4.5 → ~15, 4.0 → ~20. A small per-SKU
  // jitter (0–4) keeps products with the same rating from looking identical.
  const base = 10 + Math.round((5 - stars) * 10);
  const jitter = Math.floor(h / 11) % 5;
  const count = base + jitter;

  return { stars: Math.round(stars * 10) / 10, count };
}

export function Stars({
  value,
  size = 'sm',
}: {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const full = Math.round(value);
  const fontSize = size === 'lg' ? 20 : 16; // px
  // Inline styles because this file lives outside Tailwind's content glob
  // (`app/**` + `components/**`); arbitrary classes wouldn't be emitted.
  return (
    <span
      style={{
        color: '#F5A623',
        fontSize,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}
    >
      {'★'.repeat(full)}
      <span style={{ color: '#E5E5E5' }}>{'★'.repeat(5 - full)}</span>
    </span>
  );
}
