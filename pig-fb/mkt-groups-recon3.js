#!/usr/bin/env node
// Recon 3: click "Buy and sell groups" on the listing, dump the group panel:
// group names + states (active/pending) + remove/add controls.
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LISTING_ID = '1036291262797157';
const RES = 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon3.result.json';
const out = { panelText: null, groups: [], controls: [], notes: [] };

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto(`https://www.facebook.com/marketplace/item/${LISTING_ID}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    const clicked = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const t = els.find(el => /buy and sell groups/i.test((el.innerText || el.getAttribute('aria-label') || '').trim()));
      if (t) { t.click(); return true; }
      return false;
    });
    out.notes.push('groupsClicked=' + clicked);
    await sleep(6000);
    out.panelText = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      const src = dlg || document.body;
      return src.innerText.slice(0, 5000).replace(/\n+/g, ' | ');
    });
    out.groups = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]') || document.body;
      const items = Array.from(dlg.querySelectorAll('li, [role="listitem"], [role="checkbox"], label'));
      return items.map(e => (e.innerText || '').trim().replace(/\n+/g, ' / ').slice(0, 140))
        .filter(t => t.length > 3).slice(0, 80);
    });
    out.controls = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]') || document.body;
      const els = Array.from(dlg.querySelectorAll('button, [role="button"]'));
      return els.map(e => (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 50))
        .filter((t, i, a) => t && a.indexOf(t) === i).slice(0, 40);
    });
    fs.writeFileSync(RES, JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
    await page.close();
    process.exit(0);
  } catch (e) {
    out.error = String(e.message || e).slice(0, 300);
    try { fs.writeFileSync(RES, JSON.stringify(out, null, 1)); } catch (_) {}
    console.log(JSON.stringify(out, null, 1));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
