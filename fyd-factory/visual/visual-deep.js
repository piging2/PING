#!/usr/bin/env node
// visual-deep.js -- descendant inventory of the Services section.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const PWCORE = 'C:\\Users\\nolan\\.local\\share\\pigi\\fb-engage\\node_modules\\playwright-core';
const { chromium } = require(PWCORE);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9336;
const PROFILE_DIR = 'C:\\Users\\nolan\\transfer\\visual\\chrome-profile3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SRC = `(() => {
  const h2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.trim() === 'Services');
  const sec = h2.closest('section');
  const rows = [];
  const walker = document.createTreeWalker(sec, NodeFilter.SHOW_ELEMENT);
  let n = 0;
  while (walker.nextNode() && n < 120) {
    n++;
    const el = walker.currentNode;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const own = Array.from(el.childNodes).filter(c => c.nodeType === 3).map(c => c.textContent).join('').trim();
    rows.push({
      tag: el.tagName, cls: (el.className || '').toString().slice(0, 100),
      ownText: own.slice(0, 90), x: Math.round(r.x), y: Math.round(r.top + scrollY),
      w: Math.round(r.width), h: Math.round(r.height),
      color: cs.color, bg: cs.backgroundColor, display: cs.display,
      vis: cs.visibility, op: cs.opacity, fs: cs.fontSize,
    });
  }
  return { sectionHTML: sec.innerHTML.slice(0, 3000), rows };
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
    const inv = await page.evaluate(SRC);
    fs.writeFileSync(path.join(outdir, 'services-inventory.json'), JSON.stringify(inv, null, 1).slice(0, 60000));
    console.log('DONE rows+html written');
    await page.close();
  } finally {
    try { if (browser) await browser.close(); } catch (e) {}
    try { chrome.kill(); } catch (e) {}
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 200)); process.exit(1); });
