#!/usr/bin/env node
// Supplementary multi-width screenshots for presence acceptance.
// Windows-side CDP probe. Usage: shot-widths.cjs <base> <outdir>
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.argv[2];
const OUTDIR = process.argv[3];
const WIDTHS = [1280, 1920, 375];
const PAGES = [
  ['hpp', '/sites/happy-place'],
  ['copper', '/sites/coppersmith-plumbing'],
];
(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e).slice(0, 150)));
  const out = [];
  for (const [slug, path] of PAGES) {
    for (const w of WIDTHS) {
      const h = w < 500 ? 812 : 900;
      await page.setViewportSize({ width: w, height: h });
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
      await sleep(4000);
      const st = await page.evaluate(() => {
        const layer = document.querySelector('[data-testid="object-layer"]');
        let fixed = 0;
        if (layer) layer.querySelectorAll('*').forEach(el => { if (getComputedStyle(el).position === 'fixed') fixed++; });
        return { layerFound: !!layer, projection: layer && layer.getAttribute('data-projection'), fixed };
      });
      const shot = `${OUTDIR}/${slug}-${w}.png`;
      await page.screenshot({ path: shot });
      out.push({ slug, width: w, ...st, shot });
    }
  }
  await page.close();
  console.log(JSON.stringify({ shots: out, pageerrors: errs }));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e).slice(0, 300)); process.exit(1); });
