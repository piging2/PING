#!/usr/bin/env node
// Probe5: what "Open full node" does + related-service traversal + in-dialog
// Back stack, on the visible dialog. Touch mobile context. Read-only.
// Usage: verify-edge-probe5.cjs <base> <outdir>
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BASE = process.argv[2];
const OUTDIR = process.argv[3] || 'C:/Users/nolan/.local/share/pigi/fb-engage/edge-probe5-20260929-90h';
if (!BASE) { console.error('usage: verify-edge-probe5.cjs <base> <outdir>'); process.exit(2); }

const results = { base: BASE, checks: [] };
function check(id, ok, evidence) {
  results.checks.push({ id, ok: !!ok, evidence });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + id + ' :: ' + JSON.stringify(evidence).slice(0, 340));
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
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, index);
    if (!box) return false;
    await sleep(500);
    await page.touchscreen.tap(box.x, box.y);
    await sleep(2500);
    return true;
  }
  async function visDialog() {
    return page.evaluate(vd => {
      const d = eval(vd);
      if (!d) return { open: false, url: location.href };
      return {
        open: true, url: location.href,
        textStart: ((d.innerText || '').slice(0, 150)).replace(/\n/g, ' | '),
        buttons: [...d.querySelectorAll('button')].map(b => (b.innerText || b.getAttribute('aria-label') || '?').trim().slice(0, 24)),
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
    await sleep(2500);
    return pt.text;
  }

  // 1. Open business dialog, then "Open full node": what changes?
  await tapDoorway(0);
  const before = await visDialog();
  const fnTapped = await tapInDialog(`(e)=>/open full node/i.test(e.innerText||'')`);
  const after = await visDialog();
  const afterUrl = after.url;
  check('Q-J-03b-open-full-node-effect', fnTapped !== null, {
    tapped: fnTapped,
    urlChanged: afterUrl !== before.url, url: afterUrl,
    dialogStillOpen: after.open,
    textChanged: after.open && before.textStart !== after.textStart,
    textStart: (after.textStart || '').slice(0, 120),
  });
  await page.screenshot({ path: OUTDIR + '/p5-fullnode-390.png' });

  // 2. Fresh open, tap related service "Drywall": does dialog traverse to Drywall?
  await page.goto(BASE + '/sites/happy-place', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(4000);
  await tapDoorway(0);
  const biz = await visDialog();
  const svcTapped = await tapInDialog(`(e)=>{const t=(e.innerText||'').trim();return /^service\\s*drywall/i.test(t.replace(/\\n/g,' '));}`);
  const svc = await visDialog();
  const traversedToDrywall = svcTapped !== null && svc.open && /drywall/i.test(svc.textStart || '') && !/happy place carpentry llc/i.test((svc.textStart || '').split('|')[1] || '');
  check('Q-J-03d-related-service-traverses', traversedToDrywall, {
    tapped: svcTapped, dialogOpen: svc.open,
    textStart: (svc.textStart || '').slice(0, 140), url: svc.url,
  });
  await page.screenshot({ path: OUTDIR + '/p5-drywall-390.png' });

  // 3. In-dialog Back: does it return to the business object?
  const backTapped = await tapInDialog(`(e)=>/^(back|‹ back)$/i.test((e.innerText||'').trim())`);
  const backSt = await visDialog();
  check('Q-J-02i-dialog-back-returns', backTapped !== null && backSt.open && /happy place carpentry/i.test(backSt.textStart || ''), {
    tapped: backTapped, textStart: (backSt.textStart || '').slice(0, 120),
  });
  await page.screenshot({ path: OUTDIR + '/p5-back-390.png' });

  check('Q-J-00-zero-pageerrors-p5', errors.length === 0, { count: errors.length, sample: errors.slice(0, 2) });
  await ctx.close();
  fs.writeFileSync(OUTDIR + '/edge-probe5-report.json', JSON.stringify(results, null, 2));
  console.log('EDGE_PROBE5_DONE');
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 500)); process.exit(1); });
