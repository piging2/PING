#!/usr/bin/env node
// Recon 9: open the "..." / More menu on the listing page, dump its items.
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
    await sleep(8000);
    const clicked = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, [role="button"], a'));
      // "More" buttons: aria-label "More" or "..." text, near the top of the listing
      const cands = els.filter(el => {
        const t = (el.innerText || '').trim();
        const al = el.getAttribute('aria-label') || '';
        return /^(\.\.\.|more)$/i.test(t) || /^(more|more options|see more options)$/i.test(al);
      });
      if (cands.length) { cands[0].scrollIntoView({ block: 'center' }); return cands.length; }
      return 0;
    });
    out.moreCandidates = clicked;
    await sleep(1200);
    const clicked2 = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, [role="button"], a'));
      const cands = els.filter(el => {
        const t = (el.innerText || '').trim();
        const al = el.getAttribute('aria-label') || '';
        return /^(\.\.\.|more)$/i.test(t) || /^(more|more options|see more options)$/i.test(al);
      });
      if (cands.length) { cands[0].click(); return true; }
      return false;
    });
    out.clicked = clicked2;
    await sleep(4000);
    out.menuItems = await page.evaluate(() => {
      const res = [];
      document.querySelectorAll('[role="menu"] [role="menuitem"], [role="dialog"] button').forEach(el => {
        const t = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60);
        if (t) res.push(t);
      });
      return [...new Set(res)].slice(0, 30);
    });
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-more-menu.png' });
    fs.writeFileSync('C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon9.result.json', JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1).slice(0, 2500));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
