/**
 * IndexNow: tell Bing (which feeds ChatGPT search, Copilot, DuckDuckGo) and
 * Yandex/Seznam/Naver about our URLs straight away instead of waiting for a
 * recrawl. Google does NOT use IndexNow — Search Console stays the route there.
 *
 * The key is public by design: it only proves we own the host, because the
 * same value is served at https://kitchenarykart.com/<key>.txt. Run AFTER a
 * deploy that includes that file.
 *
 *   node scripts/indexnow-submit.mjs                 # every URL in the live sitemap
 *   node scripts/indexnow-submit.mjs --dry           # list, don't send
 *   node scripts/indexnow-submit.mjs <url> [<url>…]  # just these pages
 */
const HOST = 'kitchenarykart.com';
const KEY = 'b7e4c1a9f25d4e8c9a3f6d1e0c7b2a58';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function sitemapUrls() {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

// No process.exit() anywhere: on Windows it can abort Node while a fetch
// socket is still closing. Set exitCode and return instead.
async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const given = args.filter((a) => a.startsWith('http'));

  const keyRes = await fetch(KEY_LOCATION);
  const keyLive = keyRes.ok && (await keyRes.text()).trim() === KEY;
  if (!keyLive) {
    console.error(`Key file not live at ${KEY_LOCATION} — deploy first. Nothing sent.`);
    process.exitCode = 1;
    return;
  }

  const urls = (given.length ? given : await sitemapUrls()).filter((u) => new URL(u).host === HOST);
  console.log(`${urls.length} URL(s)${dry ? ' [dry run]' : ''}`);
  if (dry || urls.length === 0) return;

  // The protocol allows 10,000 URLs per request.
  for (let i = 0; i < urls.length; i += 10000) {
    const urlList = urls.slice(i, i + 10000);
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    // 200 = accepted, 202 = accepted (key validation pending). Anything else is a problem.
    console.log(`batch ${i / 10000 + 1}: ${urlList.length} URLs -> HTTP ${res.status} ${await res.text()}`);
    if (res.status !== 200 && res.status !== 202) process.exitCode = 1;
  }
}

await main();
