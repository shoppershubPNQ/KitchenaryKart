/**
 * Conditional injection of Meta Pixel + Google gtag (Ads + GA4).
 *
 * Renders nothing unless the corresponding env var is set, so it's
 * safe to deploy before the marketing team has the IDs. Uses
 * next/script with strategy="afterInteractive" so the tags load
 * after the page is interactive — they never block render or LCP.
 *
 * One <Script> per integration:
 *   1. Meta Pixel base + noscript fallback
 *   2. gtag.js shared loader (loaded once with whichever ID exists)
 *   3. gtag() config call(s) for Google Ads + GA4
 */
import Script from 'next/script';
import { GA4_ID, GOOGLE_ADS_ID, META_PIXEL_ID } from '@/lib/analytics';

export function AnalyticsScripts() {
  return (
    <>
      {META_PIXEL_ID && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');`}
          </Script>
          {/* No-JS fallback pixel — fires PageView server-side via the
              1x1 img request for users with JavaScript disabled. */}
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
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID || GOOGLE_ADS_ID}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              ${GA4_ID ? `gtag('config', '${GA4_ID}');` : ''}
              ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ''}`}
          </Script>
        </>
      )}
    </>
  );
}
