#!/usr/bin/env node
// Read-only diagnostic: screenshot the active meta.ai tab via CDP.
// Never clicks, types, navigates, or closes anything.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 15000 });
  const contexts = browser.contexts();
  let target = null;
  for (const ctx of contexts) {
    for (const p of ctx.pages()) {
      const url = p.url();
      if (/meta\.ai\/prompt\//.test(url)) { target = p; break; }
    }
    if (target) break;
  }
  if (!target) { console.error('no meta.ai prompt tab found'); process.exit(1); }
  console.log('tab: ' + target.url());
  await target.bringToFront().catch(() => {});
  await sleep(1500);
  await target.screenshot({ path: process.argv[2] || 'C:/Users/nolan/.local/share/pigi/fb-engage/diag-metaai.png' });
  const state = await target.evaluate(() => {
    const a = document.activeElement;
    const input = document.querySelector('[contenteditable="true"]');
    return {
      url: location.href,
      title: document.title,
      activeTag: a ? a.tagName : null,
      activeEditable: a ? a.getAttribute('contenteditable') : null,
      inputTextLen: input ? (input.innerText || '').length : -1,
      bodyTextStart: (document.body.innerText || '').slice(0, 400),
      dialogs: Array.from(document.querySelectorAll('[role="dialog"],[role="alertdialog"]')).map(d => (d.innerText || '').slice(0, 200)),
    };
  }).catch(e => ({ error: String(e).slice(0, 200) }));
  console.log(JSON.stringify(state, null, 1).slice(0, 3000));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(1); });
