#!/usr/bin/env node
// Presence-law verification for the FYD object-presence direction.
// Runs Windows-side on the Pig (portable node + playwright-core via CDP
// :9223, same pattern as verify-hydration.cjs). Read-only except for a
// new tab, scrolling, one circle click, and screenshots. Never closes
// the browser.
//
// Verifies Nolan's 2026-09-25 object-presence law on a scratch build:
//  - desktop: resting circles are PAGE-ANCHORED (absolute, document
//    coords), not viewport-fixed; scroll down -> they leave with their
//    region; scroll back -> they return; click -> peek/expand works;
//    CLS from the layer stays <= 0.1.
//  - mobile: edge overlay scrolls away naturally (no regression).
//  - /sites pages: MarginObjectLayer has no fixed positioning in its path.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BASE = process.argv[2];
const OUTDIR = process.argv[3] || 'C:/Users/nolan/.local/share/pigi/fb-engage/presence-20260925';
if (!BASE) { console.error('usage: verify-presence.cjs <base-url> [outdir]'); process.exit(2); }

const CLS_SCRIPT = `window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput)window.__cls+=e.value;}}).observe({type:'layout-shift',buffered:true});}catch(e){}`;

async function presenceState(page) {
  return page.evaluate(() => {
    const layer = document.querySelector('[data-ping-presence="edge"]');
    const mount = document.querySelector('[data-ping-host-mount]');
    const mountPrev = mount ? mount.previousElementSibling : null;
    const circles = Array.from(document.querySelectorAll('[data-ping-slot]')).map(el => {
      const r = el.getBoundingClientRect();
      return {
        slot: el.getAttribute('data-ping-slot'),
        peek: el.getAttribute('data-ping-peek') || 'false',
        position: getComputedStyle(el).position,
        rectTop: Math.round(r.top), rectLeft: Math.round(r.left),
        rectW: Math.round(r.width), rectH: Math.round(r.height),
        docY: Math.round(r.top + window.scrollY),
        visible: r.bottom > 0 && r.top < window.innerHeight,
      };
    });
    const heroR = mountPrev ? mountPrev.getBoundingClientRect() : null;
    return {
      layerFound: !!layer,
      layerPosition: layer ? getComputedStyle(layer).position : null,
      layerPresence: layer ? layer.getAttribute('data-ping-presence') : null,
      mountFound: !!mount,
      mountPrevTag: mountPrev ? mountPrev.tagName : null,
      heroDocTop: heroR ? Math.round(heroR.top + window.scrollY) : null,
      heroDocH: heroR ? Math.round(heroR.height) : null,
      scrollY: Math.round(window.scrollY),
      innerH: window.innerHeight,
      docH: document.documentElement.scrollHeight,
      circles,
      cls: typeof window.__cls === 'number' ? window.__cls : null,
    };
  });
}

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const report = { base: BASE, checks: [] };
  const check = (name, ok, detail) => report.checks.push({ name, ok: !!ok, detail: detail ?? null });

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();

  const errors = [];
  const onConsole = m => { const t = m.type(); if (t === 'error' || t === 'warning') errors.push({ type: t, text: m.text().slice(0, 300) }); };
  const onPageError = e => errors.push({ type: 'pageerror', text: String((e && e.stack) || e).slice(0, 500) });
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  // ---------- DESKTOP 1440 ----------
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(CLS_SCRIPT);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(6000);

  const top = await presenceState(page);
  check('desktop: edge presence layer rendered', top.layerFound, { layerFound: top.layerFound });
  check('desktop: layer is absolute (never fixed)', top.layerPosition === 'absolute', { position: top.layerPosition });
  check('desktop: circles placed', top.circles.length > 0, { count: top.circles.length });
  const anyFixed = top.circles.some(c => c.position === 'fixed');
  check('desktop: no circle wrapper is viewport-fixed', !anyFixed, { positions: [...new Set(top.circles.map(c => c.position))] });
  check('desktop: anchor region is the hero section', top.mountPrevTag === 'SECTION', { prevTag: top.mountPrevTag, heroDocTop: top.heroDocTop, heroDocH: top.heroDocH });
  const first = top.circles[0];
  if (first && top.heroDocTop != null && top.heroDocH) {
    const inRegion = first.docY >= top.heroDocTop && first.docY <= top.heroDocTop + top.heroDocH;
    check('desktop: first circle sits inside the hero region (document coords)', inRegion,
      { docY: first.docY, heroTop: top.heroDocTop, heroH: top.heroDocH });
  }
  await page.screenshot({ path: OUTDIR + '/desktop-top-1440.png' });

  // Scroll away: circles must move WITH the page (bounding top decreases by ~scroll delta).
  const beforeTops = top.circles.map(c => c.rectTop);
  await page.evaluate(() => window.scrollBy(0, 1400));
  await sleep(1200);
  const scrolled = await presenceState(page);
  const deltas = scrolled.circles.map((c, i) => beforeTops[i] - c.rectTop);
  const scrolledAway = deltas.length > 0 && deltas.every(d => d > 1100);
  check('desktop: scroll down -> circles scroll away with the region', scrolledAway, { deltas });
  const anyVisibleAfterScroll = scrolled.circles.some(c => c.visible);
  check('desktop: circles leave the viewport after scrolling past the hero', !anyVisibleAfterScroll,
    { visibleCount: scrolled.circles.filter(c => c.visible).length });
  await page.screenshot({ path: OUTDIR + '/desktop-scrolled-1440.png' });

  // Scroll back: circles return with their region.
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1200);
  const back = await presenceState(page);
  const returned = back.circles.length === top.circles.length &&
    back.circles.every((c, i) => Math.abs(c.rectTop - beforeTops[i]) < 40);
  check('desktop: scroll back -> circles return with their region', returned, null);

  // Click: peek/expand opens (engaged portal), Escape closes.
  let expanded = false;
  try {
    const btn = page.locator('[data-ping-slot] button').first();
    await btn.click({ timeout: 8000 });
    await sleep(1500);
    expanded = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    await page.screenshot({ path: OUTDIR + '/desktop-expanded-1440.png' });
    await page.keyboard.press('Escape');
    await sleep(800);
  } catch (e) { errors.push({ type: 'click', text: String(e).slice(0, 200) }); }
  check('desktop: click -> peek/expand opens', expanded, null);

  // CLS from the presence layer (init script observed since navigation).
  const clsVal = back.cls;
  check('desktop: CLS <= 0.1', typeof clsVal === 'number' && clsVal <= 0.1, { cls: clsVal });

  // ---------- MOBILE 390 ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(5000);
  const mob = await page.evaluate(() => {
    const ov = document.querySelector('[data-ping-mobile-overlay]');
    const r = ov ? ov.firstElementChild.getBoundingClientRect() : null;
    return {
      overlayFound: !!ov,
      overlayPosition: ov ? getComputedStyle(ov).position : null,
      firstTop: r ? Math.round(r.top) : null,
      scrollY: Math.round(window.scrollY),
    };
  });
  check('mobile: edge overlay rendered', mob.overlayFound, null);
  check('mobile: overlay is absolute (scrolls away, never fixed)', mob.overlayPosition === 'absolute', { position: mob.overlayPosition });
  await page.screenshot({ path: OUTDIR + '/mobile-top-390.png' });
  await page.evaluate(() => window.scrollBy(0, 1200));
  await sleep(1000);
  const mobAfter = await page.evaluate(() => {
    const ov = document.querySelector('[data-ping-mobile-overlay]');
    const r = ov ? ov.firstElementChild.getBoundingClientRect() : null;
    return { firstTop: r ? Math.round(r.top) : null };
  });
  const mobScrolledAway = mob.firstTop != null && mobAfter.firstTop != null && (mob.firstTop - mobAfter.firstTop) > 900;
  check('mobile: scroll -> overlay scrolls away naturally (no permanent follower)', mobScrolledAway,
    { before: mob.firstTop, after: mobAfter.firstTop });
  // Tap works: tap the first overlay circle -> sheet opens.
  let sheetOpened = false;
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(800);
    await page.locator('[data-ping-mobile-overlay] button').first().click({ timeout: 8000 });
    await sleep(1200);
    sheetOpened = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    await page.screenshot({ path: OUTDIR + '/mobile-sheet-390.png' });
    await page.keyboard.press('Escape');
  } catch (e) { errors.push({ type: 'mobile-tap', text: String(e).slice(0, 200) }); }
  check('mobile: tap -> peek/sheet opens', sheetOpened, null);

  // ---------- SITES PAGES (MarginObjectLayer, 1440) ----------
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [slug, path] of [['hpp', '/sites/happy-place'], ['copper', '/sites/coppersmith-plumbing']]) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    await sleep(5000);
    const st = await page.evaluate(() => {
      const layer = document.querySelector('[data-testid="object-layer"]');
      let fixedCount = 0;
      if (layer) {
        const els = layer.querySelectorAll('*');
        els.forEach(el => { if (getComputedStyle(el).position === 'fixed') fixedCount++; });
        if (getComputedStyle(layer).position === 'fixed') fixedCount++;
      }
      return {
        layerFound: !!layer,
        layerPosition: layer ? getComputedStyle(layer).position : null,
        projection: layer ? layer.getAttribute('data-projection') : null,
        fixedDescendants: fixedCount,
      };
    });
    check(`${slug}: object layer rendered`, st.layerFound, { projection: st.projection });
    check(`${slug}: no fixed positioning in the object-layer path`, st.fixedDescendants === 0,
      { layerPosition: st.layerPosition, fixedDescendants: st.fixedDescendants });
    await page.screenshot({ path: OUTDIR + `/${slug}-1440.png` });
  }

  report.consoleErrors = errors;
  const pageErrors = errors.filter(e => e.type === 'pageerror');
  check('zero pageerrors across all probes', pageErrors.length === 0, { count: pageErrors.length });

  await page.close();
  fs.writeFileSync(OUTDIR + '/presence-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
