// mkt-groups-diag5.js — full trace with verified row selector.
const WORKDIR = 'C:/Users/nolan/transfer/mkt-groups/';
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const TITLE = '2008 Toyota Avalon XLS, only ~61k miles';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
const say = (m) => { log.push(m); console.log('DIAG5 ' + m); };

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
  say('search box: ' + await searchBox.count().catch(() => -1));
  if (await searchBox.count().catch(() => 0) > 0) {
    await searchBox.click({ timeout: 10000 }).catch(() => {});
    await searchBox.fill('Avalon').catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await sleep(3500);
  }
  let row = page.locator('div[role="button"][aria-label="' + TITLE + '"]');
  say('row exact aria-label count: ' + await row.count().catch(() => -1));
  if (await row.count().catch(() => 0) === 0) {
    row = page.locator('div[role="button"]', { hasText: TITLE });
    say('row hasText fallback count: ' + await row.count().catch(() => -1));
  }
  row = row.first();
  await page.screenshot({ path: WORKDIR + 'diag5-row.png' }).catch(() => {});
  if (await row.count().catch(() => 0) === 0) { say('ROW NOT FOUND'); process.exit(3); }
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(800);
  // dump buttons inside the row
  const btns = await row.evaluate(el => {
    return [...el.querySelectorAll('[aria-label]')].map(x => x.tagName + '|' + (x.getAttribute('aria-label') || '').slice(0, 60));
  }).catch(() => []);
  say('row aria-label elements: ' + JSON.stringify(btns).slice(0, 500));
  let menuBtn = row.locator('[aria-label*="More options"]').first();
  say('row-scoped More-options count: ' + await menuBtn.count().catch(() => -1));
  if (await menuBtn.count().catch(() => 0) === 0) {
    menuBtn = page.locator('[aria-label^="More options for ' + TITLE.slice(0, 20) + '"]').first();
    say('global prefix menu count: ' + await menuBtn.count().catch(() => -1));
  }
  if (await menuBtn.count().catch(() => 0) === 0) { say('NO MENU BUTTON'); process.exit(4); }
  await menuBtn.click({ timeout: 15000 }).catch(e => say('menu click err: ' + (e.message || '').slice(0, 80)));
  await sleep(2500);
  const menuTexts = await page.evaluate(() => [...document.querySelectorAll('[role="menu"]')].map(m => (m.innerText || '').slice(0, 400).replace(/\n/g, ' | '))).catch(() => []);
  say('open menus: ' + menuTexts.length + ' :: ' + JSON.stringify(menuTexts).slice(0, 700));
  await page.screenshot({ path: WORKDIR + 'diag5-menu.png' }).catch(() => {});
  const lip = page.getByText('List in more places', { exact: true }).first();
  say('List-in-more-places count: ' + await lip.count().catch(() => -1));
  if (await lip.count().catch(() => 0) > 0) {
    await lip.click({ timeout: 15000 }).catch(e => say('lip click err: ' + (e.message || '').slice(0, 80)));
    let opened = false;
    for (let i = 0; i < 10; i++) {
      await sleep(2000);
      const c = await page.locator('[role="dialog"]').filter({ hasText: 'List in more places' }).count().catch(() => 0);
      if (c > 0) { opened = true; break; }
    }
    say('dialog opened: ' + opened);
    say('any dialog count: ' + await page.locator('[role="dialog"]').count().catch(() => -1));
    await page.screenshot({ path: WORKDIR + 'diag5-dialog.png' }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(1000);
    await page.keyboard.press('Escape').catch(() => {});
  }
  fs.writeFileSync(WORKDIR + 'mkt-groups-diag5.log', log.join('\n'));
  say('done');
  process.exit(0);
})().catch(e => { say('FATAL ' + (e.message || e).slice(0, 150)); process.exit(9); });
