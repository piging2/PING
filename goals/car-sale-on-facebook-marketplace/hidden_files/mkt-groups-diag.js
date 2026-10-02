// mkt-groups-diag.js — DIAGNOSTIC ONLY: trace why the List-in-more-places dialog won't open.
// Read-only until the dialog appears; cancels out. Writes mkt-groups-diag.log + diag-shot.png.
const WORKDIR = 'C:/Users/nolan/transfer/mkt-groups/';
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const TITLE = process.argv[2] || '2008 Toyota Avalon XLS, only ~61k miles';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
const say = (m) => { log.push(new Date().toISOString().slice(11, 19) + ' ' + m); console.log('DIAG ' + m); };

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  say('cdp connected, contexts=' + browser.contexts().length);
  let page = null;
  for (const c of browser.contexts()) for (const p of c.pages()) {
    const u = p.url();
    if (u.includes('facebook.com') && !u.includes('messenger.com')) { page = p; say('fb page: ' + u.slice(0, 120)); break; }
  }
  if (!page) { say('NO FB PAGE FOUND'); fs.writeFileSync(WORKDIR + 'mkt-groups-diag.log', log.join('\n')); process.exit(2); }

  await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => say('goto err ' + (e.message||e).slice(0,80)));
  await sleep(6000);
  say('selling page url now: ' + page.url().slice(0, 120));
  const row = page.locator('div[role="row"]', { hasText: TITLE }).first();
  const rowN = await row.count().catch(() => -1);
  say('row count for title: ' + rowN);
  if (rowN === 0) {
    // dump visible row-ish titles to see what's there
    const rows = page.locator('div[role="row"]');
    const n = Math.min(await rows.count().catch(() => 0), 8);
    for (let i = 0; i < n; i++) {
      const t = (await rows.nth(i).innerText().catch(() => '')).slice(0, 90).replace(/\n/g, ' | ');
      say('row[' + i + ']: ' + t);
    }
    await page.screenshot({ path: WORKDIR + 'diag-shot.png' }).catch(() => {});
    fs.writeFileSync(WORKDIR + 'mkt-groups-diag.log', log.join('\n'));
    process.exit(3);
  }
  await row.waitFor({ timeout: 15000 }).catch(() => {});
  const menuSel = '[aria-label^="More options for ' + TITLE.slice(0, 20) + '"]';
  const menuBtn = page.locator(menuSel).first();
  const mbN = await menuBtn.count().catch(() => -1);
  say('menu button count (' + menuSel + '): ' + mbN);
  if (mbN === 0) {
    // list all aria-labels containing 'More options' on the row
    const all = page.locator('[aria-label*="More options"]');
    const n = Math.min(await all.count().catch(() => 0), 6);
    for (let i = 0; i < n; i++) say('aria-label[' + i + ']: ' + (await all.nth(i).getAttribute('aria-label').catch(() => '?')));
    await page.screenshot({ path: WORKDIR + 'diag-shot.png' }).catch(() => {});
    fs.writeFileSync(WORKDIR + 'mkt-groups-diag.log', log.join('\n'));
    process.exit(4);
  }
  await menuBtn.click({ timeout: 15000 }).catch(e => say('menu click err ' + (e.message||e).slice(0,80)));
  await sleep(2500);
  const moreItem = page.getByText('List in more places', { exact: true }).first();
  const miN = await moreItem.count().catch(() => -1);
  say('"List in more places" menu item count: ' + miN);
  if (miN === 0) {
    // dump menu text
    const menu = page.locator('[role="menu"]').first();
    const mt = (await menu.innerText().catch(() => '')).slice(0, 400).replace(/\n/g, ' | ');
    say('menu text: ' + mt);
    await page.keyboard.press('Escape').catch(() => {});
    await page.screenshot({ path: WORKDIR + 'diag-shot.png' }).catch(() => {});
    fs.writeFileSync(WORKDIR + 'mkt-groups-diag.log', log.join('\n'));
    process.exit(5);
  }
  await moreItem.click({ timeout: 15000 }).catch(e => say('item click err ' + (e.message||e).slice(0,80)));
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    const cand = page.locator('[role="dialog"]').filter({ hasText: 'List in more places' });
    if (await cand.count() > 0) { say('DIALOG OPENED after click'); await page.keyboard.press('Escape').catch(() => {}); fs.writeFileSync(WORKDIR + 'mkt-groups-diag.log', log.join('\n')); process.exit(0); }
  }
  say('dialog did NOT open after click');
  const dlgN = await page.locator('[role="dialog"]').count().catch(() => -1);
  say('any dialog count: ' + dlgN);
  await page.screenshot({ path: WORKDIR + 'diag-shot.png' }).catch(() => {});
  fs.writeFileSync(WORKDIR + 'mkt-groups-diag.log', log.join('\n'));
  process.exit(6);
})().catch(e => { say('FATAL ' + (e.message || e).slice(0, 200)); try { fs.writeFileSync(WORKDIR + 'mkt-groups-diag.log', log.join('\n')); } catch (_) {} process.exit(9); });
