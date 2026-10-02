#!/usr/bin/env node
// Debug: dump the "List in more places" dialog DOM structure.
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
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return { noDialog: true };
      const out = { htmlLen: dlg.innerHTML.length, roles: {}, inputs: [] };
      dlg.querySelectorAll('*').forEach(el => {
        const r = el.getAttribute('role');
        if (r) out.roles[r] = (out.roles[r] || 0) + 1;
      });
      dlg.querySelectorAll('input').forEach(i => out.inputs.push(i.type));
      // First 1200 chars of innerHTML to see row markup
      out.head = dlg.innerHTML.slice(0, 1200);
      // Find text "Western Colorado" and show its ancestors
      const walker = document.createTreeWalker(dlg, NodeFilter.SHOW_TEXT);
      let node, chain = null;
      while ((node = walker.nextNode())) {
        if (/Western Colorado Message/.test(node.textContent)) {
          const c = [];
          let el = node.parentElement;
          for (let i = 0; i < 6 && el; i++) { c.push(el.tagName + (el.getAttribute('role') ? '[role=' + el.getAttribute('role') + ']' : '')); el = el.parentElement; }
          chain = c.join(' < ');
          break;
        }
      }
      out.chain = chain;
      return out;
    });
    console.log(JSON.stringify(info, null, 1).slice(0, 3000));
    await page.close();
    process.exit(0);
  } catch (e) {
    console.log('FATAL ' + String(e.message || e).slice(0, 200));
    try { await page.close(); } catch (_) {}
    process.exit(1);
  }
})();
