#!/usr/bin/env node
// Recon 8: check identity state and where the listing URL actually lands.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = {};
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://www.facebook.com/marketplace/item/1036291262797157/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    out.urlAfter6s = page.url();
    await sleep(8000);
    out.urlAfter14s = page.url();
    const state = await page.evaluate(() => {
      const t = document.body.innerText.slice(0, 2000);
      return {
        pageCantUse: /Pages can't use Marketplace/.test(t),
        hasAvalonTitle: /2008 Toyota Avalon XLS/.test(t),
        hasMarkAsSold: /Mark as sold/.test(t),
        head: t.replace(/\n+/g, ' | ').slice(0, 400)
      };
    });
    out.state = state;
    console.log(JSON.stringify(out, null, 1));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
