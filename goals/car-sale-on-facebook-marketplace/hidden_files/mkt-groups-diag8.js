// mkt-groups-diag8.js — dump checkbox DOM context.
const WORKDIR = 'C:/Users/nolan/transfer/mkt-groups/';
const fs = require('fs');
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
  if (!page) { console.log('RESULT: ABORT no fb page'); process.exit(2); }
  await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(6000);
  const searchBox = page.getByPlaceholder(/search your listings/i).first();
  if (await searchBox.count().catch(() => 0) > 0) {
    await searchBox.click({ timeout: 10000 }).catch(() => {});
    await searchBox.fill('Avalon').catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await sleep(3500);
  }
  let row = page.locator('div[role="button"][aria-label="' + TITLE + '"]');
  if (await row.count().catch(() => 0) === 0) row = page.locator('div[role="button"]', { hasText: TITLE });
  row = row.first();
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(800);
  let menuBtn = null;
  for (const scope of [row, page]) {
    const cands = scope.getByLabel(/more options/i);
    for (let i = 0; i < await cands.count().catch(() => 0); i++) {
      const b = cands.nth(i);
      const box = await b.boundingBox().catch(() => null);
      if (box && box.width > 0 && box.height > 0) { menuBtn = b; break; }
    }
    if (menuBtn) break;
  }
  if (!menuBtn) { console.log('RESULT: ABORT no menu'); process.exit(2); }
  await menuBtn.click({ timeout: 15000 }).catch(() => {});
  await sleep(2500);
  const moreItem = page.getByText('List in more places', { exact: true }).first();
  if (await moreItem.count() === 0) { console.log('RESULT: ABORT no item'); process.exit(2); }
  await moreItem.click({ timeout: 15000 }).catch(() => {});
  let dlg = null;
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    const cand = page.locator('[role="dialog"]').filter({ hasText: 'List in more places' });
    if (await cand.count() > 0) { dlg = cand.first(); break; }
  }
  if (!dlg) { console.log('RESULT: ABORT no dialog'); process.exit(2); }
  await sleep(2000);

  const dump = await dlg.evaluate(el => {
    const boxes = el.querySelectorAll('div[role="checkbox"]');
    const out = [];
    for (let i = 0; i < Math.min(3, boxes.length); i++) {
      const cb = boxes[i];
      out.push({
        ariaChecked: cb.getAttribute('aria-checked'),
        outer: cb.outerHTML.slice(0, 500),
        parent2: cb.parentElement ? cb.parentElement.outerHTML.slice(0, 800) : null,
        parent4text: (() => { let n = cb; for (let k = 0; k < 4 && n; k++) n = n.parentElement; return n ? (n.innerText || '').slice(0, 300) : null; })(),
      });
    }
    return out;
  }).catch(e => ({ error: String(e).slice(0, 200) }));
  fs.writeFileSync(WORKDIR + 'diag8-dump.json', JSON.stringify(dump, null, 1));
  console.log('DUMP: ' + JSON.stringify(dump, null, 1).slice(0, 3000));
  await page.keyboard.press('Escape').catch(() => {});
  console.log('RESULT: done');
  process.exit(0);
})().catch(e => { console.log('RESULT: FATAL ' + (e.message || e).slice(0, 200)); process.exit(9); });
