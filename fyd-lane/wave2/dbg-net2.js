#!/usr/bin/env node
// Debug round 2: fresh page per URL, isolated attempts.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  const urls = [
    'http://172.21.65.209:3100/sites/happy-place',
    'http://100.79.154.43:3100/sites/happy-place',
  ];
  for (const u of urls) {
    const p = await ctx.newPage();
    try {
      const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(2000);
      const title = await p.title().catch(() => 'NO-TITLE');
      const url = p.url();
      console.log('OK', u, '->', r && r.status(), 'title=', JSON.stringify(title.slice(0, 60)), 'finalUrl=', url);
    } catch (e) {
      console.log('FAIL', u, '->', String(e.message || e).replace(/\s+/g, ' ').slice(0, 300));
    }
    await p.close();
    await sleep(1000);
  }
  process.exit(0);
})().catch(e => { console.error('FATAL', String(e.message || e).slice(0, 300)); process.exit(1); });
