#!/usr/bin/env node
// Width-parameterized hydration probe. Usage: probe-width-418.cjs <url> <width>
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = process.argv[2];
const W = parseInt(process.argv[3] || '1440', 10);
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.setViewportSize({ width: W, height: W < 500 ? 812 : 900 });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e).slice(0, 120)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(7000);
  const st = await page.evaluate(() => ({
    layer: !!document.querySelector('[data-testid="object-layer"]'),
    proj: (document.querySelector('[data-testid="object-layer"]') || {}).getAttribute
      ? document.querySelector('[data-testid="object-layer"]').getAttribute('data-projection') : null,
  })).catch(e => ({ evalError: String(e).slice(0, 80) }));
  await page.close();
  console.log(JSON.stringify({ url: URL, width: W, n418: errs.filter(e => e.includes('418')).length, pageerrors: errs.slice(0, 3), state: st }));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e).slice(0, 300)); process.exit(1); });
