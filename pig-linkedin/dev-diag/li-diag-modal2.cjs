#!/usr/bin/env node
// li-diag-modal2.cjs: READ-ONLY invite-modal DOM diagnosis, v2.
// Scopes the Connect click to the open More menu (v1 clicked the wrong
// control page-wide) and dumps ALL div[role="dialog"] so a search popover
// can't shadow the invite modal. NEVER clicks Send. argv[2] = profile url,
// argv[3] = out path.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BLOCK_RE = /checkpoint|verify your identity|unusual activity|temporarily restricted|captcha|account restricted/i;
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9224', { timeout: 15000 });
  const ctx = (browser.contexts().find(c => c.pages().length) || browser.contexts()[0]);
  const page = await ctx.newPage();
  const out = { profile: process.argv[2], dialogs: [], signals: [] };
  try {
    await page.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    const pre = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    const bm = pre.match(BLOCK_RE);
    if (bm) { out.signals.push('BLOCKED: ' + bm[0]); throw new Error('blocked'); }
    const moreOpened = await page.evaluate(() => {
      const vis = b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const more = Array.from(document.querySelectorAll('button'))
        .find(b => vis(b) && /^more$/i.test((b.getAttribute('aria-label') || '').trim()));
      if (!more) return false;
      more.scrollIntoView({ block: 'center' });
      more.click();
      return true;
    });
    out.moreOpened = moreOpened;
    if (!moreOpened) throw new Error('no More button');
    await sleep(2000);
    // Scope to the open menu only.
    const connectClicked = await page.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const menu = document.querySelector('[role="menu"]');
      if (!menu) return 'no-menu';
      const els = Array.from(menu.querySelectorAll('button, [role="menuitem"], [role="menuitemradio"], div, span'));
      const item = els.find(e => {
        if (!vis(e)) return false;
        const t = ((e.getAttribute('aria-label') || '') + ' ' + (e.innerText || '')).trim();
        if (!/^connect$/i.test(t) && !/invite .* to connect/i.test(t)) return false;
        if (/disconnect/i.test(t)) return false;
        return true;
      });
      if (!item) return 'no-item';
      item.scrollIntoView({ block: 'center' });
      item.click();
      return 'clicked';
    });
    out.connectClicked = connectClicked;
    if (connectClicked !== 'clicked') throw new Error('connect not clicked: ' + connectClicked);
    await sleep(3500);
    // Dump EVERY dialog so a search popover can't shadow the invite modal.
    out.dialogs = await page.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return Array.from(document.querySelectorAll('div[role="dialog"]')).map(dlg => ({
        testid: dlg.getAttribute('data-testid') || '',
        visible: vis(dlg),
        textHead: (dlg.innerText || '').trim().slice(0, 300),
        buttons: Array.from(dlg.querySelectorAll('button')).map(b => ({
          text: (b.innerText || '').trim().slice(0, 60),
          aria: (b.getAttribute('aria-label') || '').slice(0, 100),
          disabled: !!b.disabled,
          ariaDisabled: b.getAttribute('aria-disabled'),
          cls: (b.className || '').toString().slice(0, 100),
          html: b.outerHTML.slice(0, 350),
        })),
      }));
    });
    // Close without sending: Escape twice.
    await page.keyboard.press('Escape');
    await sleep(1000);
    await page.keyboard.press('Escape');
    await sleep(1000);
    out.closed = await page.evaluate(() => !Array.from(document.querySelectorAll('div[role="dialog"]')).some(d => { const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0; }));
  } catch (e) {
    out.error = String(e.message || e).slice(0, 200);
    try { await page.keyboard.press('Escape'); } catch (e2) {}
  } finally {
    try { await page.close(); } catch (e) {}
  }
  fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ dialogs: out.dialogs.length, closed: out.closed, signals: out.signals, error: out.error || null }));
})();
