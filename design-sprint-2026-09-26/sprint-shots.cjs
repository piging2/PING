#!/usr/bin/env node
// 24h design sprint visual loop: full-page screenshots at fixed widths.
// Runs WINDOWS-side via portable node (needs CDP :9223 house browser).
// Usage: node.exe sprint-shots.cjs <base> <outdir> <tag>
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.argv[2];
const OUTDIR = process.argv[3];
const TAG = process.argv[4] || 'shot';
const WIDTHS = [320, 375, 390, 768, 1280, 1440];
const PAGES = [['ping', '/'], ['hpp', '/sites/happy-place'], ['copper', '/sites/coppersmith-plumbing']];
(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e).slice(0, 150)));
  const out = [];
  for (const [slug, p] of PAGES) {
    for (const w of WIDTHS) {
      const h = w < 500 ? 844 : 900;
      await page.setViewportSize({ width: w, height: h });
      await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
      await sleep(3500);
      const shot = path.join(OUTDIR, `${TAG}-${slug}-${w}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      out.push({ slug, width: w, shot });
    }
  }
  await page.close();
  console.log(JSON.stringify({ shots: out, pageerrors: errs }));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e).slice(0, 300)); process.exit(1); });
