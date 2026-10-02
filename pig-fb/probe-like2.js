// Probe v2: map every Like control on the page to its nearest article ancestor.
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
    const artInfo = arts.map((a, i) => ({ i, textHead: a.innerText.slice(0, 80).replace(/\n/g, ' | ') }));
    const btns = Array.from(document.querySelectorAll('[aria-label="Like"]')).map(b => {
      const r = b.getBoundingClientRect();
      let el = b, artIdx = -1, depth = 0;
      while (el && depth < 12) { el = el.parentElement; depth++;
        if (el && el.getAttribute && el.getAttribute('role') === 'article') { artIdx = arts.indexOf(el); break; } }
      return { visible: r.width > 0 && r.height > 0, tag: b.tagName, role: b.getAttribute('role'),
               pressed: b.getAttribute('aria-pressed'), articleIdx: artIdx, label: b.getAttribute('aria-label') };
    });
    return { artInfo, btns };
  });
  console.log(JSON.stringify(out, null, 2));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + e.message); process.exit(1); });
