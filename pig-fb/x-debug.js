#!/usr/bin/env node
// DEBUG: dump article structure on with_replies and likes tabs to diagnose extraction.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9225', { timeout: 20000 });
  const ctx = (browser.contexts().find(c => c.pages().length) || browser.contexts()[0]);
  const page = await ctx.newPage();
  for (const url of ['https://x.com/sama/with_replies', 'https://x.com/karpathy/likes']) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollBy(0, 2800)); await sleep(2000); }
    const dump = await page.evaluate(() => {
      const out = [];
      const arts = document.querySelectorAll('article[data-testid="tweet"]');
      let n = 0;
      for (const art of arts) {
        if (n++ >= 5) break;
        const links = [...art.querySelectorAll('a[href]')].map(a => a.getAttribute('href') || '');
        const statusLinks = links.filter(h => /^\/[A-Za-z0-9_]+\/status\/\d+/.test(h));
        const handleLinks = links.filter(h => /^\/[A-Za-z0-9_]+$/.test(h));
        const inner = (art.innerText || '');
        out.push({
          nArticles: arts.length,
          statusLinks: statusLinks.slice(0, 3),
          handleLinks: handleLinks.slice(0, 8),
          innerStart: inner.slice(0, 200).replace(/\n/g, ' | '),
          hasTweetText: !!art.querySelector('div[data-testid="tweetText"]'),
          hasTime: !!art.querySelector('time'),
        });
      }
      return { nArticles: document.querySelectorAll('article[data-testid="tweet"]').length, sample: out };
    });
    console.log('URL ' + url);
    console.log(JSON.stringify(dump, null, 1).slice(0, 3000));
  }
  await page.close();
  process.exit(0);
})().catch(e => { console.error('DEBUG_ERROR ' + String((e && e.message) || e).slice(0, 200)); process.exit(1); });
