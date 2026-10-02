#!/usr/bin/env node
// FYD mobile overflow trace driver (FL-20260921-033). Runs on the Pig under
// Windows node. Connects via CDP to headless Chrome on :9334, loads each demo
// site at 375x812, evaluates the overflow trace, captures hero visibility
// assertions, and prints a JSON verdict.
const fs = require('fs');
const { chromium } = require('playwright-core');

const TDIR = 'C:/Temp/fyd-trace';
const TRACE_SRC = fs.readFileSync(TDIR + '/trace.js', 'utf8');
const SITES = ['happy-place', 'coppersmith-plumbing'];
const BASE = process.env.TRACE_BASE || 'http://127.0.0.1:3100/sites/';
const VW = parseInt(process.env.TRACE_VW || '375', 10);
const VH = parseInt(process.env.TRACE_VH || '812', 10);
const TAG = process.env.TRACE_TAG || `${VW}`;

const VIS_SRC = `
(function () {
  // Business hero h1: the h1 rendered by the FYD renderer Hero section,
  // not the demo shell banner ("Generated site demo").
  var h1s = Array.prototype.slice.call(document.querySelectorAll('h1'));
  var h1 = null;
  for (var i = 0; i < h1s.length; i++) {
    if (h1s[i].textContent.trim() !== 'Generated site demo') { h1 = h1s[i]; break; }
  }
  if (!h1) h1 = document.querySelector('main h1') || document.querySelector('h1');
  var r = h1 ? h1.getBoundingClientRect() : null;
  var nav = document.querySelector('nav');
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')).map(function (a) {
    var b = a.getBoundingClientRect();
    return { text: (a.textContent || '').trim().slice(0, 24), x: Math.round(b.x), w: Math.round(b.width) };
  }) : [];
  return {
    h1Text: h1 ? h1.textContent.trim().slice(0, 60) : null,
    h1Rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), right: Math.round(r.right) } : null,
    h1Visible: r ? (r.right <= window.innerWidth + 1 && r.x >= -1) : null,
    docScrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    navLinks: navLinks.slice(0, 8),
  };
})()
`;

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9334');
  const report = {};
  for (const slug of SITES) {
    const page = await browser.newPage({ viewport: { width: VW, height: VH } });
    await page.goto(BASE + slug, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    const res = await page.evaluate(
      TRACE_SRC + `
      var hs = Array.prototype.slice.call(document.querySelectorAll('h1'));
      var hero = null;
      for (var i = 0; i < hs.length; i++) {
        if (hs[i].textContent.trim() !== 'Generated site demo') { hero = hs[i]; break; }
      }
      fydOverflowTrace(hero || undefined);`
    );
    const vis = await page.evaluate(VIS_SRC);
    await page.screenshot({ path: `${TDIR}/${slug}-${TAG}.png` });
    const overflowing = res.rows
      .map((r, i) => ({ i, ...r }))
      .filter(r => r.overflows)
      .map(r => ({
        depth: r.i, el: r.tag + (r.id ? '#' + r.id : ''),
        cls: String(r.classes).split(/\s+/).slice(0, 5).join('.'),
        display: r.display, width: r.width, minWidth: r.minWidth,
        clientW: r.clientWidth, scrollW: r.scrollWidth,
        flexShrink: r.flexShrink, flexBasis: r.flexBasis,
        gridCols: r.gridTemplateColumns, ws: r.whiteSpace,
        overflowWrap: r.overflowWrap, position: r.position, transform: r.transform,
      }));
    report[slug] = {
      vis,
      overflowCount: overflowing.length,
      owner: res.owner ? {
        depth: res.owner.depth, tag: res.owner.row.tag,
        cls: String(res.owner.row.classes).split(/\s+/).slice(0, 6).join('.'),
        full: res.owner.row,
      } : null,
      overflowing,
    };
    await page.close();
  }
  fs.writeFileSync(TDIR + '/report.json', JSON.stringify(report, null, 2));
  console.log('REPORT_JSON_START');
  console.log(JSON.stringify(report));
  console.log('REPORT_JSON_END');
  await browser.close();
})().catch(e => { console.error('DRIVER_FAIL: ' + (e && e.message)); process.exit(1); });
