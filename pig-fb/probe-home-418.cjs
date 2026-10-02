#!/usr/bin/env node
// Minimal homepage hydration probe: does / throw React #418?
// Windows-side, same CDP pattern as the other probes.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = process.argv[2];
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const errs = [];
  page.on('pageerror', e => errs.push(String((e && e.message) || e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(8000);
  const state = await page.evaluate(() => ({
    has418: errs0 => false,
    layerFound: !!document.querySelector('[data-ping-presence="edge"]'),
    hostMountFound: !!document.querySelector('[data-ping-host-mount]'),
    fixedLayer: !!document.querySelector('.fixed.z-40'),
    circles: document.querySelectorAll('[data-ping-slot]').length,
    nextjsOverlay: !!document.querySelector('nextjs-portal'),
  })).catch(e => ({ evalError: String(e).slice(0, 100) }));
  await page.close();
  console.log(JSON.stringify({ url: URL, pageerrors: errs, state }));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e).slice(0, 300)); process.exit(1); });
