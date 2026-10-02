#!/usr/bin/env node
// Dev-mode hydration probe: loads a URL in the house :9223 browser at
// 1440x900 with console listeners attached BEFORE navigation, and dumps
// the FULL console error text (dev React prints the component stack).
// Also reports prefers-reduced-motion state in that browser.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URLS = process.argv.slice(2);

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const report = { pages: [] };
  for (const url of URLS) {
    const errors = [];
    const onConsole = msg => {
      if (msg.type() !== 'error') return;
      errors.push(msg.text().slice(0, 6000));
    };
    const onPageError = err => errors.push('PAGEERROR: ' + String((err && err.stack) || err).slice(0, 2000));
    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
      await sleep(10000);
    } catch (e) { errors.push('NAV: ' + String(e.message).slice(0, 300)); }
    let rm = null;
    try { rm = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    report.pages.push({ url, reducedMotion: rm, errorCount: errors.length, errors: errors.slice(0, 6) });
  }
  await page.close();
  console.log(JSON.stringify(report, null, 1));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
