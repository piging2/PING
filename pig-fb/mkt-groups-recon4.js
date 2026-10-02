#!/usr/bin/env node
// Recon 4: click "Buy and sell groups", wait, screenshot, dump dialog text again.
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LISTING_ID = '1036291262797157';
const out = { notes: [] };
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto(`https://www.facebook.com/marketplace/item/${LISTING_ID}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    // Scroll the control into view first, then click.
    const clicked = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const t = els.find(el => /buy and sell groups/i.test((el.innerText || el.getAttribute('aria-label') || '').trim()));
      if (t) { t.scrollIntoView({ block: 'center' }); return true; }
      return false;
    });
    await sleep(1500);
    const clicked2 = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const t = els.find(el => /buy and sell groups/i.test((el.innerText || el.getAttribute('aria-label') || '').trim()));
      if (t) { t.click(); return true; }
      return false;
    });
    out.notes.push('found=' + clicked, 'clicked=' + clicked2);
    await sleep(12000);
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-panel.png' });
    const dlg = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? d.innerText.slice(0, 3000).replace(/\n+/g, ' | ') : 'NO_DIALOG';
    });
    out.notes.push('DIALOG:' + dlg.slice(0, 1500));
    fs.writeFileSync('C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon4.result.json', JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
    await page.close();
    process.exit(0);
  } catch (e) {
    out.error = String(e.message || e).slice(0, 300);
    console.log(JSON.stringify(out, null, 1));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
