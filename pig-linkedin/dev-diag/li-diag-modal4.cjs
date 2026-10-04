#!/usr/bin/env node
const PROFILES = [
  "https://www.linkedin.com/in/nathan-holly-smith-010a76177/",
  "https://www.linkedin.com/in/jake-allee-0a151342/",
  "https://www.linkedin.com/in/isiah-rodriguez-359201219/",
  "https://www.linkedin.com/in/tt-hvac-a1577914b/",
];
// li-diag-modal3.cjs: READ-ONLY survey of More-menu contents across profiles.
// For each profile: open, click More, dump the menu's text. NEVER clicks
// Connect or Send. argv[2] = JSON array of profile urls, argv[3] = out path.
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BLOCK_RE = /checkpoint|verify your identity|unusual activity|temporarily restricted|captcha|account restricted/i;
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9224', { timeout: 15000 });
  const ctx = (browser.contexts().find(c => c.pages().length) || browser.contexts()[0]);
  const page = await ctx.newPage();
  const profiles = PROFILES;
  const out = { surveyed: [] };
  try {
    for (const url of profiles) {
      const rec = { url };
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(5000);
        const pre = await page.evaluate(() => document.body.innerText.slice(0, 2000));
        const bm = pre.match(BLOCK_RE);
        if (bm) { rec.signals = ['BLOCKED: ' + bm[0]]; out.surveyed.push(rec); continue; }
        // Direct connect button present?
        rec.directConnect = await page.evaluate(() => {
          const vis = b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
          return Array.from(document.querySelectorAll('button')).some(b => vis(b) &&
            (/invite .* to connect/i.test(b.getAttribute('aria-label') || '') ||
             /^connect$/i.test((b.innerText || '').trim())));
        });
        const moreOpened = await page.evaluate(() => {
          const vis = b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
          const more = Array.from(document.querySelectorAll('button'))
            .find(b => vis(b) && /^more$/i.test((b.getAttribute('aria-label') || '').trim()));
          if (!more) return false;
          more.scrollIntoView({ block: 'center' });
          more.click();
          return true;
        });
        rec.moreOpened = moreOpened;
        await sleep(2500);
        rec.menuText = await page.evaluate(() => {
          const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
          const menu = document.querySelector('[role="menu"]');
          if (menu) return 'role=menu: ' + (menu.innerText || '').trim().slice(0, 400).replace(/\n/g, ' | ');
          // Fallback: find any freshly-visible dropdown near the More button.
          const cands = Array.from(document.querySelectorAll('div')).filter(d => {
            if (!vis(d)) return false;
            const t = (d.innerText || '').trim();
            return t.length > 0 && t.length < 500 && /connect|message|follow|save|report|block/i.test(t);
          });
          return 'no-role-menu; cands=' + cands.length + (cands[0] ? ': ' + cands[0].innerText.trim().slice(0, 300).replace(/\n/g, ' | ') : '');
        });
        await page.keyboard.press('Escape');
        await sleep(1000);
      } catch (e) { rec.error = String(e.message || e).slice(0, 120); }
      out.surveyed.push(rec);
    }
  } finally { try { await page.close(); } catch (e) {} }
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.surveyed.map(s => ({ url: s.url.split('/in/')[1], direct: !!s.directConnect, menu: (s.menuText || '').slice(0, 120) }))));
})();
