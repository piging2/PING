#!/usr/bin/env node
// feed-check.js -- Scroll the PING Social page feed and look for the post.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const probe = process.argv[2] || "what's eating your week";
(async () => {
  const out = { live: false, posts: [] };
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://www.facebook.com/profile.php?id=61594275542163', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    for (let i = 0; i < 8; i++) {
      const found = await page.evaluate((p) => {
        const arts = Array.from(document.querySelectorAll('[role="article"]'));
        const texts = arts.map(a => (a.innerText || '').slice(0, 300).replace(/\n/g, ' | '));
        return { hit: document.body.innerText.includes(p), texts: texts.slice(0, 5), n: arts.length };
      });
      if (found.hit) { out.live = true; out.posts = found.texts; break; }
      out.posts = found.texts;
      await page.mouse.wheel(0, 700);
      await sleep(2500);
    }
    await page.screenshot({ path: 'C:/Windows/Temp/feed-check.png' });
  } catch (e) { out.error = String(e.message || e).slice(0, 200); }
  await page.close();
  console.log(JSON.stringify(out, null, 1));
  process.exit(out.live ? 0 : 1);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
