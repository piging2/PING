#!/usr/bin/env node
// Recon 7: screenshot the listing page (seller view) + dump ALL clickable
// elements with coordinates, to find the group management entry point.
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LISTING_ID = '1036291262797157';
const out = {};
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto(`https://www.facebook.com/marketplace/item/${LISTING_ID}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(9000);
    // Scroll down to expose below-the-fold seller sections.
    await page.evaluate(() => window.scrollTo(0, 1200));
    await sleep(3000);
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-listing-seller1.png', fullPage: false });
    await page.evaluate(() => window.scrollTo(0, 3000));
    await sleep(3000);
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-listing-seller2.png', fullPage: false });
    out.buttons = await page.evaluate(() => {
      const res = [];
      document.querySelectorAll('button, [role="button"], [role="menuitem"], a').forEach(b => {
        const t = (b.innerText || b.getAttribute('aria-label') || '').trim().split('\n')[0].slice(0, 60);
        if (t && t.length > 1) res.push(t);
      });
      return [...new Set(res)].slice(0, 80);
    });
    fs.writeFileSync('C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon7.result.json', JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out.buttons, null, 1).slice(0, 3000));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
