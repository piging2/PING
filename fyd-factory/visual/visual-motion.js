#!/usr/bin/env node
// visual-motion.js -- is the Services card grid gated by entrance motion?
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const PWCORE = 'C:\\Users\\nolan\\.local\\share\\pigi\\fb-engage\\node_modules\\playwright-core';
const { chromium } = require(PWCORE);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9337;
const PROFILE_DIR = 'C:\\Users\\nolan\\transfer\\visual\\chrome-profile4';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROBE = `(() => {
  const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.trim() === 'Services');
  const sec = h2.closest('section');
  const arts = Array.from(sec.querySelectorAll('article'));
  const cs0 = getComputedStyle(arts[0]);
  return {
    n: arts.length,
    opacity: cs0.opacity, transform: cs0.transform, visibility: cs0.visibility,
    animation: cs0.animationName + ' ' + cs0.animationPlayState,
    transition: cs0.transitionProperty,
    bodyClasses: document.body.className,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    ioSupported: 'IntersectionObserver' in window,
  };
})()`;
async function waitForCDP(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { return await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`, { timeout: 2000 }); }
    catch (e) { await sleep(500); }
  }
  throw new Error('no cdp');
}
(async () => {
  const outdir = 'C:\\Users\\nolan\\transfer\\visual';
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`, '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let browser = null;
  try {
    browser = await waitForCDP();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:3100/sites/happy-place', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(3000);
    const before = await page.evaluate(PROBE);
    console.log('BEFORE scroll: ' + JSON.stringify(before));
    // scroll services into view like a real user, wait, viewport screenshot
    await page.evaluate(() => {
      const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.trim() === 'Services');
      h2.scrollIntoView({ block: 'start' });
    });
    await page.waitForTimeout(1800);
    const after = await page.evaluate(PROBE);
    console.log('AFTER scroll: ' + JSON.stringify(after));
    await page.screenshot({ path: path.join(outdir, 'viewport-services-scrolled.png') });
    console.log('DONE');
    await page.close();
  } finally {
    try { if (browser) await browser.close(); } catch (e) {}
    try { chrome.kill(); } catch (e) {}
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 200)); process.exit(1); });
