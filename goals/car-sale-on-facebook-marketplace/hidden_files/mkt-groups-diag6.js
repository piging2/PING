// mkt-groups-diag6.js — inspect the two matching rows and their menu buttons.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const TITLE = '2008 Toyota Avalon XLS, only ~61k miles';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = (m) => console.log('DIAG6 ' + m);

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  let page = null;
  for (const c of browser.contexts()) for (const p of c.pages()) {
    const u = p.url();
    if (u.includes('facebook.com') && !u.includes('messenger.com')) { page = p; break; }
  }
  if (!page) { say('NO FB PAGE'); process.exit(2); }
  await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(6000);
  const searchBox = page.getByPlaceholder(/search your listings/i).first();
  if (await searchBox.count().catch(() => 0) > 0) {
    await searchBox.click({ timeout: 10000 }).catch(() => {});
    await searchBox.fill('Avalon').catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await sleep(3500);
  }
  const rows = page.locator('div[role="button"][aria-label="' + TITLE + '"]');
  const n = await rows.count().catch(() => -1);
  say('matching rows: ' + n);
  for (let i = 0; i < Math.min(n, 3); i++) {
    const r = rows.nth(i);
    const st = await r.evaluate(el => {
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), display: cs.display, vis: cs.visibility, text: (el.innerText || '').slice(0, 80).replace(/\n/g, ' | ') };
    }).catch(() => ({}));
    say('row[' + i + ']: ' + JSON.stringify(st));
    const mb = page.locator('[aria-label^="More options for ' + TITLE.slice(0, 20) + '"]');
    // find menu buttons and report each
  }
  const mbs = page.locator('[aria-label*="More options"]');
  const mn = await mbs.count().catch(() => -1);
  say('all More-options buttons on page: ' + mn);
  for (let i = 0; i < Math.min(mn, 4); i++) {
    const b = mbs.nth(i);
    const st = await b.evaluate(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { label: (el.getAttribute('aria-label') || '').slice(0, 70), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), display: cs.display, vis: cs.visibility, inRow: !!el.closest('div[role="button"]') };
    }).catch(() => ({}));
    say('menubtn[' + i + ']: ' + JSON.stringify(st));
  }
  say('done');
  process.exit(0);
})().catch(e => { say('FATAL ' + (e.message || e).slice(0, 150)); process.exit(9); });
