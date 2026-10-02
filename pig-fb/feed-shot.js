#!/usr/bin/env node
// feed-shot.js -- Screenshot the top of the PING Social page feed + dump first posts' text.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.goto('https://www.facebook.com/profile.php?id=61594275542163', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(7000);
  await page.mouse.wheel(0, 1200); await sleep(3000);
  await page.screenshot({ path: 'C:/Windows/Temp/feed-top.png' });
  const texts = await page.evaluate(() => {
    const arts = Array.from(document.querySelectorAll('[role="article"]')).slice(0, 4);
    return arts.map(a => (a.innerText || '').slice(0, 200).replace(/\n/g, ' | '));
  });
  console.log(JSON.stringify(texts, null, 1));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
