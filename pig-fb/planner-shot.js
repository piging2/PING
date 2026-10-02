#!/usr/bin/env node
// planner-shot.js -- Open the Page Planner and list posts.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.goto('https://www.facebook.com/profile.php?id=61594275542163', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const planner = page.locator('a, [role="link"]', { hasText: /^Planner$/ }).first();
  if (await planner.count() > 0) { await planner.click(); await sleep(8000); }
  await page.screenshot({ path: 'C:/Windows/Temp/planner.png' });
  const info = await page.evaluate(() => {
    const t = document.body.innerText;
    const idx = t.indexOf("what's eating your week");
    return { hasProbe: idx >= 0, probeCount: (t.match(/what's eating your week/g) || []).length, url: location.href, title: document.title };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
