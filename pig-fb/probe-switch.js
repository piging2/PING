#!/usr/bin/env node
// probe-switch.js -- Open the top-right profile switcher and list its options.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  // Click the profile avatar (top-right). It's the last nav element with Nolan's photo.
  const avatars = page.locator('[aria-label="Your profile"]').first();
  if (await avatars.count() > 0) { await avatars.click(); await sleep(3000); }
  else {
    // fallback: click the last clickable image in the top bar
    await page.evaluate(() => {
      const nav = document.querySelector('[role="banner"]') || document.body;
      const imgs = nav.querySelectorAll('img');
      const last = imgs[imgs.length - 1];
      if (last) last.click();
    });
    await sleep(3000);
  }
  const opts = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('[role="menuitem"], [role="button"]').forEach(el => {
      const t = (el.innerText || '').trim().split('\n')[0];
      if (t && t.length < 60 && !out.includes(t)) out.push(t);
    });
    return out.slice(0, 30);
  });
  console.log(JSON.stringify(opts, null, 1));
  await page.screenshot({ path: 'C:/Windows/Temp/probe-switch.png' });
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
