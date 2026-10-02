// mkt-groups-action-v3.js — FINAL action: uncheck 3 pending, check 3 new local groups.
// Usage: node mkt-groups-action-v3.js '<PENDING_JSON>' '<NEW_JSON>' '<LISTING_TITLE>'
// PENDING_JSON: ["Name A","Name B","Name C"]  NEW_JSON: ["Name D","Name E","Name F"]
// Fails closed at every step. Designed to be re-run: verify() reports state.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const PENDING = JSON.parse(process.argv[2] || '[]');
const NEWGROUPS = JSON.parse(process.argv[3] || '[]');
const TITLE = process.argv[4] || '2008 Toyota Avalon XLS, only ~61k miles';
// Runs under WINDOWS node (see enumerate script header). Shared work dir.
const WORKDIR = 'C:/Users/nolan/transfer/mkt-groups/';
const shot = p => WORKDIR + p;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const normKey = s => norm(s).replace(/[^a-z0-9]/g, '');

function boxLabel(cb) {
  // LABEL (diag9 2026-09-23): the checkbox div's OWN innerText holds the row
  // text ("Group Name\n4.1K members\n..."). Never pass a Locator as an
  // evaluate arg (not serializable -> throws).
  return cb.evaluate(el => (el.innerText || '').trim()).catch(() => '');
}

async function openDialog(page) {
  // Returns the List-in-more-places dialog, retrying the menu open up to 3 times.
  for (let attempt = 1; attempt <= 3; attempt++) {
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
    await page.screenshot({ path: shot('mkt-act3-dash-a' + attempt + '.png') }).catch(() => {});
    // MENU BUTTON (fixed 2026-09-23): the exact "More options for <title>" prefix
    // assumption failed live; match loosely, scope to the listing row first.
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
    // Wait for the CORRECT dialog (contains its own title text), up to 20s.
    let dlg = null;
    for (let i = 0; i < 10; i++) {
      await sleep(2000);
      const cand = page.locator('[role="dialog"]').filter({ hasText: 'List in more places' });
      if (await cand.count() > 0) { dlg = cand.first(); break; }
    }
    if (dlg) return dlg;
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(3000);
  }
  return null;
}

async function enumerate(dlg) {
  // Scroll the dialog list to load virtualized rows, then collect checkbox states.
  const listBox = dlg.locator('[role="list"], [role="listbox"]').first();
  const scrollTarget = (await listBox.count()) ? listBox : dlg;
  for (let i = 0; i < 12; i++) {
    await scrollTarget.evaluate(el => { el.scrollTop = el.scrollHeight; }).catch(() => {});
    await sleep(1200);
  }
  for (let i = 0; i < 4; i++) {
    await scrollTarget.evaluate(el => { el.scrollTop = 0; }).catch(() => {});
    await sleep(800);
  }
  // CHECKBOX SELECTOR (verified live 2026-09-23 via diag7): group rows are
  // div[role="checkbox"], NOT input[type="checkbox"] (zero of those exist).
  const boxes = dlg.locator('div[role="checkbox"]');
  const n = await boxes.count();
  const rows = [];
  for (let i = 0; i < n; i++) {
    const cb = boxes.nth(i);
    const checked = await cb.isChecked().catch(() => null);
    const label = await boxLabel(cb).catch(() => '');
    rows.push({ idx: i, checked, label: label.slice(0, 200) });
  }
  return rows;
}

function matchRow(rows, name) {
  const k = normKey(name);
  return rows.find(r => normKey(r.label).includes(k) || (k.length > 8 && normKey(r.label).includes(k.slice(0, 12))));
}

async function setChecked(page, dlg, row, want) {
  if (row.checked === want) return 'already-' + (want ? 'checked' : 'unchecked');
  const cb = dlg.locator('div[role="checkbox"]').nth(row.idx);
  await cb.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(600);
  await cb.click({ timeout: 10000 });
  await sleep(800);
  const now = await cb.isChecked().catch(() => null);
  return now === want ? 'ok' : 'MISMATCH(want=' + want + ',got=' + now + ')';
}

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
  const ctxs = browser.contexts();
  let page = null;
  for (const c of ctxs) for (const p of c.pages()) {
    const u = p.url();
    if (u.includes('facebook.com') && !u.includes('messenger.com')) { page = p; break; }
  }
  if (!page) { console.log('RESULT: ABORT no fb page'); process.exit(2); }

  const dlg = await openDialog(page);
  if (!dlg) { console.log('RESULT: ABORT dialog not opened after 3 attempts'); await page.screenshot({ path: shot('mkt-act3-no-dialog.png') }).catch(() => {}); process.exit(2); }
  await page.screenshot({ path: shot('mkt-act3-dialog.png') }).catch(() => {});

  const rows = await enumerate(dlg);
  fs.writeFileSync(WORKDIR + 'mkt-act3-rows.json', JSON.stringify(rows, null, 1));
  console.log('RESULT: dialog ok, checkboxes=' + rows.length);

  const report = { unchecked: [], checked: [], problems: [] };
  for (const name of PENDING) {
    const r = matchRow(rows, name);
    if (!r) { report.problems.push('pending-not-found: ' + name); continue; }
    if (r.checked !== true) { report.problems.push('pending-not-checked: ' + name + ' (state=' + r.checked + ')'); continue; }
    report.unchecked.push(name + ' -> ' + await setChecked(page, dlg, r, false));
  }
  for (const name of NEWGROUPS) {
    const r = matchRow(rows, name);
    if (!r) { report.problems.push('new-not-found: ' + name); continue; }
    if (r.checked === true) { report.problems.push('new-already-checked (duplicate?): ' + name); continue; }
    report.checked.push(name + ' -> ' + await setChecked(page, dlg, r, true));
  }
  console.log('RESULT-ACTIONS: ' + JSON.stringify(report));

  const bad = report.unchecked.concat(report.checked).filter(s => s.includes('MISMATCH'));
  if (report.problems.length || bad.length) {
    console.log('RESULT: ABORT problems, not posting');
    await dlg.getByRole('button', { name: 'Cancel' }).click({ timeout: 10000 }).catch(() => {});
    process.exit(3);
  }

  await page.screenshot({ path: shot('mkt-act3-before-post.png') }).catch(() => {});
  const postBtn = dlg.getByRole('button', { name: 'Post' });
  await postBtn.click({ timeout: 15000 });
  await sleep(12000);
  await page.screenshot({ path: shot('mkt-act3-after-post.png') }).catch(() => {});
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const stillOpen = (await dlg.count()) > 0 && await dlg.isVisible().catch(() => false);
  console.log('RESULT: posted. dialogStillVisible=' + stillOpen);

  // Re-verify: reopen dialog, confirm final states.
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(2000);
  const dlg2 = await openDialog(page);
  if (!dlg2) { console.log('RESULT: VERIFY-FAILED could not reopen dialog'); process.exit(4); }
  const rows2 = await enumerate(dlg2);
  const verify = { ok: true, detail: [] };
  for (const name of PENDING) {
    const r = matchRow(rows2, name);
    const st = r ? r.checked : 'missing';
    verify.detail.push('pending ' + name + ' checked=' + st);
    if (st !== false) verify.ok = false;
  }
  for (const name of NEWGROUPS) {
    const r = matchRow(rows2, name);
    const st = r ? r.checked : 'missing';
    verify.detail.push('new ' + name + ' checked=' + st);
    if (st !== true) verify.ok = false;
  }
  await dlg2.getByRole('button', { name: 'Cancel' }).click({ timeout: 10000 }).catch(() => {});
  fs.writeFileSync(WORKDIR + 'mkt-act3-verify.json', JSON.stringify(verify, null, 1));
  console.log('RESULT: verify=' + (verify.ok ? 'OK' : 'FAILED') + ' ' + JSON.stringify(verify.detail));
  process.exit(verify.ok ? 0 : 5);
})().catch(e => { console.log('RESULT: FATAL ' + (e.message || e).slice(0, 300)); process.exit(9); });
