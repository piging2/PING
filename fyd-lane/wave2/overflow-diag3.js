#!/usr/bin/env node
// Identify the exact overflowing element: outerHTML snippet + parent chain.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://100.79.154.43:3100';
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
  await sleep(1500);
  const info = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const hits = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 50) {
        const chain = [];
        let p = el;
        for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
          chain.push(p.tagName + (p.id ? '#' + p.id : '') + '.' + String(p.className).split(' ').slice(0, 3).join('.'));
        }
        hits.push({
          tag: el.tagName,
          cls: String(el.className).slice(0, 80),
          right: Math.round(r.right), x: Math.round(r.x), w: Math.round(r.width),
          html: el.outerHTML.slice(0, 200),
          chain,
        });
        if (hits.length >= 5) break;
      }
    }
    return { vw, scrollW: document.documentElement.scrollWidth, hits };
  });
  console.log('vw=' + info.vw + ' scrollW=' + info.scrollW);
  for (const h of info.hits) console.log(JSON.stringify(h, null, 1).slice(0, 900));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
