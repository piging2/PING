#!/usr/bin/env node
// Touch target audit: list every button/a under 44px on mobile for both sites.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  const BASE = 'http://100.79.154.43:3100';
  for (const site of ['happy-place', 'coppersmith-plumbing']) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 375, height: 667 });
    await p.goto(BASE + '/sites/' + site, { waitUntil: 'networkidle', timeout: 45000 });
    await sleep(1200);
    const bad = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('button, a')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.width < 44 || r.height < 44) {
          const cls = (el.className && el.className.baseVal !== undefined) ? '' : String(el.className || '');
          out.push({
            tag: el.tagName,
            text: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 40),
            href: (el.getAttribute('href') || '').slice(0, 60),
            size: Math.round(r.width) + 'x' + Math.round(r.height),
            y: Math.round(r.top),
            cls: cls.slice(0, 80),
          });
        }
      }
      return out;
    });
    console.log('SITE ' + site + ' bad=' + bad.length);
    for (const b of bad.slice(0, 12)) console.log('  ' + JSON.stringify(b));
    await p.close();
  }
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(1); });
