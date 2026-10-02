#!/usr/bin/env node
// th-gate-probe.js -- READ-ONLY: census of candidate login-gate markers on threads.com.
// Never clicks, likes, comments, or logs in. Navigation + DOM reads only.
// Usage: node th-gate-probe.js <resultFile>
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const resultFile = process.argv[2];
  let browser;
  try { browser = await chromium.connectOverCDP('http://localhost:9226', { timeout: 20000 }); }
  catch (e) {
    const out = { ok: false, note: 'CDP attach failed: ' + String(e.message || e).slice(0, 120) };
    if (resultFile) fs.writeFileSync(resultFile, JSON.stringify(out));
    console.log('RESULT cdp_unavailable');
    process.exit(3);
  }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    const m = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const txt = e => (e.innerText || '').trim();
      return {
        homeAriaLink: !!document.querySelector('a[aria-label="Home"]'),
        homeAriaAny: !!document.querySelector('[aria-label="Home"]'),
        loginBtnStrict: btns.some(e => /^log in$/i.test(txt(e)) && txt(e).length < 20),
        loginPromptLoose: btns.filter(e => /log in/i.test(txt(e)) && txt(e).length < 45).length,
        profileLinks: Array.from(document.querySelectorAll('a[href]'))
          .filter(a => /^\/@[a-z0-9._]+\/?$/i.test(a.getAttribute('href') || '')).length,
        createBtn: btns.some(e => /^create$/i.test(txt(e)) || /create/i.test(e.getAttribute('aria-label') || '')),
        ownHandle: (() => {
          for (const a of document.querySelectorAll('a[href]')) {
            const h = a.getAttribute('href') || '';
            if (!/^\/@[a-z0-9._]+\/?$/i.test(h)) continue;
            const img = a.querySelector('img');
            if (img && /profile (picture|photo)/i.test(img.getAttribute('alt') || '')) return h.replace(/\//g, '');
          }
          return null;
        })(),
        bodyHead: (document.body.innerText || '').slice(0, 120),
      };
    });
    const out = { ok: true, markers: m };
    if (resultFile) fs.writeFileSync(resultFile, JSON.stringify(out, null, 2));
    console.log('RESULT ok ' + JSON.stringify(m));
    await page.close().catch(() => {});
    process.exit(0);
  } catch (e) {
    const out = { ok: false, note: 'probe error: ' + String(e.message || e).slice(0, 150) };
    try { if (resultFile) fs.writeFileSync(resultFile, JSON.stringify(out)); } catch {}
    console.log('RESULT probe_error');
    process.exit(5);
  }
})();
