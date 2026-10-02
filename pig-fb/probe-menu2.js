#!/usr/bin/env node
// READ-ONLY probe round 2: why does the Playwright click on the Following
// button time out on these destination Pages? Captures full click error,
// elementFromPoint at button center, stability, then a FORCE-click diagnostic
// (opens the menu only; never clicks any menu item).
const fs = require('fs');
const { chromium } = require('playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const TARGET = process.argv[2] || 'https://www.facebook.com/deeplearningng';
const OUT = 'C:/Users/nolan/.local/share/pigi/fb-engage/probe-menu2-result.json';

(async () => {
  const diag = { target: TARGET, steps: [] };
  const step = (name, data) => diag.steps.push({ name, ...data });
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  } catch (e) {
    diag.error = 'CDP attach failed: ' + String(e.message || e).slice(0, 200);
    fs.writeFileSync(OUT, JSON.stringify(diag, null, 2));
    console.log(JSON.stringify(diag));
    process.exit(3);
  }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000); // let the header fully hydrate

    const btn = page.getByLabel('Following', { exact: true }).first();

    // 1. Full normal-click error (no truncation).
    let clickErr = null;
    try {
      await btn.scrollIntoViewIfNeeded({ timeout: 10000 });
      await btn.click({ timeout: 12000 });
      step('normal-click', { result: 'CLICK_SUCCEEDED' });
    } catch (e) { clickErr = String(e.message || e); step('normal-click', { result: 'TIMEOUT_OR_ERROR', err: clickErr }); }
    await sleep(1500);

    // 2. What is at the button's click point?
    const hit = await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Following"]');
      if (!el) return { found: false };
      const r = el.getBoundingClientRect();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      const chain = [];
      let t = top, g = 0;
      while (t && g++ < 6) {
        chain.push(t.tagName + (t.id ? '#' + t.id : '') +
          ' aria=' + (t.getAttribute('aria-label') || '-').slice(0, 40) +
          ' pe=' + getComputedStyle(t).pointerEvents +
          ' pos=' + getComputedStyle(t).position +
          ' z=' + getComputedStyle(t).zIndex);
        t = t.parentElement;
      }
      // stability: sample rect twice
      const r1 = el.getBoundingClientRect();
      return new Promise(res => setTimeout(() => {
        const r2 = el.getBoundingClientRect();
        res({
          found: true,
          btnRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          btnPE: getComputedStyle(el).pointerEvents,
          btnPosition: getComputedStyle(el).position,
          moved: Math.abs(r1.x - r2.x) + Math.abs(r1.y - r2.y),
          hitChain: chain,
          hitIsButton: chain.length ? chain[0].indexOf('aria=Following') !== -1 : null,
        });
      }, 1200));
    });
    step('hit-test', hit);

    // 3. Force-click diagnostic (opens menu; read-only, clicks nothing inside it).
    let forceErr = null, forceOk = false;
    try {
      await btn.click({ timeout: 12000, force: true });
      forceOk = true;
    } catch (e) { forceErr = String(e.message || e).slice(0, 500); }
    step('force-click', { ok: forceOk, err: forceErr });
    await sleep(3500);

    // 4. After force-click: is there now a menu / unfollow text?
    const after = await page.evaluate(() => {
      const norm = s => (s || '').replace(/\s+/g, ' ').trim();
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const hits = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let n, guard = 0;
      while ((n = walker.nextNode()) && guard++ < 60000) {
        const t = norm(n.innerText || '');
        if (/unfollow/i.test(t) && t.length < 200) {
          hits.push({ tag: n.tagName, role: n.getAttribute('role'), text: t.slice(0, 120), visible: vis(n) });
          if (hits.length >= 25) break;
        }
      }
      const menus = Array.from(document.querySelectorAll('[role="menu"],[role="menuitem"]'))
        .slice(0, 20).map(e => ({ role: e.getAttribute('role'), text: norm(e.innerText).slice(0, 150), visible: vis(e) }));
      return { hits, menus };
    });
    step('after-force-click', after);

    await page.close().catch(() => {});
    diag.ok = true;
  } catch (e) {
    diag.error = String(e.message || e).slice(0, 400);
  }
  fs.writeFileSync(OUT, JSON.stringify(diag, null, 2));
  console.log(JSON.stringify(diag, null, 2).slice(0, 6000));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, error: String(e).slice(0, 300) })); process.exit(5); });
