/**
 * Star display, shared between the product card, the PDP and the featured page.
 *
 * This file used to also export `pseudoRating(sku)` — a star count hashed from
 * the SKU, used as a display fallback for products with no reviews. It was
 * removed on 2026-09-16: a product could show "4.3 (17)" at the top while its
 * own review section said "No reviews yet". Callers now render stars only when
 * a real approved-review count is greater than zero.
 */
import * as React from 'react';

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
