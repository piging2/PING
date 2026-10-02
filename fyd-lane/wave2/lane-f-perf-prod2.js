#!/usr/bin/env node
// Lane F: performance measurement on the real server via Pig headed Chrome.
// Measures TTFB, DCL, load, LCP, total bytes, image bytes per URL x viewport.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://100.79.154.43:3101';
const URLS = ['/', '/sites/happy-place', '/sites/coppersmith-plumbing'];
const VIEWPORTS = [
  { name: 'desktop', w: 1280, h: 800 },
  { name: 'mobile', w: 390, h: 844 },
];
const results = { started: new Date().toISOString(), measurements: [] };
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  // LCP observer installed via init script (evaluateOnNewDocument is not
  // available on CDP-attached pages in this playwright-core version).
  await ctx.addInitScript(() => {
    window.__lcp = 0;
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) window.__lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (err) {}
  });
  for (const u of URLS) {
    for (const vp of VIEWPORTS) {
      const tag = `${u === '/' ? 'root' : u.split('/').pop()}@${vp.name}`;
      const page = await ctx.newPage();
      await page.setViewportSize({ width: vp.w, height: vp.h });
      let totalBytes = 0, imageBytes = 0, reqCount = 0;
      page.on('response', async r => {
        try {
          const buf = await r.body().catch(() => null);
          if (buf) {
            totalBytes += buf.length; reqCount++;
            const ct = (r.headers()['content-type'] || '');
            if (ct.startsWith('image/')) imageBytes += buf.length;
          }
        } catch (e) { /* ignore */ }
      });
      try {
        const t0 = Date.now();
        const resp = await page.goto(BASE + u, { waitUntil: 'commit', timeout: 45000 });
        const ttfb = Date.now() - t0;
        await page.waitForLoadState('load', { timeout: 45000 });
        await sleep(2500); // let LCP settle
        const timing = await page.evaluate(() => {
          const t = performance.getEntriesByType('navigation')[0];
          return {
            dcl: t ? Math.round(t.domContentLoadedEventEnd) : -1,
            load: t ? Math.round(t.loadEventEnd) : -1,
            lcp: Math.round(window.__lcp || -1),
          };
        });
        await sleep(500);
        results.measurements.push({
          tag, url: u, viewport: vp.name,
          http: resp && resp.status(),
          ttfbMs: ttfb,
          dclMs: timing.dcl, loadMs: timing.load, lcpMs: timing.lcp,
          requests: reqCount,
          totalBytes, totalKB: Math.round(totalBytes / 102.4) / 10,
          imageBytes, imageKB: Math.round(imageBytes / 102.4) / 10,
        });
        console.log(`PERF ${tag} ttfb=${ttfb}ms dcl=${timing.dcl}ms load=${timing.load}ms lcp=${timing.lcp}ms req=${reqCount} total=${Math.round(totalBytes / 1024)}KB img=${Math.round(imageBytes / 1024)}KB`);
      } catch (e) {
        console.log(`PERF FAIL ${tag} :: ${String(e.message || e).slice(0, 150)}`);
        results.measurements.push({ tag, url: u, viewport: vp.name, error: String(e.message || e).slice(0, 150) });
      }
      await page.close();
    }
  }
  console.log('RESULT_JSON_BEGIN');
  console.log(JSON.stringify(results, null, 2));
  console.log('RESULT_JSON_END');
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(1); });
