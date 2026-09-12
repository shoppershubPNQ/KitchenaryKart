'use client';

import { Analytics } from '@vercel/analytics/react';
import { looksLikeBot } from '@/lib/bot';

/**
 * Wraps Vercel Web Analytics with a `beforeSend` filter that drops events
 * from automated clients before they hit Vercel's dashboard.
 *
 * Why: the production dashboard was showing 62% Singapore + 74% desktop,
 * inverted vs the real audience (India-focused D2C, ~75-80% mobile) — mostly
 * headless scrapers in APAC datacenters. The filter itself lives in lib/bot.ts
 * so our own visitor tracking (lib/track.ts) counts the same humans.
 */
export function AnalyticsWithBotFilter() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (looksLikeBot()) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.debug('[analytics] dropped bot event', event.url);
          }
          return null;
        }
        return event;
      }}
    />
  );
}
