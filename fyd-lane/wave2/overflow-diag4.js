#!/usr/bin/env node
// Measure intrinsic widths: grid, each card, label, to find the width forcer.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://100.79.154.43:3100';
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE + '/#status', { waitUntil: 'networkidle', timeout: 45000 });
  await sleep(1500);
  const info = await page.evaluate(() => {
    const grid = document.querySelector('#status .mt-10.grid');
    const gr = grid.getBoundingClientRect();
    const rows = [...document.querySelectorAll('#status h3')].map(h3 => {
      const card = h3.closest('.flex');
      const r = card.getBoundingClientRect();
      // intrinsic min-content: clone measurement via scrollWidth of text div
      const textDiv = h3.parentElement;
      return {
        label: h3.textContent.slice(0, 24),
        cardW: Math.round(r.width), cardX: Math.round(r.x),
        textScrollW: textDiv.scrollWidth, textClientW: textDiv.clientWidth,
      };
    });
    rows.sort((a, b) => b.cardW - a.cardW);
    return {
      vw: document.documentElement.clientWidth,
      gridW: Math.round(gr.width), gridX: Math.round(gr.x),
      widest: rows.slice(0, 4),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
