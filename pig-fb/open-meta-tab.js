// open-meta-tab.js -- Open meta.ai in the Pig's headed Chrome (CDP :9223) and leave it open.
// Used when Nolan needs to log into Meta AI himself. Does NOT close anything.
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.goto('https://meta.ai/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront().catch(() => {});
  console.log(JSON.stringify({ ok: true, url: page.url() }));
  process.exit(0); // disconnect only; the tab and browser stay open
})().catch(e => { console.error(JSON.stringify({ ok: false, error: String(e && e.message || e) })); process.exit(1); });
