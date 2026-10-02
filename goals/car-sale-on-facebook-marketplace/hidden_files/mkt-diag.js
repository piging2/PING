// mkt-diag.js — read-only diagnostic: what does marketplace/you/selling show?
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const TITLE = '2008 Toyota Avalon XLS, only ~61k miles';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  let page = null;
  for (const c of browser.contexts()) for (const p of c.pages()) {
    const u = p.url();
    if (u.includes('facebook.com') && !u.includes('messenger.com')) { page = p; break; }
  }
  if (!page) { console.log('DIAG: no fb page'); process.exit(2); }
  await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(8000);
  const title = await page.title().catch(() => '?');
  const url = page.url();
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const rows = page.locator('div[role="row"]', { hasText: TITLE.slice(0, 20) });
  const rowCount = await rows.count().catch(() => -1);
  const menuBtns = page.locator('[aria-label^="More options"]');
  const menuCount = await menuBtns.count().catch(() => -1);
  console.log('DIAG url=' + url);
  console.log('DIAG title=' + title);
  console.log('DIAG listing-rows=' + rowCount + ' more-options-buttons=' + menuCount);
  console.log('DIAG body-head=' + JSON.stringify(bodyText.slice(0, 1200)));
  await page.screenshot({ path: 'C:/Users/nolan/transfer/mkt-groups/diag-selling.png' }).catch(e => console.log('shot failed'));
  process.exit(0);
})().catch(e => { console.log('DIAG: FATAL ' + (e.message || e).slice(0, 200)); process.exit(9); });
