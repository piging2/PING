// mkt-groups-enumerate.js — read-only: open List-in-more-places, dump group rows, cancel.
// Usage: node mkt-groups-enumerate.js '<LISTING_TITLE>' ; writes mkt-groups-rows.json
// Runs under WINDOWS node (Chrome's CDP binds 127.0.0.1 on the Windows host;
// WSL cannot reach it). Shared work dir, visible from WSL as /mnt/c/... .
const WORKDIR = 'C:/Users/nolan/transfer/mkt-groups/';
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const TITLE = process.argv[2] || '2008 Toyota Avalon XLS, only ~61k miles';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  let page = null;
  for (const c of browser.contexts()) for (const p of c.pages()) {
    const u = p.url();
    if (u.includes('facebook.com') && !u.includes('messenger.com')) { page = p; break; }
  }
  if (!page) { console.log('RESULT: ABORT no fb page'); process.exit(2); }

  let dlg = null;
  for (let attempt = 1; attempt <= 3 && !dlg; attempt++) {
    await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(6000);
    // ROW SELECTOR (verified live 2026-09-23): the listing row is a div[role="button"]
    // whose aria-label is the exact listing title. It is NOT div[role="row"] nor
    // [role="listitem"] (those were surface drift from an older FB layout).
    const searchBox = page.getByPlaceholder(/search your listings/i).first();
    if (await searchBox.count().catch(() => 0) > 0) {
      await searchBox.click({ timeout: 10000 }).catch(() => {});
      await searchBox.fill('Avalon').catch(() => {});
      await page.keyboard.press('Enter').catch(() => {});
      await sleep(3500);
    }
    let row = page.locator('div[role="button"][aria-label="' + TITLE + '"]');
    if (await row.count().catch(() => 0) === 0) {
      row = page.locator('div[role="button"]', { hasText: TITLE });
    }
    row = row.first();
    if (await row.count().catch(() => 0) === 0) { await page.keyboard.press('Escape').catch(() => {}); await sleep(2000); continue; }
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(800);
    // The listing photo is ALSO a div[role="button"] with the same aria-label, and it
    // contains a zero-size More-options button that swallows .first() clicks.
    // The exact aria-label suffix is not stable across FB renders (the
    // "More options for <title>" prefix assumption failed live 2026-09-23),
    // so match loosely and scope to the listing row first: take the first
    // non-zero-size More-options button inside the row; fall back to a
    // page-wide search only if the row-scoped search finds nothing.
    let menuBtn = null;
    for (const scope of [row, page]) {
      const cands = scope.getByLabel(/more options/i);
      const cn = await cands.count().catch(() => 0);
      for (let i = 0; i < cn; i++) {
        const b = cands.nth(i);
        const box = await b.boundingBox().catch(() => null);
        if (box && box.width > 0 && box.height > 0) { menuBtn = b; break; }
      }
      if (menuBtn) break;
    }
    if (!menuBtn) { await page.keyboard.press('Escape').catch(() => {}); await sleep(2000); continue; }
    await menuBtn.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(500);
    await menuBtn.click({ timeout: 15000 }).catch(() => {});
    await sleep(2500);
    const moreItem = page.getByText('List in more places', { exact: true }).first();
    if (await moreItem.count() === 0) { await page.keyboard.press('Escape').catch(() => {}); await sleep(2000); continue; }
    await moreItem.click({ timeout: 15000 }).catch(() => {});
    for (let i = 0; i < 10; i++) {
      await sleep(2000);
      const cand = page.locator('[role="dialog"]').filter({ hasText: 'List in more places' });
      if (await cand.count() > 0) { dlg = cand.first(); break; }
    }
    if (!dlg) { await page.keyboard.press('Escape').catch(() => {}); await sleep(3000); }
  }
  if (!dlg) { console.log('RESULT: ABORT dialog not opened'); process.exit(2); }

  const listBox = dlg.locator('[role="list"], [role="listbox"]').first();
  const scrollTarget = (await listBox.count()) ? listBox : dlg;
  for (let i = 0; i < 12; i++) { await scrollTarget.evaluate(el => { el.scrollTop = el.scrollHeight; }).catch(() => {}); await sleep(1200); }
  for (let i = 0; i < 4; i++) { await scrollTarget.evaluate(el => { el.scrollTop = 0; }).catch(() => {}); await sleep(800); }

  // CHECKBOX SELECTOR (verified live 2026-09-23 via diag7): group rows are
  // div[role="checkbox"], NOT input[type="checkbox"] (zero of those exist).
  const boxes = dlg.locator('div[role="checkbox"]');
  const n = await boxes.count();
  const rows = [];
  for (let i = 0; i < n; i++) {
    const cb = boxes.nth(i);
    const checked = await cb.isChecked().catch(() => null);
    // LABEL (diag9): the checkbox div's OWN innerText holds the row text
    // ("Group Name\n4.1K members\n..."). Do NOT pass a Locator as an evaluate
    // arg (not serializable -> throws -> empty label).
    const label = await cb.evaluate(el => (el.innerText || '').trim()).catch(() => '');
    rows.push({ checked, label: (label || '').slice(0, 300) });
  }
  fs.writeFileSync(WORKDIR + 'mkt-groups-rows.json', JSON.stringify(rows, null, 1));
  console.log('RESULT: ok rows=' + rows.length + ' checked=' + rows.filter(r => r.checked).length);
  await dlg.getByRole('button', { name: 'Cancel' }).click({ timeout: 10000 }).catch(async () => { await page.keyboard.press('Escape').catch(() => {}); });
  await sleep(2000);
  process.exit(0);
})().catch(e => { console.log('RESULT: FATAL ' + (e.message || e).slice(0, 200)); process.exit(9); });
