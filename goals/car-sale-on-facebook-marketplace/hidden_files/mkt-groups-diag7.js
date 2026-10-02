// mkt-groups-diag7.js — inspect the List-in-more-places dialog DOM.
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
    const cn = await cands.count().catch(() => 0);
    for (let i = 0; i < cn; i++) {
      const b = cands.nth(i);
      const box = await b.boundingBox().catch(() => null);
      if (box && box.width > 0 && box.height > 0) { menuBtn = b; break; }
    }
    if (menuBtn) break;
  }
  console.log('menuBtn found: ' + !!menuBtn);
  if (!menuBtn) { console.log('RESULT: ABORT no menu button'); process.exit(2); }
  await menuBtn.click({ timeout: 15000 }).catch(() => {});
  await sleep(2500);
  const moreItem = page.getByText('List in more places', { exact: true }).first();
  console.log('List-in-more-places item: ' + await moreItem.count());
  if (await moreItem.count() === 0) { console.log('RESULT: ABORT no menu item'); process.exit(2); }
  await moreItem.click({ timeout: 15000 }).catch(() => {});
  let dlg = null;
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    const cand = page.locator('[role="dialog"]').filter({ hasText: 'List in more places' });
    if (await cand.count() > 0) { dlg = cand.first(); break; }
  }
  console.log('dialog found: ' + !!dlg);
  if (!dlg) { console.log('RESULT: ABORT no dialog'); process.exit(2); }
  await sleep(3000);
  await page.screenshot({ path: WORKDIR + 'diag7-dialog.png' }).catch(() => {});

  const info = await dlg.evaluate(el => {
    const q = s => el.querySelectorAll(s).length;
    return {
      inputCheckbox: q('input[type="checkbox"]'),
      divRoleCheckbox: q('div[role="checkbox"]'),
      anyRoleCheckbox: q('[role="checkbox"]'),
      roleSwitch: q('[role="switch"]'),
      roleListbox: q('[role="listbox"]'),
      roleList: q('[role="list"]'),
      roleOption: q('[role="option"]'),
      buttons: q('button'),
      text: (el.innerText || '').slice(0, 1500),
    };
  }).catch(e => ({ error: String(e).slice(0, 200) }));
  console.log('DIALOG-INFO: ' + JSON.stringify(info, null, 1));
  fs.writeFileSync(WORKDIR + 'diag7-info.json', JSON.stringify(info, null, 1));

  // Dump the dialog's HTML skeleton (tag names + roles + first 80 chars of text, depth-limited)
  const skel = await dlg.evaluate(el => {
    function walk(n, d) {
      if (d > 4) return null;
      const kids = [];
      for (const c of n.children || []) {
        const w = walk(c, d + 1);
        if (w) kids.push(w);
      }
      const role = n.getAttribute && n.getAttribute('role');
      const txt = (n.innerText || '').trim().split('\n')[0] || '';
      return { tag: n.tagName, role, txt: txt.slice(0, 80), kids: kids.slice(0, 12) };
    }
    return walk(el, 0);
  }).catch(e => ({ error: String(e).slice(0, 200) }));
  fs.writeFileSync(WORKDIR + 'diag7-skel.json', JSON.stringify(skel, null, 1).slice(0, 20000));
  console.log('skeleton written');

  await dlg.getByRole('button', { name: 'Cancel' }).click({ timeout: 10000 }).catch(async () => { await page.keyboard.press('Escape').catch(() => {}); });
  console.log('RESULT: done');
  process.exit(0);
})().catch(e => { console.log('RESULT: FATAL ' + (e.message || e).slice(0, 200)); process.exit(9); });
