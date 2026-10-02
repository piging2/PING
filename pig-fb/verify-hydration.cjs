#!/usr/bin/env node
// Hydration verification for FYD demo sites. Runs on the Pig (Windows):
// portable node + playwright-core, attaches to the house headed Chrome
// (:9223, profile nolanpigi) via CDP, opens ONE new tab (closed at the end),
// loads each URL at 1440x900 with console/pageerror listeners attached BEFORE
// navigation, and captures errors/warnings verbatim plus a screenshot.
// Never closes the browser. Read-only except for the new tab and screenshots.
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUTDIR = process.argv[2] || 'C:/Users/nolan/.local/share/pigi/fb-engage/hydration-20260925';
const URLS = process.argv.slice(3);

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const report = { viewport: '1440x900', pages: [] };

  for (const url of URLS) {
    const errors = [];
    const warnings = [];
    const onConsole = msg => {
      const type = msg.type();
      if (type !== 'error' && type !== 'warning') return;
      const entry = { text: msg.text(), location: msg.location() };
      if (type === 'error') errors.push(entry); else warnings.push(entry);
    };
    const onPageError = err => errors.push({
      text: 'PAGEERROR: ' + (err && err.stack ? err.stack : String(err)),
      location: null,
    });
    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    let navError = null;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
      await sleep(9000); // let hydration settle and any late errors land
    } catch (e) { navError = String((e && e.message) || e).slice(0, 500); }

    const state = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      nextRootChildTags: Array.from(document.querySelectorAll('#__next > *')).map(el => el.tagName).slice(0, 12),
      bodyTextStart: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400),
      nextjsErrorOverlay: !!document.querySelector('nextjs-portal'),
    })).catch(e => ({ error: String(e).slice(0, 200) }));

    const slug = /happy-place/.test(url) ? 'hpp' : (/coppersmith/.test(url) ? 'copper' : 'page' + report.pages.length);
    const shotPath = OUTDIR + '/' + slug + '-1440.png';
    try { await page.screenshot({ path: shotPath }); }
    catch (e) { errors.push({ text: 'SCREENSHOT_FAILED: ' + String(e.message).slice(0, 200), location: null }); }

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    report.pages.push({ url, navError, consoleErrors: errors, consoleWarnings: warnings, state, shotPath });
  }

  await page.close();
  // Do NOT close the browser; it must stay running.
  console.log(JSON.stringify(report));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
