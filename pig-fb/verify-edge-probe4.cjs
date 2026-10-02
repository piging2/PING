#!/usr/bin/env node
// Probe4: Q-J-02/Q-J-03 against the VISIBLE dialog only (opacity=1, full-size).
// Touch mobile context. Read-only. Usage: verify-edge-probe4.cjs <base> <outdir>
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BASE = process.argv[2];
const OUTDIR = process.argv[3] || 'C:/Users/nolan/.local/share/pigi/fb-engage/edge-probe4-20260929-90h';
if (!BASE) { console.error('usage: verify-edge-probe4.cjs <base> <outdir>'); process.exit(2); }

const results = { base: BASE, checks: [] };
function check(id, ok, evidence) {
  results.checks.push({ id, ok: !!ok, evidence });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' :: ' + JSON.stringify(evidence).slice(0, 320));
}
const VDISC = `[...document.querySelectorAll('[role="dialog"]')].find(d=>{const r=d.getBoundingClientRect();const cs=getComputedStyle(d);return cs.opacity==='1'&&r.width>300&&r.height>200;})`;

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String((e && e.stack) || e).slice(0, 200)));
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
    await page.touchscreen.tap(box.x, box.y);
    await sleep(2500);
    return box.href;
  }
  async function visDialog() {
    return page.evaluate(vd => {
      const d = eval(vd);
      if (!d) return { open: false, url: location.href };
      const r = d.getBoundingClientRect();
      const text = (d.innerText || '').slice(0, 120).replace(/\n/g, ' | ');
      return {
        open: true, url: location.href,
        textStart: text,
        buttons: [...d.querySelectorAll('button')].map(b => (b.innerText || b.getAttribute('aria-label') || '?').trim().slice(0, 24)),
        links: [...d.querySelectorAll('a[href^="/o/"]')].map(a => ({ href: a.getAttribute('href'), text: (a.innerText || '').trim().slice(0, 30) })).slice(0, 6),
        focusInside: d.contains(document.activeElement),
        rect: { top: Math.round(r.top), bottom: Math.round(r.bottom) }, vh: window.innerHeight,
      };
    }, VDISC);
  }
  async function tapInDialog(matchFnSrc) {
    const pt = await page.evaluate(src => {
      const d = eval(src.vd);
      if (!d) return null;
      const el = [...d.querySelectorAll('button, a')].find(e => { try { return eval(src.fn)(e); } catch (x) { return false; } });
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: (el.innerText || '').trim().slice(0, 30) };
    }, { vd: VDISC, fn: matchFnSrc });
    if (!pt) return null;
    await page.touchscreen.tap(pt.x, pt.y);
    await sleep(2200);
    return pt.text;
  }

  // Open
  const href = await tapDoorway(0);
  let st = await visDialog();
  check('Q-J-02a-visible-dialog-opens', st.open, { href, textStart: st.textStart });
  check('Q-J-02e-focus-in-visible-dialog', st.focusInside, { focusInside: st.focusInside });
  check('Q-J-02h-dialog-has-close-and-actions', st.open && st.buttons.length >= 2, { buttons: st.buttons });
  await page.screenshot({ path: OUTDIR + '/p4-dialog-390.png' });

  // Escape
  await page.evaluate(vd => { const d = eval(vd); const b = d && d.querySelector('button'); if (b) b.focus(); }, VDISC);
  await sleep(300);
  await page.keyboard.press('Escape');
  await sleep(1200);
  st = await visDialog();
  const escClosed = !st.open;
  check('Q-J-02b-escape-closes-visible', escClosed, { dialogOpen: st.open });

  // Close button
  if (escClosed) await tapDoorway(0);
  const closedViaBtn = await tapInDialog(`(e)=>/close/i.test(e.innerText||'')||/close/i.test(e.getAttribute('aria-label')||'')`);
  st = await visDialog();
  check('Q-J-02f-close-button-closes-visible', closedViaBtn !== null && !st.open, { tapped: closedViaBtn, dialogOpen: st.open });

  // Outside tap dismissal
  await tapDoorway(0);
  await sleep(1200);
  const above = await page.evaluate(vd => {
    const d = eval(vd);
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return { x: 60, y: Math.max(30, r.top - 100) };
  }, VDISC);
  let outsideOk = null;
  if (above && above.y > 0 && above.y < 844) {
    await page.touchscreen.tap(above.x, above.y);
    await sleep(1200);
    outsideOk = !(await visDialog()).open;
  }
  check('Q-J-02g-outside-tap-dismisses-visible', outsideOk === true, { tapped: above, dismissed: outsideOk });

  // Q-J-03b: Open full node -> /o/ URL
  await tapDoorway(0);
  await sleep(1200);
  const fnTapped = await tapInDialog(`(e)=>/open full node/i.test(e.innerText||'')`);
  const s2 = await page.evaluate(() => ({
    url: location.href,
    h1: (() => { const h = document.querySelector('h1'); return h ? h.innerText.slice(0, 60) : null; })(),
    textStart: (document.body.innerText || '').slice(0, 100).replace(/\n/g, ' '),
  }));
  check('Q-J-03b-full-node-traverses', fnTapped !== null && /\/o\//.test(s2.url), { tapped: fnTapped, url: s2.url, h1: s2.h1 });
  await page.screenshot({ path: OUTDIR + '/p4-full-node-390.png' });

  // Back -> exact context
  await page.goBack().catch(() => {});
  await sleep(2500);
  const s3 = await page.evaluate(vd => ({ url: location.href, visDialogOpen: !!eval(vd) }), VDISC);
  check('Q-J-03c-back-restores-sites-page', s3.url.includes('/sites/happy-place') && !s3.visDialogOpen, s3);

  // Q-J-03d: related service traversal inside the visible dialog
  await tapDoorway(0);
  await sleep(1200);
  const titleBefore = (await visDialog()).textStart;
  const svcTapped = await tapInDialog(`(e)=>{const t=(e.innerText||'').trim();return /drywall|fencing|painting/i.test(t)&&!/open full node/i.test(t);}`);
  const s4 = await visDialog();
  check('Q-J-03d-related-service-traverses', svcTapped !== null && s4.open && s4.textStart !== titleBefore, { tapped: svcTapped, before: titleBefore.slice(0, 50), after: (s4.textStart || '').slice(0, 50), url: s4.url });
  await page.screenshot({ path: OUTDIR + '/p4-related-390.png' });

  check('Q-J-00-zero-pageerrors-p4', errors.length === 0, { count: errors.length, sample: errors.slice(0, 2) });
  await ctx.close();
  fs.writeFileSync(OUTDIR + '/edge-probe4-report.json', JSON.stringify(results, null, 2));
  console.log('EDGE_PROBE4_DONE');
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
