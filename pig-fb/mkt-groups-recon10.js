#!/usr/bin/env node
// Recon 10: click "Selling" in marketplace left nav, dump the seller dashboard.
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = {};
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://www.facebook.com/marketplace/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    const clicked = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a, [role="button"], button'));
      const t = els.find(el => /^(selling)$/i.test((el.innerText || '').trim()));
      if (t) { t.click(); return true; }
      return false;
    });
    out.sellingClicked = clicked;
    await sleep(8000);
    out.url = page.url();
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-selling.png' });
    out.dump = await page.evaluate(() => {
      const res = [];
      document.querySelectorAll('a, button, [role="button"]').forEach(b => {
        const t = (b.innerText || b.getAttribute('aria-label') || '').trim().split('\n')[0].slice(0, 60);
        if (t && /avalon|listing|manage|group|boost|share|edit|more/i.test(t)) res.push(t);
      });
      return [...new Set(res)].slice(0, 50);
    });
    const bodyT = await page.evaluate(() => document.body.innerText.slice(0, 1500).replace(/\n+/g, ' | '));
    out.bodyHead = bodyT;
    fs.writeFileSync('C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon10.result.json', JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1).slice(0, 3500));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
