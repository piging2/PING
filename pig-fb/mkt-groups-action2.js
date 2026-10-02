#!/usr/bin/env node
// ACTION v2: correct dialog targeting. Enumerate 50 groups, uncheck pending,
// check 3 largest local unchecked groups, click Post, verify.
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RES = 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-action.result.json';
const WARN_RE = /action blocked|try again later|we restrict certain activity|checkpoint|verify your account|suspicious activity|unusual activity|temporarily (blocked|restricted)|confirm your identity/i;
const LOCAL_RE = /grand junction|\bgj\b|fruita|mesa|western colorado|colorado|palisade|clifton|delta|montrose|loma|mack|grand valley/i;
const out = { steps: [], removed: [], added: [], ok: false };
function log(s) { out.steps.push(s); console.log(s); }
function parseMembers(t) {
  const m = t.match(/([\d,.]+)\s*(K?)\s*members/i);
  if (!m) return 0;
  let n = parseFloat(m[1].replace(/,/g, ''));
  if (m[2] === 'K' || m[2] === 'k') n *= 1000;
  return Math.round(n);
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  const save = () => { try { fs.writeFileSync(RES, JSON.stringify(out, null, 1)); } catch (_) {} };
  const getDlg = () => page.evaluate(() => {
    const dlgs = Array.from(document.querySelectorAll('[role="dialog"]'));
    const d = dlgs.find(x => /List in more places/i.test(x.innerText || ''));
    return !!d;
  });
  try {
    await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(9000);
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, [role="button"]'));
      const t = els.find(el => /more options for 2008 toyota avalon/i.test(el.getAttribute('aria-label') || ''));
      if (t) { t.scrollIntoView({ block: 'center' }); t.click(); }
    });
    await sleep(3500);
    const opened = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[role="menu"] [role="menuitem"]'));
      const t = items.find(el => /list in more places/i.test((el.innerText || '').trim()));
      if (t) { t.click(); return true; }
      return false;
    });
    if (!opened || !(await getDlg())) { log('ABORT: dialog not opened'); save(); await page.close(); process.exit(1); }
    await sleep(6000);
    log('dialog opened');

    // Enumerate all groups: scroll the list container until the checkbox count stabilizes.
    const groups = await page.evaluate(() => {
      const dlgs = Array.from(document.querySelectorAll('[role="dialog"]'));
      const dlg = dlgs.find(x => /List in more places/i.test(x.innerText || ''));
      const seen = new Map();
      const collect = () => {
        dlg.querySelectorAll('[role="checkbox"]').forEach(cb => {
          let li = cb;
          while (li && li.getAttribute && li.getAttribute('role') !== 'listitem' && li !== dlg) li = li.parentElement;
          const scope = li && li !== dlg ? li : cb.parentElement;
          const txt = (scope ? scope.innerText : '') || '';
          const name = txt.split('\n')[0].trim();
          if (!name || name.length < 3 || /List in more places|Reach more buyers|You can list in up to/i.test(name)) return;
          seen.set(name, {
            name,
            checked: cb.getAttribute('aria-checked') === 'true',
            pending: /pending/i.test(txt),
            rowText: txt.slice(0, 200).replace(/\n/g, ' / ')
          });
        });
      };
      collect();
      // find scrollable list container
      let scroller = null;
      dlg.querySelectorAll('div').forEach(d => {
        if (d.scrollHeight > d.clientHeight + 60 && d.clientHeight > 150 && d.querySelector('[role="checkbox"]')) {
          if (!scroller || d.clientHeight < scroller.clientHeight) scroller = d;
        }
      });
      let last = -1, guard = 0;
      if (scroller) {
        while (guard++ < 60) {
          scroller.scrollTop = scroller.scrollHeight;
          collect();
          if (seen.size === last) break;
          last = seen.size;
        }
        scroller.scrollTop = 0;
      }
      return [...seen.values()];
    });
    out.enumerated = groups;
    const checked = groups.filter(g => g.checked);
    const pending = groups.filter(g => g.pending);
    log(`enumerated=${groups.length} checked=${checked.length} pending=${pending.length}`);
    log('pending: ' + pending.map(g => g.name).join(' | '));
    log('checked: ' + checked.map(g => g.name).join(' | '));
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-before.png' });

    if (pending.length === 0) { log('ABORT: no pending groups found; refusing to guess'); save(); await page.close(); process.exit(1); }
    if (checked.length < 10) { log('ABORT: checked count implausibly low, enumeration suspect'); save(); await page.close(); process.exit(1); }

    async function setGroup(name, wantChecked) {
      return await page.evaluate(({ name, wantChecked }) => {
        const dlgs = Array.from(document.querySelectorAll('[role="dialog"]'));
        const dlg = dlgs.find(x => /List in more places/i.test(x.innerText || ''));
        if (!dlg) return 'no-dialog';
        const cbs = Array.from(dlg.querySelectorAll('[role="checkbox"]'));
        for (const cb of cbs) {
          let li = cb;
          while (li && li.getAttribute && li.getAttribute('role') !== 'listitem' && li !== dlg) li = li.parentElement;
          const scope = li && li !== dlg ? li : cb.parentElement;
          const txt = (scope ? scope.innerText : '') || '';
          const nm = txt.split('\n')[0].trim();
          if (nm === name) {
            const isChecked = cb.getAttribute('aria-checked') === 'true';
            if (isChecked === wantChecked) return 'already';
            cb.scrollIntoView({ block: 'center' });
            cb.click();
            return 'clicked';
          }
        }
        return 'not-found';
      }, { name, wantChecked });
    }

    for (const g of pending) {
      const r = await setGroup(g.name, false);
      log(`uncheck pending "${g.name}": ${r}`);
      if (r === 'clicked') out.removed.push(g.name);
      await sleep(1200);
    }

    const candidates = groups
      .filter(g => !g.checked && !g.pending && !out.removed.includes(g.name))
      .filter(g => LOCAL_RE.test(g.name))
      .map(g => ({ ...g, n: parseMembers(g.rowText) }))
      .sort((a, b) => b.n - a.n);
    log('add candidates: ' + candidates.slice(0, 10).map(g => `${g.name} (${g.n})`).join(' | '));
    const toAdd = candidates.slice(0, 3);
    if (toAdd.length < 3) { log(`ABORT: only ${toAdd.length} local candidates`); save(); await page.close(); process.exit(1); }
    for (const g of toAdd) {
      const r = await setGroup(g.name, true);
      log(`check "${g.name}": ${r}`);
      if (r === 'clicked') out.added.push(g.name);
      await sleep(1200);
    }
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-after.png' });

    const postRes = await page.evaluate(() => {
      const dlgs = Array.from(document.querySelectorAll('[role="dialog"]'));
      const dlg = dlgs.find(x => /List in more places/i.test(x.innerText || ''));
      if (!dlg) return 'no-dialog';
      const btns = Array.from(dlg.querySelectorAll('button, [role="button"]'));
      const p = btns.find(b => /^(post)$/i.test((b.innerText || '').trim()));
      if (p) { p.click(); return 'clicked'; }
      return 'no-post-button';
    });
    log('post: ' + postRes);
    await sleep(8000);
    const bodyT = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    if (WARN_RE.test(bodyT)) { log('WARN_DETECTED after Post; stopping'); save(); await page.close(); process.exit(1); }

    // Verify: reopen dialog and check final states.
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, [role="button"]'));
      const t = els.find(el => /more options for 2008 toyota avalon/i.test(el.getAttribute('aria-label') || ''));
      if (t) { t.scrollIntoView({ block: 'center' }); t.click(); }
    });
    await sleep(3500);
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[role="menu"] [role="menuitem"]'));
      const t = items.find(el => /list in more places/i.test((el.innerText || '').trim()));
      if (t) t.click();
    });
    await sleep(8000);
    const verify = await page.evaluate(() => {
      const dlgs = Array.from(document.querySelectorAll('[role="dialog"]'));
      const dlg = dlgs.find(x => /List in more places/i.test(x.innerText || ''));
      if (!dlg) return null;
      const res = [];
      const seen = new Set();
      dlg.querySelectorAll('[role="checkbox"]').forEach(cb => {
        let li = cb;
        while (li && li.getAttribute && li.getAttribute('role') !== 'listitem' && li !== dlg) li = li.parentElement;
        const scope = li && li !== dlg ? li : cb.parentElement;
        const txt = (scope ? scope.innerText : '') || '';
        const name = txt.split('\n')[0].trim();
        if (!name || seen.has(name)) return;
        seen.add(name);
        res.push({ name, checked: cb.getAttribute('aria-checked') === 'true', pending: /pending/i.test(txt) });
      });
      return res;
    });
    if (verify) {
      const vChecked = verify.filter(g => g.checked).map(g => g.name);
      out.finalState = { checkedCount: vChecked.length, checked: vChecked, pending: verify.filter(g => g.pending).map(g => g.name) };
      const removedGone = out.removed.every(n => !vChecked.includes(n));
      const addedPresent = out.added.every(n => vChecked.includes(n));
      out.ok = removedGone && addedPresent && out.finalState.pending.length === 0;
      log(`verify: checked=${vChecked.length} pendingLeft=${out.finalState.pending.length} removedGone=${removedGone} addedPresent=${addedPresent}`);
    }
    await page.keyboard.press('Escape');
    await sleep(800);
    save();
    log(out.ok ? 'DONE OK' : 'DONE WITH DISCREPANCY');
    await page.close();
    process.exit(out.ok ? 0 : 1);
  } catch (e) {
    log('FATAL ' + String(e.message || e).slice(0, 300));
    save();
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
