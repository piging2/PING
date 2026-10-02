#!/usr/bin/env node
// ACTION: manage the Avalon listing's group distribution.
// 1. Enumerate all groups in "List in more places" (name, members, checked, pending).
// 2. Uncheck the pending groups (Nolan: remove from the pending ones).
// 3. Check 3 more: largest local (by member count) unchecked non-pending groups.
// 4. Save, verify by re-enumerating. Fail closed on ambiguity.
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const RES = 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-action.result.json';
const WARN_RE = /action blocked|try again later|we restrict certain activity|checkpoint|verify your account|suspicious activity|unusual activity|temporarily (blocked|restricted)|confirm your identity/i;
const out = { steps: [], removed: [], added: [], finalState: null, ok: false };

function log(s) { out.steps.push(s); console.log(s); }

function parseMembers(t) {
  const m = t.match(/([\d,.]+)\s*K?\s*members/i);
  if (!m) return 0;
  let n = parseFloat(m[1].replace(/,/g, ''));
  if (/K\s*members/i.test(m[0])) n *= 1000;
  return Math.round(n);
}
const LOCAL_RE = /grand junction|\bgj\b|fruita|mesa|western colorado|colorado|palisade|clifton|delta|montrose|loma|mack|grand valley/i;

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  const save = () => { try { fs.writeFileSync(RES, JSON.stringify(out, null, 1)); } catch (_) {} };
  try {
    await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(9000);

    // Open More options -> List in more places
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
    if (!opened) { log('ABORT: could not open List in more places'); save(); await page.close(); process.exit(1); }
    await sleep(8000);
    log('dialog opened');

    // Enumerate: scroll the dialog list container until stable.
    const groups = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return null;
      // Find the scrollable list container.
      const scroller = Array.from(dlg.querySelectorAll('div')).find(d => d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 100);
      const seen = new Map();
      const collect = () => {
        const rows = Array.from(dlg.querySelectorAll('[role="checkbox"]'));
        rows.forEach(cb => {
          const row = cb.closest('div');
          const txt = (row ? row.innerText : cb.innerText) || '';
          const name = txt.split('\n')[0].trim();
          if (!name || name.length < 3) return;
          seen.set(name, {
            name,
            members: txt.match(/[\d,.]+K?\s*members/i) ? txt.match(/[\d,.]+K?\s*members/i)[0] : '',
            checked: cb.getAttribute('aria-checked') === 'true',
            pending: /pending/i.test(txt),
            rowText: txt.slice(0, 160).replace(/\n/g, ' / ')
          });
        });
      };
      collect();
      if (scroller) {
        let last = -1, guard = 0;
        while (guard++ < 40) {
          scroller.scrollTop = scroller.scrollHeight;
          collect();
          if (seen.size === last) break;
          last = seen.size;
        }
        scroller.scrollTop = 0;
      }
      return { list: [...seen.values()], usedScroller: !!scroller };
    });
    if (!groups) { log('ABORT: no dialog found'); save(); await page.close(); process.exit(1); }
    out.enumerated = groups.list;
    log(`enumerated ${groups.list.length} groups (scroller=${groups.usedScroller})`);
    const checked = groups.list.filter(g => g.checked);
    const pending = groups.list.filter(g => g.pending);
    log(`checked=${checked.length} pending=${pending.length}: ${pending.map(g => g.name).join(' | ')}`);
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-before.png' });

    if (pending.length === 0) { log('ABORT: no pending groups identified; refusing to guess'); save(); await page.close(); process.exit(1); }

    // Helper: set a group's checkbox to a desired state.
    async function setGroup(name, wantChecked) {
      return await page.evaluate(({ name, wantChecked }) => {
        const dlg = document.querySelector('[role="dialog"]');
        if (!dlg) return 'no-dialog';
        const cbs = Array.from(dlg.querySelectorAll('[role="checkbox"]'));
        for (const cb of cbs) {
          const row = cb.closest('div');
          const txt = (row ? row.innerText : '') || '';
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

    // 1. Remove from pending groups.
    for (const g of pending) {
      const r = await setGroup(g.name, false);
      log(`uncheck pending "${g.name}": ${r}`);
      if (r === 'clicked') out.removed.push(g.name);
      await sleep(1500);
    }

    // 2. Pick 3 largest local unchecked non-pending groups.
    const candidates = groups.list
      .filter(g => !g.checked && !g.pending && !out.removed.includes(g.name))
      .filter(g => /grand junction|\bgj\b|fruita|mesa|western colorado|colorado|palisade|clifton|delta|montrose|loma|mack|grand valley/i.test(g.name))
      .map(g => ({ ...g, n: parseMembers(g.rowText) }))
      .sort((a, b) => b.n - a.n);
    log('add candidates: ' + candidates.slice(0, 8).map(g => `${g.name} (${g.n})`).join(' | '));
    const toAdd = candidates.slice(0, 3);
    if (toAdd.length < 3) { log(`ABORT: only ${toAdd.length} local add-candidates; not proceeding`); save(); await page.close(); process.exit(1); }
    for (const g of toAdd) {
      const r = await setGroup(g.name, true);
      log(`check "${g.name}": ${r}`);
      if (r === 'clicked') out.added.push(g.name);
      await sleep(1500);
    }
    await page.screenshot({ path: 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-after.png' });

    // 3. Save.
    const saved = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return 'no-dialog';
      const btns = Array.from(dlg.querySelectorAll('button, [role="button"]'));
      const s = btns.find(b => /^(save|done|confirm|apply)$/i.test((b.innerText || '').trim()));
      if (s) { s.click(); return 'clicked:' + s.innerText.trim(); }
      return 'no-save-button. buttons=' + btns.map(b => (b.innerText || '').trim()).join('|');
    });
    log('save: ' + saved);
    await sleep(6000);

    // 4. Check for warnings.
    const bodyT = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    if (WARN_RE.test(bodyT)) { log('WARN_DETECTED after save; stopping'); save(); await page.close(); process.exit(1); }

    // 5. Verify: reopen dialog, re-enumerate checked set.
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
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return null;
      const res = [];
      dlg.querySelectorAll('[role="checkbox"]').forEach(cb => {
        const row = cb.closest('div');
        const txt = (row ? row.innerText : '') || '';
        const name = txt.split('\n')[0].trim();
        if (name) res.push({ name, checked: cb.getAttribute('aria-checked') === 'true', pending: /pending/i.test(txt) });
      });
      return res;
    });
    if (verify) {
      const vChecked = verify.filter(g => g.checked).map(g => g.name);
      out.finalState = { checkedCount: vChecked.length, checked: vChecked, pending: verify.filter(g => g.pending).map(g => g.name) };
      const removedGone = out.removed.every(n => !vChecked.includes(n));
      const addedPresent = out.added.every(n => vChecked.includes(n));
      out.ok = removedGone && addedPresent;
      log(`verify: checked=${vChecked.length} removedGone=${removedGone} addedPresent=${addedPresent}`);
    }
    // Close dialog.
    await page.keyboard.press('Escape');
    await sleep(1000);
    save();
    await page.close();
    process.exit(out.ok ? 0 : 1);
  } catch (e) {
    log('FATAL ' + String(e.message || e).slice(0, 300));
    save();
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
