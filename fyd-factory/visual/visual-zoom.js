#!/usr/bin/env node
// visual-zoom.js -- zoomed forensics on suspect regions of /sites/happy-place.
// Runs ON THE PIG under Windows node. Arg: outdir.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const PWCORE = process.env.PWCORE ||
  'C:\\Users\\nolan\\.local\\share\\pigi\\fb-engage\\node_modules\\playwright-core';
const { chromium } = require(PWCORE);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9335;
const PROFILE_DIR = 'C:\\Users\\nolan\\transfer\\visual\\chrome-profile2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FORENSICS = `(() => {
  const out = { cards: [], heroPill: null };
  // find the Services section: the h2 whose text is exactly "Services"
  const h2s = Array.from(document.querySelectorAll('h2'));
  const svcH = h2s.find(h => h.textContent.trim() === 'Services');
  if (svcH) {
    const sec = svcH.closest('section') || svcH.parentElement;
    const r = sec.getBoundingClientRect();
    out.servicesRect = { top: Math.round(r.top + scrollY), height: Math.round(r.height) };
    // candidate cards: descendants with border/shadow or grid children
    const kids = Array.from(sec.querySelectorAll('div')).slice(0, 60);
    for (const k of kids) {
      const t = (k.innerText || '').trim();
      if (t.length > 20 && t.length < 600) {
        const kr = k.getBoundingClientRect();
        const cs = getComputedStyle(k);
        out.cards.push({
          text: t.slice(0, 120).replace(/\\n/g, ' | '),
          x: Math.round(kr.x), y: Math.round(kr.top + scrollY),
          w: Math.round(kr.width), h: Math.round(kr.height),
          color: cs.color, bg: cs.backgroundColor,
          display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
          fontSize: cs.fontSize,
        });
        if (out.cards.length >= 12) break;
      }
    }
  }
  // hero eyebrow pill: first pill-like element in hero section
  const heroH1 = Array.from(document.querySelectorAll('h1')).find(h => /Happy Place/.test(h.textContent));
  if (heroH1) {
    const hero = heroH1.closest('section');
    const pills = Array.from(hero.querySelectorAll('*')).filter(e => {
      const cs = getComputedStyle(e);
      return parseFloat(cs.borderRadius) >= 10 && (e.innerText || '').trim().length <= 40 && e.children.length === 0;
    });
    out.heroPill = pills.slice(0, 3).map(p => ({
      text: (p.innerText || '').trim(),
      color: getComputedStyle(p).color,
      bg: getComputedStyle(p).backgroundColor,
      border: getComputedStyle(p).border,
      fontSize: getComputedStyle(p).fontSize,
      w: Math.round(p.getBoundingClientRect().width),
    }));
  }
  return out;
})()`;

async function waitForCDP(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { return await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`, { timeout: 2000 }); }
    catch (e) { await sleep(500); }
  }
  throw new Error('CDP never came up');
}

(async () => {
  const outdir = process.argv[2] || 'C:\\Users\\nolan\\transfer\\visual';
  fs.mkdirSync(outdir, { recursive: true });
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let browser = null;
  try {
    browser = await waitForCDP();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:3100/sites/happy-place', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3500);
    const f = await page.evaluate(FORENSICS);
    fs.writeFileSync(path.join(outdir, 'forensics.json'), JSON.stringify(f, null, 1));
    console.log('servicesRect=' + JSON.stringify(f.servicesRect));
    console.log('cardsFound=' + f.cards.length);
    // zoom clips
    if (f.servicesRect) {
      await page.screenshot({ path: path.join(outdir, 'zoom-services.png'),
        clip: { x: 180, y: Math.max(0, f.servicesRect.top - 60), width: 1080, height: Math.min(900, f.servicesRect.height + 120) } });
    }
    // hero clip: top of page
    await page.screenshot({ path: path.join(outdir, 'zoom-hero.png'),
      clip: { x: 180, y: 125, width: 1080, height: 420 } });
    console.log('DONE');
    await page.close();
  } finally {
    try { if (browser) await browser.close(); } catch (e) {}
    try { chrome.kill(); } catch (e) {}
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 300)); process.exit(1); });
