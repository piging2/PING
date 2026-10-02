#!/usr/bin/env node
// Capture console errors + pageerrors for a URL via CDP.
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'http://127.0.0.1:3100/sites/happy-place';
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9334');
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE_ERROR:', m.text().slice(0, 500)); });
  page.on('pageerror', e => console.log('PAGE_ERROR:', String(e && e.message).slice(0, 800), '\nSTACK:', String(e && e.stack).split('\n').slice(0, 6).join('\n')));
  await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(e => console.log('GOTO:', e.message.slice(0, 200)));
  await page.waitForTimeout(3000);
  await browser.close();
})().catch(e => { console.error('DRIVER_FAIL: ' + (e && e.message)); process.exit(1); });
