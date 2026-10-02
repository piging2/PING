#!/usr/bin/env node
// Debug 2: target the CORRECT dialog (the one containing "List in more places").
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://www.facebook.com/marketplace/you/selling', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(9000);
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
    await sleep(10000);
    const info = await page.evaluate(() => {
      const dlgs = Array.from(document.querySelectorAll('[role="dialog"]'));
      const dlg = dlgs.find(d => /List in more places/i.test(d.innerText || ''));
      if (!dlg) return { nDialogs: dlgs.length, found: false };
      const roles = {};
      dlg.querySelectorAll('*').forEach(el => {
        const r = el.getAttribute('role');
        if (r) roles[r] = (roles[r] || 0) + 1;
      });
      // Ancestor chain of "Western Colorado Message" text
      const walker = document.createTreeWalker(dlg, NodeFilter.SHOW_TEXT);
      let node, chain = null, rowHtml = null;
      while ((node = walker.nextNode())) {
        if (/Western Colorado Message/.test(node.textContent)) {
          const c = [];
          let el = node.parentElement;
          for (let i = 0; i < 8 && el && el !== dlg; i++) {
            c.push(el.tagName + (el.getAttribute('role') ? '[role=' + el.getAttribute('role') + ']' : '') + (el.getAttribute('aria-checked') ? '[checked=' + el.getAttribute('aria-checked') + ']' : ''));
            el = el.parentElement;
          }
          chain = c.join(' < ');
          // find the row container (the one that also holds the checkbox) and dump its outerHTML head
          let row = node.parentElement;
          while (row && row !== dlg && !row.querySelector('[role="checkbox"], input[type="checkbox"]')) row = row.parentElement;
          if (row && row !== dlg) rowHtml = row.outerHTML.slice(0, 1500);
          break;
        }
      }
      // buttons in dialog
      const btns = [];
      dlg.querySelectorAll('button, [role="button"]').forEach(b => btns.push((b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 40)));
      return { nDialogs: dlgs.length, found: true, roles, chain, rowHtml, btns: [...new Set(btns)] };
    });
    console.log(JSON.stringify(info, null, 1).slice(0, 4000));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
