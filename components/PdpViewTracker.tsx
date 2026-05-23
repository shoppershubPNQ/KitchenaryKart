'use client';

/**
 * Fires the ViewContent / view_item conversion event once on PDP
 * mount. Kept as a tiny dedicated client component so the PDP server
 * component stays a server component (which is necessary for SEO +
 * metadata generation).
 */
import { useEffect } from 'react';
import { trackViewContent } from '@/lib/analytics';

interface Props {
  sku: string;
  name: string;
  price: number;
  category: string | null;
}

export function PdpViewTracker({ sku, name, price, category }: Props) {
  useEffect(() => {
    trackViewContent({ sku, name, price, category });
    // SKU is enough — re-fire if the URL changes to a variant. Other
    // props are stable derived values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku]);
  return null;
}
