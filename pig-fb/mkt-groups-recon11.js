#!/usr/bin/env node
// Recon 11: open "More options" for the Avalon listing, dump the menu.
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
    await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(9000);
    const clicked = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, [role="button"]'));
      const t = els.find(el => /more options for 2008 toyota avalon/i.test(el.getAttribute('aria-label') || ''));
      if (t) { t.scrollIntoView({ block: 'center' }); t.click(); return true; }
      return false;
    });
    out.menuClicked = clicked;
    await sleep(4000);
    out.menuItems = await page.evaluate(() => {
      const res = [];
      document.querySelectorAll('[role="menu"] [role="menuitem"], [role="menu"] a').forEach(el => {
        const t = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 70);
        if (t) res.push(t);
      });
      return res;
    });
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-more-options.png' });
    fs.writeFileSync('C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon11.result.json', JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1).slice(0, 2500));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
