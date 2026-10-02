// Probe: click the like button on a group post and report its state before/after. 1 real like.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const url = (process.argv[2] || '').replace(/^['"]+|['"]+$/g, '');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const snap = () => page.evaluate(() => {
    const arts = Array.from(document.querySelectorAll('div[role="article"]'));
    for (const a of arts) {
      const b = a.querySelector('[aria-label="Like"]');
      if (b) {
        const r = b.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return {
            ariaLabel: b.getAttribute('aria-label'),
            ariaPressed: b.getAttribute('aria-pressed'),
            role: b.getAttribute('role'),
            tag: b.tagName,
            html: b.outerHTML.slice(0, 400),
            parentPressed: b.parentElement ? b.parentElement.getAttribute('aria-pressed') : null,
          };
        }
      }
    }
    return null;
  });
  const before = await snap();
  console.log('BEFORE ' + JSON.stringify(before));
  await page.evaluate(() => {
    const arts = Array.from(document.querySelectorAll('div[role="article"]'));
    for (const a of arts) {
      const b = a.querySelector('[aria-label="Like"]');
      if (b) { const r = b.getBoundingClientRect(); if (r.width > 0 && r.height > 0) { b.click(); return true; } }
    }
    return false;
  });
  await sleep(4000);
  const after = await snap();
  console.log('AFTER ' + JSON.stringify(after));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + e.message); process.exit(1); });
