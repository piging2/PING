#!/usr/bin/env node
// Diagnose horizontal overflow on / at 375px: find elements wider than viewport.
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
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 1 && r.width < vw + 400) {
        const id = el.id ? '#' + el.id : '';
        const cls = (typeof el.className === 'string' ? el.className : '').split(' ').slice(0, 4).join('.');
        out.push({ tag: el.tagName, id, cls, w: Math.round(r.width), x: Math.round(r.x), text: (el.innerText || '').slice(0, 40).replace(/\n/g, ' ') });
        if (out.length >= 12) break;
      }
    }
    return { vw, scrollW: document.documentElement.scrollWidth, bad: out };
  });
  console.log('OVERFLOW vw=' + bad.vw + ' scrollW=' + bad.scrollW);
  for (const b of bad.bad) console.log('  ' + JSON.stringify(b));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
