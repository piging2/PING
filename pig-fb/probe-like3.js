// Probe v3: for each article, look in its parent container for Like buttons.
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
    const arts = Array.from(document.querySelectorAll('div[role="article"]'));
    return arts.map((a, i) => {
      const p = a.parentElement;
      const inParent = p ? Array.from(p.querySelectorAll('[aria-label="Like"]')).map(b => {
        const r = b.getBoundingClientRect();
        return { visible: r.width > 0 && r.height > 0, y: Math.round(r.y) };
      }) : [];
      const sibs = [];
      if (p) for (const s of p.children) {
        const b = s.querySelector ? s.querySelector('[aria-label="Like"]') : null;
        if (b) { const r = b.getBoundingClientRect(); sibs.push({ tag: s.tagName, visible: r.width > 0 && r.height > 0, y: Math.round(r.y) }); }
      }
      return { i, textLen: a.innerText.length, textHead: a.innerText.slice(0, 60).replace(/\n/g, ' | '),
               parentTag: p ? p.tagName : null, likeInParent: inParent, likeInSiblings: sibs };
    });
  });
  console.log(JSON.stringify(out, null, 2));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + e.message); process.exit(1); });
