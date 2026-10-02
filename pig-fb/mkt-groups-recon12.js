#!/usr/bin/env node
// Recon 12: open "List in more places", dump the group dialog completely.
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
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, [role="button"]'));
      const t = els.find(el => /more options for 2008 toyota avalon/i.test(el.getAttribute('aria-label') || ''));
      if (t) { t.scrollIntoView({ block: 'center' }); t.click(); }
    });
    await sleep(3500);
    const opened = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[role="menu"] [role="menuitem"]'));
      const t = items.find(el => /list in more places/i.test((el.innerText || '').trim()));
      if (t) { t.click(); return true; }
      return false;
    });
    out.listInMorePlacesClicked = opened;
    await sleep(9000);
    out.dialogText = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText.slice(0, 6000).replace(/\n+/g, ' | ') : 'NO_DIALOG';
    });
    out.dialogItems = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]') || document.body;
      const res = [];
      d.querySelectorAll('[role="checkbox"], [role="listitem"], li, label').forEach(el => {
        const t = (el.innerText || '').trim().replace(/\n+/g, ' / ').slice(0, 130);
        const checked = el.getAttribute('aria-checked');
        if (t && t.length > 3) res.push((checked ? '[aria-checked=' + checked + '] ' : '') + t);
      });
      return res.slice(0, 100);
    });
    out.dialogButtons = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]') || document.body;
      const res = [];
      d.querySelectorAll('button, [role="button"]').forEach(el => {
        const t = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 50);
        if (t) res.push(t);
      });
      return [...new Set(res)].slice(0, 30);
    });
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-list-more-places.png' });
    fs.writeFileSync('C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon12.result.json', JSON.stringify(out, null, 1));
    console.log(JSON.stringify({ listInMorePlacesClicked: out.listInMorePlacesClicked, dialogButtons: out.dialogButtons, nItems: out.dialogItems.length }, null, 1));
    console.log('DIALOG_HEAD: ' + (out.dialogText || '').slice(0, 2000));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
