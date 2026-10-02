const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  let page = null;
  for (const c of browser.contexts()) for (const p of c.pages()) {
    const u = p.url();
    if (u.includes('facebook.com') && !u.includes('messenger.com')) { page = p; break; }
  }
  const btns = page.locator('[aria-label^="More options"]');
  const n = await btns.count();
  console.log('DIAG buttons=' + n);
  for (let i = 0; i < n; i++) {
    const al = await btns.nth(i).getAttribute('aria-label').catch(() => '?');
    console.log('DIAG btn[' + i + ']=' + JSON.stringify(al));
  }
  process.exit(0);
})().catch(e => { console.log('DIAG: FATAL ' + (e.message || e).slice(0, 200)); process.exit(9); });
