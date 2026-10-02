#!/usr/bin/env node
// Recon 6: "Your listings" dashboard -> open the Avalon listing's manage view,
// look for the group distribution UI (posted groups, pending states).
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
    await page.goto('https://www.facebook.com/marketplace/you/listings', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(9000);
    out.url = page.url();
    // Find the Avalon listing entry and click it.
    const found = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a'));
      const t = els.find(el => /Avalon/i.test((el.innerText || '').trim()) && /marketplace\/item/.test(el.getAttribute('href') || ''));
      if (t) { t.scrollIntoView({ block: 'center' }); return t.getAttribute('href'); }
      return null;
    });
    out.listingHref = found;
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-your-listings.png' });
    const dump = await page.evaluate(() => {
      const res = [];
      document.querySelectorAll('button, [role="button"], a').forEach(b => {
        const t = (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 60);
        if (t && /avalon|manage|group|boost|share|more/i.test(t) && !res.includes(t)) res.push(t);
      });
      return res.slice(0, 40);
    });
    out.controls = dump;
    fs.writeFileSync('C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon6.result.json', JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1).slice(0, 4000));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
