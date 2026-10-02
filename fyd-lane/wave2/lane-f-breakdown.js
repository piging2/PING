#!/usr/bin/env node
// Lane F part 2: per-request weight breakdown to find the heavy payloads.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://100.79.154.43:3100';
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  for (const u of ['/', '/sites/happy-place']) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const rows = [];
    page.on('response', async r => {
      try {
        const buf = await r.body().catch(() => null);
        if (buf && buf.length > 100 * 1024) {
          rows.push({ kb: Math.round(buf.length / 1024), url: r.url().replace(BASE, '').slice(0, 90), ct: (r.headers()['content-type'] || '').slice(0, 40) });
        }
      } catch (e) {}
    });
    await page.goto(BASE + u, { waitUntil: 'load', timeout: 45000 });
    await sleep(2000);
    rows.sort((a, b) => b.kb - a.kb);
    console.log('HEAVY ' + u);
    for (const r of rows.slice(0, 8)) console.log('  ' + r.kb + 'KB ' + r.ct + ' ' + r.url);
    await page.close();
  }
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
