#!/usr/bin/env node
// Probe3: Q-J-02 close paths + Q-J-03 traversal with a real touch-enabled
// mobile context (hasTouch:true, isMobile:true). Read-only.
// Usage: verify-edge-probe3.cjs <base> <outdir>
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BASE = process.argv[2];
const OUTDIR = process.argv[3] || 'C:/Users/nolan/.local/share/pigi/fb-engage/edge-probe3-20260929-90h';
if (!BASE) { console.error('usage: verify-edge-probe3.cjs <base> <outdir>'); process.exit(2); }

const results = { base: BASE, checks: [] };
function check(id, ok, evidence) {
  results.checks.push({ id, ok: !!ok, evidence });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' :: ' + JSON.stringify(evidence).slice(0, 320));
}

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String((e && e.stack) || e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.goto(BASE + '/sites/happy-place', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(6000);

  async function tapDoorway(index) {
    const box = await page.evaluate(i => {
      const as = [...document.querySelectorAll('a[href^="/o/"]')].filter(a => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      const a = as[i];
      if (!a) return null;
      a.scrollIntoView({ block: 'center' });
      const r = a.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, href: a.getAttribute('href') };
    }, index);
    if (!box) return null;
    await sleep(500);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.touchscreen.tap(box.x, box.y);
    await sleep(2500);
    const scrollAfter = await page.evaluate(() => window.scrollY);
    return { href: box.href, scrollDelta: Math.abs(scrollAfter - scrollBefore) };
  }
  async function dialogState() {
    return page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { open: false, url: location.href, scrollY: Math.round(window.scrollY) };
      const h = d.querySelector('h1,h2,h3');
      const r = d.getBoundingClientRect();
      return {
        open: true, url: location.href, scrollY: Math.round(window.scrollY),
        title: h ? h.innerText.slice(0, 60) : null,
        focusInside: d.contains(document.activeElement),
        rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) },
        vh: window.innerHeight,
      };
    });
  }

  // Open first doorway via real touch tap
  const t1 = await tapDoorway(0);
  let st = await dialogState();
  check('Q-J-02a-touch-opens-dialog', st.open, { href: t1 && t1.href, title: st.title });
  check('Q-J-02d-no-tap-scroll-jump', t1 && t1.scrollDelta < 5, { scrollDelta: t1 && t1.scrollDelta });
  check('Q-J-02e-focus-in-dialog', st.focusInside, { focusInside: st.focusInside });
  await page.screenshot({ path: OUTDIR + '/p3-dialog-390.png' });

  // Escape with focus inside
  await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); const b = d && d.querySelector('button'); if (b) b.focus(); });
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(1200);
  st = await dialogState();
  const escClosed = !st.open;
  check('Q-J-02b-escape-closes', escClosed, { dialogOpen: st.open });

  // Close-button path
  if (escClosed) await tapDoorway(0);
  const cb = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const el = [...d.querySelectorAll('button')].find(b => /close/i.test(b.innerText || '') || /close/i.test(b.getAttribute('aria-label') || ''));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  let closeOk = null;
  if (cb) { await page.touchscreen.tap(cb.x, cb.y); await sleep(1200); closeOk = !(await dialogState()).open; }
  check('Q-J-02f-close-button-closes', closeOk === true, { found: !!cb, closed: closeOk });

  // Outside-tap (backdrop) dismissal: tap page area above the sheet
  await tapDoorway(0);
  await sleep(1200);
  const above = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return { x: 60, y: Math.max(40, r.top - 120) };
  });
  let outsideOk = null;
  if (above) { await page.touchscreen.tap(above.x, above.y); await sleep(1200); outsideOk = !(await dialogState()).open; }
  check('Q-J-02g-outside-tap-dismisses', outsideOk === true, { tapped: above, dismissed: outsideOk });

  // Q-J-03: traversal via "Open full node"
  await tapDoorway(0);
  await sleep(1500);
  const fn = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const el = [...d.querySelectorAll('button, a')].find(e => /open full node/i.test(e.innerText || ''));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (fn) {
    await page.touchscreen.tap(fn.x, fn.y);
    await sleep(3500);
    const s2 = await page.evaluate(() => ({
      url: location.href,
      h1: (() => { const h = document.querySelector('h1'); return h ? h.innerText.slice(0, 60) : null; })(),
      dialogOpen: !!document.querySelector('[role="dialog"]'),
    }));
    check('Q-J-03b-full-node-traverses', /\/o\//.test(s2.url), { url: s2.url, h1: s2.h1, dialogOpen: s2.dialogOpen });
    await page.screenshot({ path: OUTDIR + '/p3-full-node-390.png' });
    await page.goBack().catch(() => {});
    await sleep(2500);
    const s3 = await page.evaluate(() => ({ url: location.href, dialogOpen: !!document.querySelector('[role="dialog"]') }));
    check('Q-J-03c-back-restores-sites-page', s3.url.includes('/sites/happy-place') && !s3.dialogOpen, s3);
  } else {
    check('Q-J-03b-full-node-traverses', false, { note: 'no Open full node control in dialog' });
  }

  // Related-service traversal inside dialog (Drywall etc.)
  await tapDoorway(0);
  await sleep(1500);
  const relTitle0 = (await dialogState()).title;
  const svc = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const el = [...d.querySelectorAll('a[href^="/o/"], button')].find(e => {
      const t = (e.innerText || '').trim();
      return /drywall|fencing|painting/i.test(t) && !/open full node/i.test(t);
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: el.innerText.trim().slice(0, 40), href: el.getAttribute('href') };
  });
  if (svc) {
    await page.touchscreen.tap(svc.x, svc.y);
    await sleep(3000);
    const s4 = await page.evaluate(() => ({
      url: location.href,
      title: (() => { const d = document.querySelector('[role="dialog"]'); const h = d && d.querySelector('h1,h2,h3'); return h ? h.innerText.slice(0, 60) : null; })(),
    }));
    check('Q-J-03d-related-service-traverses', !!s4.title && s4.title !== relTitle0, { from: relTitle0, to: s4.title, url: s4.url });
    await page.screenshot({ path: OUTDIR + '/p3-related-390.png' });
  } else {
    check('Q-J-03d-related-service-traverses', false, { note: 'no related service control found' });
  }

  check('Q-J-00-zero-pageerrors-p3', errors.length === 0, { count: errors.length, sample: errors.slice(0, 2) });
  await ctx.close();
  fs.writeFileSync(OUTDIR + '/edge-probe3-report.json', JSON.stringify(results, null, 2));
  console.log('EDGE_PROBE3_DONE');
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
