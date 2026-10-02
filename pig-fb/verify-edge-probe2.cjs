#!/usr/bin/env node
// Focused re-probe: Q-J-02 close paths + scroll (artifact-free) and Q-J-03
// traversal on the SERVED :3100 build. Read-only: tabs, taps, screenshots.
// Usage: verify-edge-probe2.cjs <base> <outdir>
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BASE = process.argv[2];
const OUTDIR = process.argv[3] || 'C:/Users/nolan/.local/share/pigi/fb-engage/edge-probe2-20260929-90h';
if (!BASE) { console.error('usage: verify-edge-probe2.cjs <base> <outdir>'); process.exit(2); }

const results = { base: BASE, checks: [] };
function check(id, ok, evidence) {
  results.checks.push({ id, ok: !!ok, evidence });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' :: ' + JSON.stringify(evidence).slice(0, 320));
}

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const ctx = browser.contexts().find(c => c.pages().length) || browser.contexts()[0];
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String((e && e.stack) || e).slice(0, 200)));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/sites/happy-place', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await sleep(6000);

  // Precise min-target measurement: which doorway is smallest?
  const doors = await page.evaluate(() => [...document.querySelectorAll('a[href^="/o/"]')].map(a => {
    const r = a.getBoundingClientRect();
    return { href: a.getAttribute('href'), w: Math.round(r.width), h: Math.round(r.height), cls: a.className.slice(0, 40), visible: r.width > 0 && r.height > 0 };
  }));
  const vis = doors.filter(d => d.visible);
  const smallest = vis.slice().sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h))[0];
  check('Q-J-01c-min-target-exact', smallest && Math.min(smallest.w, smallest.h) >= 44, { smallest });

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
    await sleep(400);
    await page.touchscreen.tap(box.x, box.y);
    await sleep(2500);
    return box.href;
  }
  async function dialogState() {
    return page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { open: false, url: location.href, scrollY: window.scrollY };
      const h = d.querySelector('h1,h2,h3');
      return {
        open: true, url: location.href, scrollY: window.scrollY,
        title: h ? h.innerText.slice(0, 60) : null,
        hasClose: !!d.querySelector('button'),
        focusInside: d.contains(document.activeElement),
        activeTag: document.activeElement ? document.activeElement.tagName : null,
      };
    });
  }

  // Open via real tap (no Playwright auto-scroll)
  const href = await tapDoorway(0);
  let st = await dialogState();
  const scrollAtOpen = st.scrollY;
  check('Q-J-02a-tap-opens-dialog', st.open, { href, title: st.title, url: st.url });

  // Scroll preservation: tap caused no programmatic scroll beyond the manual scrollIntoView
  const scrollAfterSettle = (await dialogState()).scrollY;
  check('Q-J-02d-scroll-stable-while-open', Math.abs(scrollAfterSettle - scrollAtOpen) < 5, { atOpen: scrollAtOpen, afterSettle: scrollAfterSettle });

  // Focus inside dialog?
  check('Q-J-02e-focus-in-dialog', st.focusInside, { focusInside: st.focusInside, activeTag: st.activeTag });

  // Escape with focus inside the dialog
  await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); if (d) { const b = d.querySelector('button'); if (b) b.focus(); } });
  await page.keyboard.press('Escape');
  await sleep(1200);
  st = await dialogState();
  const escClosed = !st.open;
  check('Q-J-02b-escape-closes', escClosed, { dialogOpen: st.open });

  // Close-button path (re-open if Escape worked, else use existing dialog)
  if (escClosed) await tapDoorway(0);
  const closeBtn = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const btns = [...d.querySelectorAll('button')];
    const cb = btns.find(b => /close/i.test(b.innerText || '') || /close/i.test(b.getAttribute('aria-label') || ''));
    if (!cb) return null;
    const r = cb.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: (cb.innerText || '').slice(0, 20) };
  });
  let closeOk = null;
  if (closeBtn) {
    await page.touchscreen.tap(closeBtn.x, closeBtn.y);
    await sleep(1200);
    st = await dialogState();
    closeOk = !st.open;
  }
  check('Q-J-02f-close-button-closes', closeOk === true, { found: !!closeBtn, closed: closeOk });
  await page.screenshot({ path: OUTDIR + '/p2-after-close-390.png' });

  // Q-J-03: traversal. Re-open, tap first related service doorway inside dialog.
  await tapDoorway(0);
  await sleep(1500);
  const rel = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return { open: false };
    const titleEl = d.querySelector('h1,h2,h3');
    const cands = [...d.querySelectorAll('a[href^="/o/"], button[data-fyd-object-id], a[data-fyd-object-id]')].map(el => ({
      tag: el.tagName,
      href: el.getAttribute('href'),
      oid: el.getAttribute('data-fyd-object-id'),
      text: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 60),
      rect: (() => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) }; })(),
    }));
    const fullNode = [...d.querySelectorAll('button, a')].find(el => /open full node/i.test(el.innerText || ''));
    return {
      open: true, title: titleEl ? titleEl.innerText.slice(0, 60) : null,
      candidates: cands.slice(0, 8),
      hasFullNode: !!fullNode,
      fullNodeText: fullNode ? fullNode.innerText.slice(0, 30) : null,
    };
  });
  check('Q-J-03a-dialog-has-related-doorways', rel.open && rel.candidates.length > 0, { title: rel.title, count: rel.candidates.length, sample: rel.candidates.slice(0, 3).map(c => c.text + '|' + (c.href || c.oid)) });

  // Traverse via "Open full node" if present (strongest doorway->object proof)
  let traversed = null, travUrl = null, travTitle = null;
  if (rel.hasFullNode) {
    const btn = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const el = [...d.querySelectorAll('button, a')].find(e => /open full node/i.test(e.innerText || ''));
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.touchscreen.tap(btn.x, btn.y);
    await sleep(3000);
    const s2 = await page.evaluate(() => ({
      url: location.href,
      title: document.title.slice(0, 80),
      h1: (() => { const h = document.querySelector('h1'); return h ? h.innerText.slice(0, 60) : null; })(),
      dialogOpen: !!document.querySelector('[role="dialog"]'),
    }));
    travUrl = s2.url; travTitle = s2.h1 || s2.title;
    traversed = /\/o\//.test(s2.url);
    check('Q-J-03b-full-node-traverses', traversed, { url: travUrl, title: travTitle, dialogOpen: s2.dialogOpen });
    await page.screenshot({ path: OUTDIR + '/p2-full-node-390.png' });
    // Back -> exact context
    await page.goBack().catch(() => {});
    await sleep(2500);
    const s3 = await page.evaluate(() => ({ url: location.href, dialogOpen: !!document.querySelector('[role="dialog"]') }));
    check('Q-J-03c-back-restores-sites-page', s3.url.includes('/sites/happy-place') && !s3.dialogOpen, s3);
  } else {
    // fallback: tap first related candidate inside the dialog
    const target = (rel.candidates || [])[0];
    if (target) {
      await page.touchscreen.tap(target.rect.x, target.rect.y);
      await sleep(3000);
      const s2 = await page.evaluate(() => ({ url: location.href, title: (document.querySelector('[role="dialog"] h1, [role="dialog"] h2, [role="dialog"] h3') || {}).innerText || null }));
      travUrl = s2.url; travTitle = s2.title;
      const idFrag = ((target.href || '').split('/o/')[1] || target.oid || '').slice(0, 10);
      traversed = !!s2.title && (idFrag ? JSON.stringify(s2).includes(idFrag.slice(0, 6)) : true);
      check('Q-J-03b-related-tap-traverses', traversed, { target: target.text, url: travUrl, title: travTitle });
    } else {
      check('Q-J-03b-related-tap-traverses', false, { note: 'no related candidate' });
    }
  }

  check('Q-J-00-zero-pageerrors-p2', errors.length === 0, { count: errors.length, sample: errors.slice(0, 2) });
  await page.screenshot({ path: OUTDIR + '/p2-final-390.png' });
  await page.close();

  fs.writeFileSync(OUTDIR + '/edge-probe2-report.json', JSON.stringify(results, null, 2));
  console.log('EDGE_PROBE2_DONE');
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
