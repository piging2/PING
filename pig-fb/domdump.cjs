const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 15000 });
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('http://172.21.65.209:3100/sites/happy-place', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(6000);
  // tap first doorway via JS-scrolled touch tap
  const box = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/o/"]')].find(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    a.scrollIntoView({ block: 'center' });
    const r = a.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await sleep(400);
  await page.touchscreen.tap(box.x, box.y);
  await sleep(3000);
  const dump = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('[role="dialog"]').forEach((d, i) => {
      const r = d.getBoundingClientRect();
      const cs = getComputedStyle(d);
      const h = d.querySelector('h1,h2,h3');
      out.push({
        i, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left),
        display: cs.display, visibility: cs.visibility, opacity: cs.opacity, transform: cs.transform.slice(0, 40),
        hasTitle: !!h, titleText: h ? h.innerText.slice(0, 40) : null,
        buttons: [...d.querySelectorAll('button')].map(b => (b.innerText || b.getAttribute('aria-label') || '?').slice(0, 24)),
        cls: d.className.slice(0, 80),
      });
    });
    // what is the visible bottom sheet?
    const sheets = [...document.querySelectorAll('*')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > 300 && r.height > 300 && r.top > 100 && r.bottom <= window.innerHeight + 40 && /Close/.test(e.innerText || '') && e !== document.body;
    }).slice(0, 3).map(e => ({ tag: e.tagName, role: e.getAttribute('role'), cls: e.className.slice(0, 80) }));
    return { dialogs: out, sheetCandidates: sheets, activeElement: document.activeElement ? document.activeElement.tagName + '.' + document.activeElement.className.slice(0, 40) : null };
  });
  console.log('DOMDUMP ' + JSON.stringify(dump, null, 1).slice(0, 3000));
  await ctx.close();
  process.exit(0);
})().catch(e => { console.log('FATAL ' + String(e.message).slice(0, 150)); process.exit(1); });
