#!/usr/bin/env node
// check-post.js -- Check if today's PING Social post is live. Usage: node check-post.js <probe-text>
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const probe = process.argv[2] || "what's eating your week";
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.goto('https://www.facebook.com/profile.php?id=61594275542163', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  for (let i = 0; i < 4; i++) {
    const found = await page.evaluate((p) => document.body.innerText.includes(p), probe);
    if (found) { console.log(JSON.stringify({ live: true })); await page.close(); process.exit(0); }
    await page.mouse.wheel(0, 900); await sleep(2000);
  }
  console.log(JSON.stringify({ live: false }));
  await page.close();
  process.exit(1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
