/**
 * "Is this an automated client?" — shared by Vercel Analytics filtering and
 * our own visitor tracking, so both count the same humans.
 *
 * CONSERVATIVE on purpose — only signals with effectively zero false-positive
 * rate among real shoppers. We'd rather count a bot than drop a real buyer.
 *   1. navigator.webdriver === true   (Puppeteer / Playwright / Selenium)
 *   2. explicit headless / automation markers in the UA
 *   3. self-declared bots ("bot", "crawler", "spider", …)
 *   4. empty UA
 * Deliberately NOT used: missing plugins, empty languages, zero screen size.
 */
export const BOT_UA_RE =
  /headlesschrome|phantomjs|lighthouse|selenium|playwright|puppeteer|bot\/|bot |crawler|spider|scraper|fetcher|monitor|pingdom|newrelic|datadog|uptimerobot/i;

export function looksLikeBot(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (navigator.webdriver === true) return true;
  const ua = navigator.userAgent || '';
  if (!ua) return true;
  return BOT_UA_RE.test(ua);
}
