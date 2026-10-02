const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 15000 });
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  const bad = [];
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  await page.goto('http://172.21.65.209:3100/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(5000);
  console.log('BAD_RESPONSES ' + JSON.stringify(bad));
  await page.close();
  process.exit(0);
})().catch(e => { console.log('FATAL ' + String(e.message).slice(0,120)); process.exit(1); });
