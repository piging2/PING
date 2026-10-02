#!/usr/bin/env node
// Extension-isolation probe: loads the two site pages in a FRESH incognito
// context (no extensions, no cookies) via the house :9223 browser and reports
// whether React #418 still fires. Closes the context afterwards; the
// persistent profile and its tabs are untouched.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URLS = process.argv.slice(2);

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const report = { context: 'fresh-incognito-no-extensions', pages: [] };
  for (const url of URLS) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push('PAGEERROR: ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : String(err)).slice(0, 300)));
    page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text().slice(0, 300)); });
    let navError = null;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
      await sleep(8000);
    } catch (e) { navError = String((e && e.message) || e).slice(0, 200); }
    const has418 = errors.some(t => t.includes('#418'));
    report.pages.push({ url, navError, has418, errorCount: errors.length, errors: errors.slice(0, 4) });
    await page.close();
  }
  await ctx.close();
  console.log(JSON.stringify(report));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 300)); process.exit(1); });
