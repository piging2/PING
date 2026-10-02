#!/usr/bin/env node
// Recon 2: switch to Nolan's PERSONAL profile, then inspect the listing's
// share/group UI and dump the share dialog's group list with states.
// Writes JSON to C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon2.result.json and stdout.
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LISTING_ID = '1036291262797157';
const RES = 'C:/Users/nolan/.local/share/pigi/fb-engage/mkt-groups-recon2.result.json';
const out = { identity: null, switchOptions: [], shareControls: [], dialogGroups: [], notes: [] };
const WARN_RE = /action blocked|try again later|we restrict certain activity|checkpoint|verify your account|suspicious activity|unusual activity|temporarily (blocked|restricted)|confirm your identity/i;

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    // 1. Detect current identity via the marketplace page note.
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    // 2. Open profile switcher.
    const av = page.locator('[aria-label="Your profile"]').first();
    if (await av.count() > 0) { await av.click({ timeout: 10000 }); await sleep(3000); }
    out.switchOptions = await page.evaluate(() => {
      const seen = [];
      document.querySelectorAll('[role="menuitem"], [role="button"], a').forEach(el => {
        const t = (el.innerText || '').trim().split('\n')[0];
        if (t && t.length < 70 && !seen.includes(t)) seen.push(t);
      });
      return seen.filter(t => /Nolan|Geske|PING|Switch|profile/i.test(t)).slice(0, 25);
    });
    // 3. Click the option that switches to the personal profile (Nolan Geske).
    const switched = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[role="menuitem"], [role="button"], a'));
      const target = els.find(el => {
        const t = (el.innerText || '').trim();
        return /Nolan\s*Geske/i.test(t) && /switch/i.test(t);
      }) || els.find(el => /Nolan\s*Geske/i.test((el.innerText || '').trim()));
      if (target) { target.click(); return true; }
      return false;
    });
    out.notes.push('switchClicked=' + switched);
    await sleep(6000);
    // 4. Load the listing and check identity note.
    await page.goto(`https://www.facebook.com/marketplace/item/${LISTING_ID}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    const body = await page.evaluate(() => document.body.innerText.slice(0, 3000));
    out.identity = /Pages can't use Marketplace/.test(body) ? 'PAGE' : 'PERSONAL?';
    out.notes.push('BODY:' + body.replace(/\n+/g, ' | ').slice(0, 900));
    if (WARN_RE.test(body)) { out.notes.push('WARN_DETECTED'); }
    // 5. Find share/group controls.
    out.shareControls = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, [role="button"], [role="menuitem"]'));
      return els
        .map(e => (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 70))
        .filter(t => /share|more places|groups|manage/i.test(t))
        .filter((t, i, a) => t && a.indexOf(t) === i)
        .slice(0, 30);
    });
    // 6. Click "Share" and dump the dialog.
    const shareClicked = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const s = els.find(el => {
        const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
        return /^share$/i.test(t) || /share listing/i.test(t);
      });
      if (s) { s.click(); return true; }
      return false;
    });
    out.notes.push('shareClicked=' + shareClicked);
    await sleep(5000);
    out.dialogGroups = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return ['NO_DIALOG'];
      const items = Array.from(dlg.querySelectorAll('[role="checkbox"], [role="menuitemcheckbox"], li, label'));
      return items.map(e => (e.innerText || '').trim().replace(/\n+/g, ' / ').slice(0, 120))
        .filter(t => t.length > 2).slice(0, 60);
    });
    const dlgText = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return dlg ? dlg.innerText.slice(0, 2000).replace(/\n+/g, ' | ') : 'NO_DIALOG_TEXT';
    });
    out.notes.push('DIALOG:' + dlgText.slice(0, 1200));
    fs.writeFileSync(RES, JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
    await page.close();
    process.exit(0);
  } catch (e) {
    out.error = String(e.message || e).slice(0, 300);
    try { fs.writeFileSync(RES, JSON.stringify(out, null, 1)); } catch (_) {}
    console.log(JSON.stringify(out, null, 1));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
