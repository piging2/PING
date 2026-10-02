#!/usr/bin/env node
// Recon 5: thorough DOM dump of the listing page to find group management.
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
    out.url = page.url();
    out.dump = await page.evaluate(() => {
      const res = [];
      // All links with hrefs containing 'group'
      document.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href') || '';
        const t = (a.innerText || '').trim().slice(0, 60);
        if (/group/i.test(href) || /group/i.test(t)) res.push('LINK: ' + t + ' -> ' + href.slice(0, 120));
      });
      // All buttons/menuitems
      document.querySelectorAll('button, [role="button"], [role="menuitem"]').forEach(b => {
        const t = (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 60);
        if (t && !res.includes('BTN: ' + t)) res.push('BTN: ' + t);
      });
      // Any text mentioning groups or "listed in"
      const bodyT = document.body.innerText;
      const m = bodyT.match(/.{0,60}(listed in|buy and sell groups|pending approval|groups).{0,60}/gi);
      if (m) res.push('TEXTMATCH: ' + m.slice(0, 10).join(' ||| '));
      return res.slice(0, 80);
    });
    fs.writeFileSync('C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon5.result.json', JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1).slice(0, 6000));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
