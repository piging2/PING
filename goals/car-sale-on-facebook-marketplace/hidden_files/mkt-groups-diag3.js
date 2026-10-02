// mkt-groups-diag3.js — open the listing's More-options menu, dump menu items, try clicking.
const WORKDIR = 'C:/Users/nolan/transfer/mkt-groups/';
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const TITLE = '2008 Toyota Avalon XLS, only ~61k miles';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
const say = (m) => { log.push(m); console.log('DIAG3 ' + m); };

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
  say('search box count: ' + await searchBox.count().catch(() => -1));
  if (await searchBox.count().catch(() => 0) > 0) {
    await searchBox.click({ timeout: 10000 }).catch(() => {});
    await searchBox.fill('Avalon').catch(() => {});
    await sleep(3500);
  }
  let row = page.locator('[role="listitem"]', { hasText: TITLE }).first();
  say('row count after search: ' + await row.count().catch(() => -1));
  if (!row || await row.count().catch(() => 0) === 0) {
    for (let s = 0; s < 8; s++) {
      const cand = page.locator('[role="listitem"]', { hasText: TITLE }).first();
      if (await cand.count().catch(() => 0) > 0) { row = cand; break; }
      await page.evaluate(() => window.scrollBy(0, 900)).catch(() => {});
      await sleep(1200);
    }
    say('row count after scroll fallback: ' + await row.count().catch(() => -1));
  }
  if (!row) { process.exit(3); }
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(800);
  let menuBtn = row.locator('[aria-label*="More options"]').first();
  let mbN = await menuBtn.count().catch(() => 0);
  say('row-scoped menu button count: ' + mbN);
  if (mbN === 0) {
    const labels = await row.evaluate(el => {
      const out = [];
      el.querySelectorAll('[aria-label]').forEach(x => out.push(x.getAttribute('aria-label').slice(0, 60)));
      return out.slice(0, 20);
    }).catch(() => []);
    say('row aria-labels: ' + JSON.stringify(labels));
    process.exit(4);
  }
  await menuBtn.click({ timeout: 15000 }).catch(e => say('click err ' + (e.message || '').slice(0, 60)));
  await sleep(2500);
  const menuItems = await page.evaluate(() => {
    const menus = [...document.querySelectorAll('[role="menu"]')];
    return menus.map(m => (m.innerText || '').slice(0, 500).replace(/\n/g, ' | '));
  }).catch(() => []);
  say('menus open: ' + menuItems.length + ' :: ' + JSON.stringify(menuItems).slice(0, 900));
  const lip = page.getByText('List in more places', { exact: true }).first();
  say('list-in-more-places count: ' + await lip.count().catch(() => -1));
  if (await lip.count().catch(() => 0) > 0) {
    await lip.click({ timeout: 15000 }).catch(e => say('lip click err ' + (e.message || '').slice(0, 60)));
    await sleep(4000);
    const dlgN = await page.locator('[role="dialog"]').filter({ hasText: 'List in more places' }).count().catch(() => -1);
    say('dialog count after click: ' + dlgN);
    const anyDlg = await page.locator('[role="dialog"]').count().catch(() => -1);
    say('any dialog count: ' + anyDlg);
    const bodyClip = (await page.locator('body').innerText().catch(() => '')).slice(-400).replace(/\n/g, ' | ');
    say('body tail: ' + bodyClip.slice(0, 300));
    await page.screenshot({ path: WORKDIR + 'diag3-shot.png' }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
  }
  await page.keyboard.press('Escape').catch(() => {});
  fs.writeFileSync(WORKDIR + 'mkt-groups-diag3.log', log.join('\n'));
  say('done');
  process.exit(0);
})().catch(e => { say('FATAL ' + (e.message || e).slice(0, 150)); process.exit(9); });
