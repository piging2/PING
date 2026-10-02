#!/usr/bin/env node
// Probe: does the React #418 hydration error also occur on :3100 (known-good surface)?
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9224', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  for (const [name, url] of [
    ['3100-happy', 'http://172.21.65.209:3100/sites/happy-place'],
    ['3103-happy', 'http://172.21.65.209:3103/sites/happy-place'],
  ]) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
    page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e.message || e).slice(0, 160)));
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await sleep(2000);
    } catch (e) { errs.push('GOTO: ' + String(e.message).slice(0, 120)); }
    console.log(`${name}: ${errs.length === 0 ? 'CLEAN' : 'ERRORS :: ' + errs.join(' ;; ')}`);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
