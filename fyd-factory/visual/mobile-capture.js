#!/usr/bin/env node
// Mobile visual critique capture for /sites/happy-place (PIG Social FYD).
// Runs on the Pig WINDOWS side: node.exe + playwright-core, CDP http://localhost:9223.
// Read-only w.r.t. user tabs: opens new background tabs, never clicks/types/closes user pages.
// Usage: node.exe mobile-capture.js <outdir>
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = process.argv[2] || 'C:/Users/nolan/.local/share/pigi/fb-engage/visual-mobile';
const WIDTHS = [320, 360, 375, 390, 430];
const DESKTOP_W = 1280;
const URLS = [
  'http://100.79.154.43:3100/sites/happy-place',
  'http://localhost:3100/sites/happy-place',
];

function rr(r) { return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }

async function gotoWithFallback(page, label) {
  let lastErr = '';
  for (const u of URLS) {
    try {
      const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await sleep(1200);
      if (resp && resp.ok()) return { url: u, status: resp.status() };
      lastErr = 'bad status ' + (resp && resp.status());
    } catch (e) { lastErr = String(e.message || e).slice(0, 160); }
  }
  return { url: null, error: lastErr };
}

async function analyze(page) {
  return await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const de = document.documentElement;
    const R = r => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
    const cls = el => ((el.className || '') + '').toString().replace(/\s+/g, ' ').slice(0, 90);
    const out = {
      title: document.title, finalUrl: location.href,
      viewport: { w: vw, h: vh },
      docScrollWidth: de.scrollWidth, docScrollHeight: de.scrollHeight,
      hasHorizontalOverflow: de.scrollWidth > vw + 1,
      bodyTextLen: (document.body.innerText || '').length,
      imageCount: document.querySelectorAll('img').length,
      consoleErrors: (window.__capErrors || []).slice(0, 10),
    };
    // Overflow offenders
    const offenders = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let n, guard = 0;
    while ((n = tw.nextNode()) && guard++ < 20000) {
      const r = n.getBoundingClientRect();
      if (r.width < 2 && r.height < 2) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const cs = getComputedStyle(n);
        if (cs.position === 'fixed') continue; // fixed chrome handled separately
        offenders.push({ tag: n.tagName, id: n.id || '', cls: cls(n), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) });
        if (offenders.length >= 25) break;
      }
    }
    out.overflowOffenders = offenders;
    // Touch targets
    const small = [];
    document.querySelectorAll('a, button, [role="button"], input, select, textarea').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
      if (r.width < 44 || r.height < 44) {
        small.push({ tag: el.tagName, text: (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 42), cls: cls(el), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) });
      }
    });
    out.smallTouchTargets = small.slice(0, 40);
    out.smallTouchTargetTotal = small.length;
    // Fixed / sticky chrome
    out.fixedChrome = [];
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && el.getBoundingClientRect().height > 0) {
        out.fixedChrome.push({ tag: el.tagName, cls: cls(el), pos: cs.position, rect: R(el.getBoundingClientRect()) });
      }
      if (out.fixedChrome.length > 15) return;
    });
    // Nav
    const nav = document.querySelector('nav');
    if (nav) {
      const links = Array.from(nav.querySelectorAll('a, button'));
      out.nav = {
        linkCount: links.length,
        overflows: nav.scrollWidth > nav.clientWidth + 1,
        rect: R(nav.getBoundingClientRect()),
        labels: links.map(a => (a.innerText || '').trim().slice(0, 24)).filter(Boolean).slice(0, 12),
        hasHamburger: /menu|hamburger|bars/i.test(nav.innerHTML.slice(0, 2000)) || !!nav.querySelector('[aria-label*="menu" i], [aria-expanded]'),
      };
    } else out.nav = null;
    // Hero: first meaningful block
    const main = document.querySelector('main') || document.body;
    const first = main.firstElementChild;
    const h1 = document.querySelector('h1');
    out.hero = {
      firstBlockTag: first ? first.tagName : null, firstBlockCls: first ? cls(first) : '',
      h1Text: h1 ? (h1.innerText || '').trim().slice(0, 120) : null,
      h1Wraps: h1 ? (h1.scrollWidth > h1.clientWidth + 1) : null,
      h1Rect: h1 ? R(h1.getBoundingClientRect()) : null,
      heroImgCount: first ? first.querySelectorAll('img').length : 0,
      heroHasBgImage: first ? /url\(/.test(getComputedStyle(first).backgroundImage) : false,
    };
    // CTAs (tel/mailto + primary buttons)
    out.ctas = Array.from(document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')).map(a => ({
      kind: a.getAttribute('href').slice(0, 4), text: (a.innerText || '').trim().slice(0, 44),
      rect: R(a.getBoundingClientRect()), fixed: getComputedStyle(a).position === 'fixed',
    }));
    out.primaryButtons = Array.from(document.querySelectorAll('a, button')).filter(a =>
      /call|contact|quote|book|schedule|get started/i.test((a.innerText || '') + ' ' + (a.getAttribute('aria-label') || ''))
    ).slice(0, 8).map(a => ({ text: (a.innerText || '').trim().slice(0, 44), href: (a.getAttribute('href') || '').slice(0, 60), rect: R(a.getBoundingClientRect()) }));
    // Sections inventory
    const secs = Array.from(main.querySelectorAll(':scope > *')).slice(0, 40);
    out.sections = secs.map(s => {
      const r = s.getBoundingClientRect();
      const txt = (s.innerText || '').trim();
      return { tag: s.tagName, cls: cls(s), h: Math.round(r.height), textLen: txt.length, imgCount: s.querySelectorAll('img').length,
        deadZone: r.height > 420 && txt.length < 60 };
    });
    // Dialogs / sheets
    out.dialogs = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"], [data-sheet], [data-drawer]')).map(d => ({ cls: cls(d), rect: R(d.getBoundingClientRect()), open: d.offsetParent !== null }));
    // AskFYD presence
    const ask = document.querySelector('[data-ask-fyd], [id*="ask"], [class*="ask-fyd" i]');
    out.askFyd = ask ? { present: true, visible: ask.offsetParent !== null, rect: R(ask.getBoundingClientRect()) } : { present: false };
    // Text over media: images with overlaid text (absolute positioned text siblings)
    const tom = [];
    document.querySelectorAll('img').forEach(img => {
      const p = img.parentElement;
      if (!p) return;
      const overlay = Array.from(p.querySelectorAll('*')).some(el => {
        const cs = getComputedStyle(el);
        return (cs.position === 'absolute') && (el.innerText || '').trim().length > 8 && el !== img;
      });
      if (overlay) tom.push({ src: (img.getAttribute('src') || '').slice(-60), rect: R(img.getBoundingClientRect()) });
    });
    out.textOverMedia = tom.slice(0, 10);
    // Card grids: repeating card-like children
    out.grids = [];
    document.querySelectorAll('[class*="grid" i], [class*="cards" i]').forEach(g => {
      const kids = Array.from(g.children).filter(k => k.getBoundingClientRect().height > 20);
      if (kids.length >= 2) {
        const r0 = kids[0].getBoundingClientRect();
        out.grids.push({ cls: cls(g), cardCount: kids.length, firstCardW: Math.round(r0.width), cardsPerRow: kids.filter(k => Math.abs(k.getBoundingClientRect().top - r0.top) < 8).length });
      }
      if (out.grids.length > 8) return;
    });
    return out;
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const runMeta = { startedAt: new Date().toISOString(), widths: {}, errors: [] };
  const widths = [...WIDTHS, DESKTOP_W];
  for (const w of widths) {
    const isDesktop = w === DESKTOP_W;
    const label = isDesktop ? 'desktop-1280-ref' : String(w);
    console.log('CAPTURING ' + label);
    const page = await browser.newPage();
    page.on('pageerror', e => { (page.__errs = page.__errs || []).push(String(e).slice(0, 200)); });
    page.on('console', m => { if (m.type() === 'error') (page.__errs = page.__errs || []).push(m.text().slice(0, 200)); });
    try {
      await page.setViewportSize({ width: w, height: isDesktop ? 900 : 844 });
      const nav = await gotoWithFallback(page, label);
      if (!nav.url) throw new Error('navigation failed: ' + nav.error);
      await page.evaluate(errs => { window.__capErrors = errs || []; }, page.__errs || []);
      const a = await analyze(page);
      a.navResult = nav;
      fs.writeFileSync(path.join(OUT, 'analysis-' + label + '.json'), JSON.stringify(a, null, 1));
      await page.screenshot({ path: path.join(OUT, 'happy-place-' + label + '.png'), fullPage: true });
      await page.screenshot({ path: path.join(OUT, 'happy-place-' + label + '-fold.png'), fullPage: false });
      runMeta.widths[label] = { ok: true, url: nav.url };
      console.log('OK ' + label);
    } catch (e) {
      runMeta.widths[label] = { ok: false, error: String(e.message || e).slice(0, 300) };
      runMeta.errors.push(label + ': ' + String(e.message || e).slice(0, 200));
      console.log('FAIL ' + label + ' ' + String(e.message || e).slice(0, 160));
    }
    await page.close().catch(() => {});
  }
  runMeta.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'run-meta.json'), JSON.stringify(runMeta, null, 1));
  console.log('DONE ' + JSON.stringify(runMeta.widths));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(1); });
