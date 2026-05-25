'use client';

import { Analytics } from '@vercel/analytics/react';

/**
 * Wraps Vercel Web Analytics with a `beforeSend` filter that drops
 * events from automated clients before they hit Vercel's dashboard.
 *
 * Why we need this: the production dashboard was showing 62% Singapore
 * + 74% desktop, which is inverted vs the real audience (India-focused
 * D2C, ~75-80% mobile). Most of that noise is headless-browser
 * scrapers running in APAC datacenters. Filtering them out gives us a
 * dashboard that reflects real human shoppers — important now while
 * we're investing in organic growth and need to measure lift correctly.
 *
 * Filter is CONSERVATIVE — only signals with effectively zero false-
 * positive rate among real shoppers. We'd rather miss some bots than
 * incorrectly drop a real buyer's pageview.
 *
 * Signals dropped:
 *   1. navigator.webdriver === true        (Puppeteer / Playwright / Selenium default)
 *   2. UA contains "HeadlessChrome" etc.   (explicit headless markers)
 *   3. UA contains explicit bot keywords   ("bot", "crawler", "spider", "scraper")
 *   4. Empty / missing UA                  (some scripted clients omit the header)
 *
 * Signals deliberately NOT used (too many false positives):
 *   - Missing plugins (real iOS Safari has no plugins)
 *   - Empty navigator.languages (some legit browsers do this)
 *   - Screen size 0 (DPR=0 on some legit edge cases)
 *
 * Future improvement: server-side middleware that sets a cookie
 * based on IP ASN (drop AWS / GCP / Azure datacenter ranges). That
 * catches scrapers using real Chrome with no fingerprint anomalies.
 */
function looksLikeBot(): boolean {
  if (typeof navigator === 'undefined') return false;

  // Strongest signal — set by Puppeteer/Playwright/Selenium by default.
  // Sophisticated scrapers override this, but the long tail doesn't.
  if (navigator.webdriver === true) return true;

  const ua = (navigator.userAgent || '').toLowerCase();
  if (!ua) return true;

  // Explicit headless / automation tooling markers in the UA string.
  const headlessMarkers = [
    'headlesschrome',
    'phantomjs',
    'lighthouse',
    'selenium',
    'playwright',
    'puppeteer',
    'chrome-lighthouse',
  ];
  if (headlessMarkers.some((m) => ua.includes(m))) return true;

  // Generic bot keywords. We intentionally do NOT include "google"
  // alone — Googlebot doesn't execute Vercel Analytics JS anyway, so
  // we don't see it on the dashboard. But any UA that self-identifies
  // as a bot is safe to drop.
  const botKeywords = [
    'bot/',
    'bot ',
    'crawler',
    'spider',
    'scraper',
    'fetcher',
    'monitor',
    'pingdom',
    'newrelic',
    'datadog',
    'uptimerobot',
  ];
  if (botKeywords.some((k) => ua.includes(k))) return true;

  return false;
}

export function AnalyticsWithBotFilter() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (looksLikeBot()) {
          if (process.env.NODE_ENV !== 'production') {
            // Visible in dev so you can confirm the filter is firing
            // against your local Puppeteer / Lighthouse runs etc.
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
