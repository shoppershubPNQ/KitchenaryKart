/**
 * Conditional injection of Meta Pixel + Google gtag (Ads + GA4).
 *
 * Renders nothing unless the corresponding env var is set, so it's safe to
 * deploy before the marketing team has the IDs.
 *
 * PERFORMANCE — split load so the heavy libraries don't block the main
 * thread during startup (they were the biggest scripts on the page):
 *   • The tiny `fbq` / `gtag` STUBS load `afterInteractive`, so the globals
 *     exist early and every event (ViewContent / AddToCart / InitiateCheckout
 *     / Purchase from lib/analytics) is BUFFERED — nothing is ever lost.
 *   • The heavy libraries (`fbevents.js` ~103 KB, `gtag/js`) load on browser
 *     idle (`lazyOnload`). On load they drain the buffered queue / dataLayer,
 *     so every buffered event fires then. Net: same tracking, ~100 KB+ of
 *     script execution moved off the critical path → lower TBT on mobile.
 *
 * Both are invisible tracking tags — zero visual/render impact.
 */
import Script from 'next/script';
import { GA4_ID, GOOGLE_ADS_ID, META_PIXEL_ID } from '@/lib/analytics';

export function AnalyticsScripts() {
  return (
    <>
      {META_PIXEL_ID && (
        <>
          {/* fbq stub + PageView — afterInteractive so window.fbq exists early
              and buffers calls in fbq.queue until the library loads. NOTE: the
              standard snippet's fbevents.js loader is intentionally removed
              here; it's loaded separately below on idle. */}
          <Script id="meta-pixel-init" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[]}(window,document,'script');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');`}
          </Script>
          {/* Heavy fbevents.js (~103 KB) loads on browser idle; on load it
              drains fbq.queue, so the buffered PageView + any early
              ViewContent fire then. */}
          <Script
            id="meta-pixel-lib"
            src="https://connect.facebook.net/en_US/fbevents.js"
            strategy="lazyOnload"
          />
          {/* No-JS fallback pixel — fires PageView via the 1x1 img request
              for users with JavaScript disabled. */}
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {(GOOGLE_ADS_ID || GA4_ID) && (
        <>
          {/* gtag stub + config — afterInteractive so window.gtag/dataLayer
              exist early and buffer events into dataLayer until gtag.js loads. */}
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              ${GA4_ID ? `gtag('config', '${GA4_ID}');` : ''}
              ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ''}`}
          </Script>
          {/* gtag.js loader loads on idle; it replays the buffered dataLayer
              on load, so no event is lost. */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID || GOOGLE_ADS_ID}`}
            strategy="lazyOnload"
          />
        </>
      )}
    </>
  );
}
