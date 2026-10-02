// FYD Lane C bounded measurement: Playwright 1.63.0 (repo's own devDep install).
// Runs on the Pig via pigwsl-run.sh from /home/nolan/projects/ping so that
// require('playwright') resolves to the repo's installed 1.63.0.
// 3 sites x 2 runs. No installs. Small request counts. robots.txt honored
// (homepage only on each host; coppersmith has Crawl-delay: 10 -> 10s gap).
const { chromium } = require('playwright');

const SITES = [
  ['hpp', 'https://happy-place-platform.vercel.app/'],
  ['coppersmith', 'https://www.coppersmithplumbing.com/'],
  ['mrrooter', 'https://www.mrrooter.com/'],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = {};
  for (const [name, url] of SITES) {
    out[name] = [];
    for (let run = 0; run < 2; run++) {
      const t0 = Date.now();
      const page = await browser.newPage();
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        const d = await page.evaluate(() => {
          const txt = document.body ? document.body.innerText : '';
          return {
            title: document.title,
            h1: [...document.querySelectorAll('h1')].map(e => e.innerText.trim()).slice(0, 8),
            textLen: txt.length,
            jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].length,
            phones: [...new Set(txt.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) || [])].slice(0, 5),
            linkCount: document.querySelectorAll('a').length,
            // JS-only evidence proxies: SPA frameworks leave markers
            spaMarkers: {
              nextData: !!document.getElementById('__NEXT_DATA__'),
              nuxt: !!document.getElementById('__NUXT__'),
              reactRoot: !!document.querySelector('[data-reactroot],#root,#__next'),
              scripts: document.querySelectorAll('script[src]').length,
            },
          };
        });
        out[name].push({ ok: true, status: resp ? resp.status() : null, ms: Date.now() - t0, ...d, err: null });
      } catch (e) {
        out[name].push({ ok: false, ms: Date.now() - t0, err: String(e).split('\n')[0] });
      }
      await page.close();
      if (name === 'coppersmith') await new Promise(r => setTimeout(r, 10000));
    }
  }
  await browser.close();
  console.log(JSON.stringify(out));
})().catch(e => { console.error('FATAL', String(e).split('\n')[0]); process.exit(1); });
