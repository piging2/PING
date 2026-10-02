#!/usr/bin/env node
// page-probe.js -- list Facebook Pages Nolan manages, via the always-on
// headed Chrome on the Pig (CDP :9223). Read-only. Never closes the browser.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  await page.goto('https://www.facebook.com/pages/?category=your_pages', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(7000);
  const links = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = (a.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      if (/^\/[A-Za-z0-9._-]+\/?(\?|$)/.test(href) && text.length > 1) out.push({ href: 'https://www.facebook.com' + href.split('?')[0], text });
    });
    return out;
  });
  // Dedupe by href, drop nav chrome.
  const seen = new Set(); const pages = [];
  const skip = /^(Home|Watch|Marketplace|Groups|Gaming|Memories|Saved|Feeds|Events|Ads Manager|Meta Business Suite|Settings|Help|Log Out|See more|Pages|Create)$/i;
  for (const l of links) {
    if (seen.has(l.href) || skip.test(l.text)) continue;
    seen.add(l.href); pages.push(l);
  }
  console.log(JSON.stringify(pages.slice(0, 40), null, 1));
  await page.close();
  process.exit(0);
})().catch(e => { console.error('PROBE error ' + String(e.message || e).slice(0, 300)); process.exit(1); });
