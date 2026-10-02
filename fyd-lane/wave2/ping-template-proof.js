#!/usr/bin/env node
// PING template (/) browser proof: desktop + mobile loads, overflow,
// console errors, touch targets, screenshots. Runs on the Pig via CDP :9223.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const OUT_DIR = process.env.FYD_PROOF_OUT || 'C:/Users/nolan/.local/share/pigi/fyd-proof/out';
const BASE = 'http://100.79.154.43:3100';
const VIEWPORTS = [
  { name: 'desktop-1280', w: 1280, h: 800 },
  { name: 'mobile-375', w: 375, h: 667 },
  { name: 'mobile-390', w: 390, h: 844 },
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { started: new Date().toISOString(), stages: [] };
function stage(name, ok, detail) {
  results.stages.push({ name, ok, detail, at: new Date().toISOString() });
  console.log(`STAGE ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
}
(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  for (const vp of VIEWPORTS) {
    const tag = `ping-root@${vp.name}`;
    const page = await ctx.newPage();
    await page.setViewportSize({ width: vp.w, height: vp.h });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', m => {
      if (m.type() === 'error' && !/_next\/webpack-hmr/.test(m.text())) consoleErrors.push(m.text().slice(0, 300));
    });
    page.on('pageerror', e => pageErrors.push(String(e.message || e).slice(0, 300)));
    try {
      const resp = await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
      await sleep(1500);
      const info = await page.evaluate(() => ({
        title: document.title,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        h1: (document.querySelector('h1') || {}).innerText ? document.querySelector('h1').innerText.slice(0, 80) : 'NO-H1',
      }));
      if (vp.w < 768) {
        info.touchBad = await page.evaluate(() => {
          const bad = [];
          for (const el of document.querySelectorAll('button, a')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if (r.width < 44 || r.height < 44) bad.push(((el.innerText || el.getAttribute('aria-label') || el.tagName) + '').slice(0, 40) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
            if (bad.length >= 10) break;
          }
          return bad;
        });
      } else info.touchBad = [];
      const overflow = info.scrollW > info.clientW + 1;
      const titleOk = /PING/i.test(info.title);
      await page.screenshot({ path: path.join(OUT_DIR, `${tag}.png`), fullPage: false });
      const ok = resp && resp.ok() && !overflow && titleOk && consoleErrors.length === 0 && pageErrors.length === 0 && info.touchBad.length === 0;
      stage(`load:${tag}`, ok,
        `http=${resp && resp.status()} overflow=${overflow} titleOk=${titleOk} consoleErr=${consoleErrors.length} pageErr=${pageErrors.length} touchBad=${info.touchBad.length} h1=${JSON.stringify(info.h1)}` +
        (consoleErrors.length ? ` ERR1=${consoleErrors[0]}` : '') +
        (info.touchBad.length ? ` TOUCH=${JSON.stringify(info.touchBad.slice(0, 5))}` : ''));
    } catch (e) {
      stage(`load:${tag}`, false, 'exception: ' + String(e.message || e).slice(0, 200));
    }
    await page.close();
  }
  console.log('RESULT_JSON_BEGIN');
  console.log(JSON.stringify(results, null, 2));
  console.log('RESULT_JSON_END');
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 500)); process.exit(1); });
