#!/usr/bin/env node
// ping-margin-shots.js -- Screenshot PING :3100 root page at required widths +
// dump margin-object geometry. Runs on the Pig (Windows portable node).
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = 'C:/Users/nolan/.local/share/pigi/margin-shots';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [1440, 430, 390, 375, 360, 320];

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 25000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const report = [];
  for (const w of WIDTHS) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w, height: 900 });
    let status = 'unknown';
    try {
      const resp = await page.goto('http://172.21.65.209:3100/', { waitUntil: 'networkidle', timeout: 45000 });
      status = resp ? resp.status() : 'no-response';
    } catch (e) { status = 'goto-failed:' + String(e.message || e).slice(0, 80); }
    await sleep(3500);
    const shot = path.join(OUT, `root-${w}.png`);
    await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
    let diag = { diagError: 'evaluate-failed' };
    try {
      diag = await page.evaluate(() => {
        const vw = window.innerWidth;
        const overflow = document.documentElement.scrollWidth - vw;
        const hosts = Array.from(document.querySelectorAll('[data-ping-host]')).map(el => {
          const r = el.getBoundingClientRect();
          return {
            slot: el.getAttribute('data-ping-slot'),
            inlineStrip: el.hasAttribute('data-ping-inline-strip'),
            x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height),
          };
        });
        return { vw, overflow, hostCount: hosts.length, hosts,
                 inlineStrip: !!document.querySelector('[data-ping-inline-strip]') };
      });
    } catch (e) {}
    const row = { width: w, status, shot, ...diag };
    report.push(row);
    console.log(JSON.stringify(row));
    await page.close().catch(() => {});
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(1); });
