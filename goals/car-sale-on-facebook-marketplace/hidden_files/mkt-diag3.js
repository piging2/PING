const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  let page = null;
  for (const c of browser.contexts()) for (const p of c.pages()) {
    const u = p.url();
    if (u.includes('facebook.com') && !u.includes('messenger.com')) { page = p; break; }
  }
  const btns = page.locator('[aria-label^="More options for 2008 Toyota Avalon X"]');
  console.log('DIAG avalon-buttons=' + await btns.count());
  await btns.nth(1).click({ timeout: 15000 });
  await sleep(2500);
  const items = page.locator('[role="menuitem"], [role="menu"] [role="button"], div[role="menu"] span');
  const n = await items.count();
  console.log('DIAG menu-candidates=' + n);
  const menu = page.locator('[role="menu"]').first();
  if (await menu.count()) {
    console.log('DIAG menu-text=' + JSON.stringify((await menu.innerText()).slice(0, 500)));
  } else {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const idx = bodyText.indexOf('List in more places');
    console.log('DIAG no-role-menu, List-in-more-places-index=' + idx);
    console.log('DIAG body-tail=' + JSON.stringify(bodyText.slice(Math.max(0, idx - 300), idx + 200)));
  }
  await page.screenshot({ path: 'C:/Users/nolan/transfer/mkt-groups/diag-menu.png' }).catch(() => {});
  process.exit(0);
})().catch(e => { console.log('DIAG: FATAL ' + (e.message || e).slice(0, 300)); process.exit(9); });
