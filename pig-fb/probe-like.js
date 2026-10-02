// Read-only probe: which like-button selectors match on a Facebook post URL. No clicks.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const url = (process.argv[2] || '').replace(/^['"]+|['"]+$/g, '');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const out = await page.evaluate(() => {
    const q = s => document.querySelectorAll(s).length;
    const articles = document.querySelectorAll('div[role="article"]');
    const first = articles[0];
    const inFirst = sel => first ? first.querySelectorAll(sel).length : -1;
    const vis = Array.from(document.querySelectorAll('[aria-label="Like"]'))
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length;
    const likeLabels = Array.from(document.querySelectorAll('[aria-label]'))
      .map(e => e.getAttribute('aria-label'))
      .filter(l => /like/i.test(l)).slice(0, 10);
    return {
      articleCount: articles.length,
      inFirstArticle_ariaLike: inFirst('[aria-label="Like"]'),
      page_ariaLike: q('[aria-label="Like"]'),
      page_ariaLike_visible: vis,
      likeishLabels: likeLabels,
      firstArticleTextHead: first ? first.innerText.slice(0, 120) : null,
    };
  });
  console.log(JSON.stringify(out, null, 2));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + e.message); process.exit(1); });
