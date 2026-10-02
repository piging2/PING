#!/usr/bin/env node
// Debug: why can't Windows Chrome reach the FYD dev server?
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  const p = await ctx.newPage();
  const urls = [
    'http://127.0.0.1:3100/sites/happy-place',
    'http://100.79.154.43:3100/sites/happy-place',
    'http://172.21.65.209:3100/sites/happy-place',
  ];
  for (const u of urls) {
    try {
      const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 12000 });
      console.log('OK', u, '->', r && r.status());
    } catch (e) {
      console.log('FAIL', u, '->', String(e.message || e).slice(0, 180));
    }
  }
  await p.close();
  process.exit(0);
})().catch(e => { console.error('FATAL', String(e.message || e).slice(0, 300)); process.exit(1); });
