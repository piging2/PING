// Probe v4: anchor on the permalink link itself to find the main post's Like button.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const url = (process.argv[2] || '').replace(/^['"]+|['"]+$/g, '');
  const m = url.match(/permalink\/(\d+)/);
  const pid = m ? m[1] : '';
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const out = await page.evaluate((pid) => {
    const links = Array.from(document.querySelectorAll('a[href*="' + pid + '"]'));
    const res = { pid, linkCount: links.length, anchors: [] };
    for (const a of links.slice(0, 4)) {
      let el = a, depth = 0, found = null;
      while (el && depth < 15 && !found) {
        el = el.parentElement; depth++;
        if (el && el.querySelector) {
          const b = el.querySelector('[aria-label="Like"]');
          if (b) { const r = b.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) found = { depth, y: Math.round(r.y) }; }
        }
      }
      const lr = a.getBoundingClientRect();
      res.anchors.push({ linkText: (a.innerText || a.getAttribute('aria-label') || '').slice(0, 40),
                         y: Math.round(lr.y), likeFound: found });
    }
    return res;
  }, pid);
  console.log(JSON.stringify(out, null, 2));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + e.message); process.exit(1); });
