#!/usr/bin/env node
// Multi-width hydration + screenshot + CLS + peek-containment proof for FYD.
// Windows-side CDP probe (portable node + playwright-core via :9223).
// Usage: verify-hydration-widths.cjs <base> <outdir>
// Read-only except for new tabs, one click, scrolling, and screenshots.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BASE = process.argv[2];
const OUTDIR = process.argv[3] || 'C:/Users/nolan/.local/share/pigi/fb-engage/hydration-widths-20260925';
if (!BASE) { console.error('usage: verify-hydration-widths.cjs <base> <outdir>'); process.exit(2); }

const WIDTHS = [1280, 1440, 1920, 375, 390];
const PAGES = [
  ['hpp', '/sites/happy-place'],
  ['copper', '/sites/coppersmith-plumbing'],
  ['home', '/'],
];

const CLS_SCRIPT = `window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput)window.__cls+=e.value;}}).observe({type:'layout-shift',buffered:true});}catch(e){}`;

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const report = { base: BASE, pages: [] };
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];

  for (const [slug, path] of PAGES) {
    for (const w of WIDTHS) {
      const h = w < 500 ? 844 : 900;
      const page = await ctx.newPage();
      const errors = [];
      const onConsole = m => {
        const t = m.type();
        if (t !== 'error' && t !== 'warning') return;
        errors.push({ type: t, text: m.text().slice(0, 400) });
      };
      const onPageError = e => errors.push({ type: 'pageerror', text: String((e && e.stack) || e).slice(0, 600) });
      page.on('console', onConsole);
      page.on('pageerror', onPageError);
      await page.setViewportSize({ width: w, height: h });
      await page.addInitScript(CLS_SCRIPT);
      let navError = null;
      try {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
        await sleep(7000);
      } catch (e) { navError = String((e && e.message) || e).slice(0, 300); }

      const errs = errors.filter(e => e.type === 'error' || e.type === 'pageerror');
      const hydration418 = errs.filter(e => /418|hydrat/i.test(e.text));
      const st = await page.evaluate(() => {
        const layer = document.querySelector('[data-testid="object-layer"]');
        const nextErr = !!document.querySelector('nextjs-portal');
        return {
          title: document.title,
          readyState: document.readyState,
          objectLayer: !!layer,
          projection: layer && layer.getAttribute('data-projection'),
          nextjsErrorOverlay: nextErr,
          cls: typeof window.__cls === 'number' ? Math.round(window.__cls * 1000) / 1000 : null,
        };
      }).catch(e => ({ error: String(e).slice(0, 200) }));

      let shot = null;
      try { shot = `${OUTDIR}/${slug}-${w}.png`; await page.screenshot({ path: shot }); }
      catch (e) { errors.push({ type: 'screenshot', text: String(e.message).slice(0, 200) }); }

      report.pages.push({
        slug, width: w, navError,
        consoleErrors: errs.length, warnings: errors.filter(e => e.type === 'warning').length,
        hydration418: hydration418.length,
        hydration418Text: hydration418.map(e => e.text.slice(0, 160)),
        nextjsErrorOverlay: st.nextjsErrorOverlay, objectLayer: st.objectLayer,
        projection: st.projection, cls: st.cls, shot,
      });
      await page.close();
    }
  }

  // Peek check on hpp at 1440: click first object-layer button, dialog must
  // open and stay within the viewport.
  const peek = { ok: false, detail: null };
  try {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/sites/happy-place', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    await sleep(6000);
    const btnCount = await page.locator('[data-testid="object-layer"] button').count();
    if (btnCount > 0) {
      await page.locator('[data-testid="object-layer"] button').first().click({ timeout: 10000 });
      await sleep(1500);
      const d = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        if (!dlg) return { found: false };
        const r = dlg.getBoundingClientRect();
        return {
          found: true,
          rect: { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom) },
          inViewport: r.top >= 0 && r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
          vw: window.innerWidth, vh: window.innerHeight,
        };
      });
      await page.screenshot({ path: OUTDIR + '/hpp-peek-1440.png' });
      peek.ok = d.found && d.inViewport;
      peek.detail = { buttons: btnCount, ...d };
      await page.keyboard.press('Escape');
    } else {
      peek.detail = { buttons: 0, note: 'no clickable slot buttons in object layer' };
    }
    await page.close();
  } catch (e) { peek.detail = { error: String((e && e.message) || e).slice(0, 300) }; }
  report.peek1440 = peek;

  fs.writeFileSync(OUTDIR + '/hydration-widths-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
