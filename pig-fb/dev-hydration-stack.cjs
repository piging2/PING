#!/usr/bin/env node
// Full-stack hydration probe: captures the COMPLETE dev-mode hydration
// error text (component stack) to a file for analysis.
const fs = require('fs');
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = process.argv[2];
const OUT = process.argv[3] || 'C:/Users/nolan/.local/share/pigi/fb-engage/hydra-stack.txt';

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + String((err && err.stack) || err)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
  await sleep(8000);
  await page.close();
  fs.writeFileSync(OUT, errors.join('\n\n=====NEXT=====\n\n'));
  console.log('wrote ' + OUT + ' bytes=' + errors.join('').length + ' errors=' + errors.length);
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
