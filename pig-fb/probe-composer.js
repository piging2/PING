#!/usr/bin/env node
// probe-composer.js -- Dump candidate create-post UI elements on the PING Social page.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.goto('https://www.facebook.com/profile.php?id=61594275542163', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const found = await page.evaluate(() => {
    const out = [];
    const els = document.querySelectorAll('a, [role="button"], span');
    const re = /what's on your mind|create a post|create post/i;
    els.forEach(el => {
      const t = (el.innerText || '').trim();
      if (re.test(t) && t.length < 80 && !out.some(o => o.text === t)) {
        const r = el.getBoundingClientRect();
        out.push({ text: t, tag: el.tagName, role: el.getAttribute('role'), y: Math.round(r.y) });
      }
    });
    return out.slice(0, 20);
  });
  console.log(JSON.stringify(found, null, 1));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
