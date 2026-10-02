#!/usr/bin/env node
// Check whether the status-card fix is live in the browser DOM.
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
  const info = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('h3')].filter(h => h.textContent.includes('Event plane'));
    const h3 = cards[0];
    const textDiv = h3 ? h3.parentElement : null;
    const card = textDiv ? textDiv.parentElement : null;
    const r = textDiv ? textDiv.getBoundingClientRect() : null;
    return {
      found: !!h3,
      textDivClass: textDiv ? textDiv.className : 'NONE',
      cardClass: card ? String(card.className).slice(0, 60) : 'NONE',
      textDivRight: r ? Math.round(r.right) : -1,
      vw: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
