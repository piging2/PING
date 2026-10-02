#!/usr/bin/env node
// Recon: inspect the group-distribution UI for Nolan's Marketplace car listing.
// Runs on the Pig. Attaches via CDP to the always-on headed Chrome (:9223).
// Never launches or closes the browser. Opens ONE new tab, closes it when done.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LISTING_ID = '1036291262797157';

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  const out = { controls: [], groups: [], notes: [] };
  try {
    await page.goto(`https://www.facebook.com/marketplace/item/${LISTING_ID}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    // Candidate controls: anything mentioning share/manage/groups/more
    const controls = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, [role="button"], [role="menuitem"]'));
      return els
        .map(e => ({ text: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 80) }))
        .filter(c => /share|manage|group|more|\.\.\./i.test(c.text))
        .slice(0, 40);
    });
    out.controls = controls;
    // Look for group chips/names on the listing page itself
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 4000));
    out.notes.push('BODY_HEAD:' + bodyText.replace(/\n+/g, ' | ').slice(0, 1500));
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
