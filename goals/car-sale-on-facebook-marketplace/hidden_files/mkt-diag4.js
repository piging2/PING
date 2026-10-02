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
  await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(6000);
  const row = page.locator('div[role="row"]', { hasText: TITLE }).first();
  let rowOk = true;
  await row.waitFor({ timeout: 30000 }).catch(() => { rowOk = false; });
  console.log('DIAG4 row-found=' + rowOk);
  const menuBtn = page.locator('[aria-label^="More options for ' + TITLE.slice(0, 20) + '"]').first();
  console.log('DIAG4 menubtn-count=' + await menuBtn.count());
  const clickErr = await menuBtn.click({ timeout: 15000 }).then(() => 'none').catch(e => e.message.slice(0, 150));
  console.log('DIAG4 click-err=' + clickErr);
  await sleep(2500);
  const moreItem = page.getByText('List in more places', { exact: true }).first();
  console.log('DIAG4 list-in-more-places-count=' + await moreItem.count());
  process.exit(0);
})().catch(e => { console.log('DIAG4: FATAL ' + (e.message || e).slice(0, 300)); process.exit(9); });
