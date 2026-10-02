#!/usr/bin/env node
// click-cal-thumb.js -- Click the Wed 4pm calendar thumbnail and screenshot the preview.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const probe = process.argv[2] || "what's eating your week";
(async () => {
  const out = { live: false };
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://www.facebook.com/professional_dashboard/content_calendar/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    // Thumbnail center in screenshot px was ~ (840, 520); CSS = px / 1.25.
    await page.mouse.click(672, 416);
    await sleep(5000);
    await page.screenshot({ path: 'C:/Windows/Temp/thumb-preview.png' });
    out.live = await page.evaluate((p) => document.body.innerText.includes(p), probe);
    out.dialogOpen = await page.locator('[role="dialog"]').count() > 0;
  } catch (e) { out.error = String(e.message || e).slice(0, 200); }
  await page.close();
  console.log(JSON.stringify(out, null, 1));
  process.exit(out.live ? 0 : 1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
