#!/usr/bin/env node
// visual-capture.js -- FYD factory visual QA capture driver.
// Runs ON THE PIG under Windows node. Launches a DEDICATED headless Chrome
// (own user-data-dir, own CDP port 9334) so the production :9223 browser is
// never touched. Captures full-page screenshots + DOM metrics for the given
// site slug at desktop widths. Read-only against the dev server.
//
// Usage: node visual-capture.js <slug> <outdir>
// Env: PWCORE = path to playwright-core module dir.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PWCORE = process.env.PWCORE ||
  'C:\\Users\\nolan\\.local\\share\\pigi\\fb-engage\\node_modules\\playwright-core';
const { chromium } = require(PWCORE);

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9334;
const PROFILE_DIR = 'C:\\Users\\nolan\\transfer\\visual\\chrome-profile';
const BASE = 'http://localhost:3100/sites/';

const slug = process.argv[2] || 'happy-place';
const outdir = process.argv[3] || 'C:\\Users\\nolan\\transfer\\visual';
const WIDTHS = [1440, 1280];
const VH = 900;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const METRICS_SRC = `(() => {
  const secs = Array.from(document.querySelectorAll('main section, main > div > section, [data-section]'));
  const seen = new Set();
  const sections = [];
  for (const s of secs) {
    if (seen.has(s)) continue;
    seen.add(s);
    const r = s.getBoundingClientRect();
    const h = s.querySelector('h1,h2,h3');
    sections.push({
      tag: s.tagName,
      comp: s.getAttribute('data-component') || s.getAttribute('data-section') || null,
      cls: (s.className || '').toString().slice(0, 120),
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
      heading: h ? h.textContent.trim().slice(0, 80) : null,
      textLen: (s.innerText || '').length,
      imgs: s.querySelectorAll('img').length,
    });
  }
  const all = Array.from(document.querySelectorAll('*'));
  let gradients = 0, cards = 0;
  for (const el of all) {
    const bg = getComputedStyle(el).backgroundImage || '';
    if (bg.indexOf('gradient') >= 0) gradients++;
  }
  cards = document.querySelectorAll('[data-card], .card').length;
  const h1s = Array.from(document.querySelectorAll('h1')).map(h => ({
    text: h.textContent.trim().slice(0, 80),
    size: getComputedStyle(h).fontSize,
    top: Math.round(h.getBoundingClientRect().top + window.scrollY),
  }));
  const ctas = Array.from(document.querySelectorAll('a,button')).filter(a =>
    /book|call|quote|trial|demo|start|contact|schedule/i.test(a.textContent || '')).map(a => ({
    text: (a.textContent || '').trim().slice(0, 40),
    top: Math.round(a.getBoundingClientRect().top + window.scrollY),
  }));
  return {
    url: location.href, title: document.title,
    innerW: window.innerWidth, scrollW: document.documentElement.scrollWidth,
    docH: document.documentElement.scrollHeight,
    bodyFont: getComputedStyle(document.body).fontFamily,
    h1s, sectionCount: sections.length, sections: sections.slice(0, 40),
    gradients, imgs: document.querySelectorAll('img').length,
    ctas: ctas.slice(0, 12),
  };
})()`;

async function waitForCDP(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const b = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`, { timeout: 2000 });
      return b;
    } catch (e) { await sleep(500); }
  }
  throw new Error('CDP never came up on :' + CDP_PORT);
}

(async () => {
  fs.mkdirSync(outdir, { recursive: true });
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore', detached: false });
  console.log('chrome pid ' + chrome.pid);
  let browser = null;
  try {
    browser = await waitForCDP();
    for (const w of WIDTHS) {
      const tag = `${slug}-${w}`;
      const page = await browser.newPage({ viewport: { width: w, height: VH } });
      await page.goto(BASE + slug, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(3500);
      const shot = path.join(outdir, `${tag}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      const metrics = await page.evaluate(METRICS_SRC);
      fs.writeFileSync(path.join(outdir, `${tag}.metrics.json`), JSON.stringify(metrics, null, 1));
      console.log(`OK ${tag} shot=${fs.statSync(shot).size}b sections=${metrics.sectionCount}`);
      await page.close();
    }
    console.log('DONE');
  } finally {
    try { if (browser) await browser.close(); } catch (e) {}
    try { chrome.kill(); } catch (e) {}
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + String((e && e.message) || e).slice(0, 300)); process.exit(1); });
