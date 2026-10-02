#!/usr/bin/env node
// Find the SMALLEST elements whose scrollWidth exceeds their clientWidth
// (the true overflow owners, not just ancestors).
const { chromium } = require('playwright-core');
const BASE = process.env.TRACE_BASE || 'http://127.0.0.1:3100/sites/';
const SITES = ['happy-place', 'coppersmith-plumbing'];
const SRC = `
(function () {
  var out = [];
  var els = document.querySelectorAll('body *');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      var cs = getComputedStyle(el);
      var r = el.getBoundingClientRect();
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined) ? '' : String(el.className).split(/\\s+/).slice(0, 4).join('.'),
        text: (el.textContent || '').trim().slice(0, 40),
        clientW: el.clientWidth, scrollW: el.scrollWidth,
        w: Math.round(r.width),
        display: cs.display, minW: cs.minWidth, ws: cs.whiteSpace,
        flexShrink: cs.flexShrink,
      });
    }
  }
  out.sort(function (a, b) { return a.scrollW - b.scrollW; });
  return { docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, owners: out.slice(0, 12) };
})()
`;
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9334');
  const report = {};
  for (const slug of SITES) {
    const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
    await page.goto(BASE + slug, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    report[slug] = await page.evaluate(SRC);
    await page.close();
  }
  console.log('REPORT_JSON_START');
  console.log(JSON.stringify(report));
  console.log('REPORT_JSON_END');
  await browser.close();
})().catch(e => { console.error('DRIVER_FAIL: ' + (e && e.message)); process.exit(1); });
