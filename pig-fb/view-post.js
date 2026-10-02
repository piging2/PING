// view-post.js -- READ-ONLY: open one IG post URL on the Pig ig-profile
// Chrome (:9226) and dump text + image alts for vetting/comment grounding.
// No likes, comments, follows, DMs. Usage: node view-post.js <url>
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2];
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9226', { timeout: 20000 });
  const ctxs = browser.contexts();
  const ctx = ctxs.find(c => c.pages().length) || ctxs[0];
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(7000);
  const data = await page.evaluate(() => {
    const alts = [];
    document.querySelectorAll('article img').forEach(i => { if (i.alt) alts.push(i.alt); });
    const cap = document.querySelector('article h1, article div[dir="auto"]');
    return { text: document.body.innerText.slice(0, 2500), alts: alts.slice(0, 8) };
  });
  console.log(JSON.stringify(data, null, 1));
  await page.close();
  await browser.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
