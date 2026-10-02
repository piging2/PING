#!/usr/bin/env node
// Overflow diag round 2: elements whose right edge exceeds the viewport.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://100.79.154.43:3100';
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
  await sleep(1200);
  const bad = await page.evaluate(() => {
    const out = [];
    const vw = document.documentElement.clientWidth;
    const seen = new Set();
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 10) {
        const key = el.tagName + '|' + Math.round(r.right);
        if (seen.has(key)) continue;
        seen.add(key);
        const cls = (typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 5).join('.');
        out.push({ tag: el.tagName, cls: cls.slice(0, 70), right: Math.round(r.right), w: Math.round(r.width), text: (el.innerText || '').slice(0, 35).replace(/\n/g, ' ') });
        if (out.length >= 15) break;
      }
    }
    return { vw, scrollW: document.documentElement.scrollWidth, bad: out };
  });
  console.log('OVERFLOW2 vw=' + bad.vw + ' scrollW=' + bad.scrollW);
  for (const b of bad.bad) console.log('  ' + JSON.stringify(b));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
