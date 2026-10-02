// FYD perf probe: load each demo site in headless-shell mobile viewport,
// collect resource transfer sizes + LCP + CLS + long tasks + synthetic tap latency.
const { chromium } = require('/mnt/c/Users/nolan/node_modules/playwright-core');

const SITES = ['happy-place', 'coppersmith-plumbing'];
const EXE = '/home/nolan/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

async function measure(browser, site) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0; window.__longtasks = 0; window.__longtaskDur = 0; window.__events = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.startTime > window.__lcp) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__longtasks++; window.__longtaskDur += e.duration; } }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__events.push({ name: e.name, dur: Math.round(e.duration), delay: Math.round(e.processingStart - e.startTime) }); }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  });
  await page.goto(`http://127.0.0.1:3100/sites/${site}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  // synthetic interaction: tap the first prominent button/link as an INP proxy
  let tapResult = 'none';
  try {
    const el = await page.$('button, a[href]');
    if (el) {
      const t0 = Date.now();
      await el.tap({ timeout: 5000 }).catch(() => el.click({ timeout: 5000 }));
      await page.waitForTimeout(1500);
      tapResult = `ok (${Date.now() - t0}ms wall)`;
    }
  } catch (e) { tapResult = 'failed: ' + String(e).slice(0, 80); }
  const data = await page.evaluate(() => {
    const res = performance.getEntriesByType('resource').map(r => ({
      url: r.name.length > 110 ? r.name.slice(0, 110) : r.name,
      host: new URL(r.name).hostname,
      type: r.initiatorType || (r.name.match(/\.([a-z0-9]+)(\?|#|$)/i) || [])[1] || '?',
      t: r.transferSize || 0,
    }));
    const nav = performance.getEntriesByType('navigation')[0] || {};
    return {
      lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(4),
      longtasks: window.__longtasks, longtaskDur: Math.round(window.__longtaskDur),
      events: window.__events.slice(0, 8),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadEvent: Math.round(nav.loadEventEnd || 0),
      res,
    };
  });
  await ctx.close();
  return { site, tapResult, ...data };
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const out = [];
  for (const s of SITES) out.push(await measure(browser, s));
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
