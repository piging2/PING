#!/usr/bin/env node
// li-diag-modal5.cjs: READ-ONLY invite-modal capture across profiles.
// For each profile: if Connect is offered (direct or More menu), click it,
// dump ALL div[role=dialog], Escape out. NEVER clicks Send.
const PROFILES = [
  "https://www.linkedin.com/in/clearly-mechanical/",
  "https://www.linkedin.com/in/joshua-thomas-067a9063/",
  "https://www.linkedin.com/in/don-plummer-ab602858/",
  "https://www.linkedin.com/in/oceanbluehvac/",
  "https://www.linkedin.com/in/jeff-miller-199753380/",
  "https://www.linkedin.com/in/matt-fowler-1973ab161/",
  "https://www.linkedin.com/in/william-thuma-318b0320a/",
  "https://www.linkedin.com/in/william-clay-33499017/",
  "https://www.linkedin.com/in/southardsolar/",
  "https://www.linkedin.com/in/david-congour-677b9b1b/",
  "https://www.linkedin.com/in/ian-skor-pe-97360940/",
  "https://www.linkedin.com/in/garrett-stevens-cco/",
  "https://www.linkedin.com/in/aaron-schlesinger-651a16b5/",
  "https://www.linkedin.com/in/donovan-wygant-887786201/",
];
const { chromium } = require('playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BLOCK_RE = /checkpoint|verify your identity|unusual activity|temporarily restricted|captcha|account restricted/i;
const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9224', { timeout: 15000 });
  const ctx = (browser.contexts().find(c => c.pages().length) || browser.contexts()[0]);
  const page = await ctx.newPage();
  const out = { surveyed: [] };
  try {
    for (const url of PROFILES) {
      const rec = { url };
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(5000);
        const pre = await page.evaluate(() => document.body.innerText.slice(0, 2000));
        const bm = pre.match(BLOCK_RE);
        if (bm) { rec.signals = ['BLOCKED: ' + bm[0]]; out.surveyed.push(rec); continue; }
        // 1. Direct connect button?
        const directClicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const t = btns.find(b => { const r = b.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
            return /invite .* to connect/i.test(b.getAttribute('aria-label') || '') || /^connect$/i.test((b.innerText || '').trim()); });
          if (!t) return false;
          t.scrollIntoView({ block: 'center' }); t.click(); return true;
        });
        rec.directClicked = directClicked;
        let modalOpened = false;
        if (!directClicked) {
          // 2. More menu -> Connect (scoped to menu).
          const res = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const more = btns.find(b => { const r = b.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
              return /^more$/i.test((b.getAttribute('aria-label') || '').trim()); });
            if (!more) return 'no-more';
            more.scrollIntoView({ block: 'center' }); more.click();
            return 'opened';
          });
          rec.moreOpened = res;
          await sleep(2500);
          if (res === 'opened') {
            const cres = await page.evaluate(() => {
              const menu = document.querySelector('[role="menu"]');
              if (!menu) return 'no-menu';
              const els = Array.from(menu.querySelectorAll('button, [role="menuitem"], [role="menuitemradio"], div, span'));
              const item = els.find(e => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
                const t = ((e.getAttribute('aria-label') || '') + ' ' + (e.innerText || '')).trim();
                if (!/^connect$/i.test(t) && !/invite .* to connect/i.test(t)) return false;
                if (/disconnect/i.test(t)) return false; return true; });
              if (!item) return 'no-item';
              item.scrollIntoView({ block: 'center' }); item.click();
              return 'clicked';
            });
            rec.connectClicked = cres;
          }
        }
        await sleep(3500);
        // Dump ALL dialogs.
        rec.dialogs = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('div[role="dialog"]')).map(dlg => ({
            testid: dlg.getAttribute('data-testid') || '',
            textHead: (dlg.innerText || '').trim().slice(0, 250).replace(/\n/g, ' | '),
            buttons: Array.from(dlg.querySelectorAll('button')).map(b => ({
              text: (b.innerText || '').trim().slice(0, 50),
              aria: (b.getAttribute('aria-label') || '').slice(0, 80),
              disabled: !!b.disabled,
              html: b.outerHTML.slice(0, 300),
            })),
          }));
        });
        await page.keyboard.press('Escape');
        await sleep(800);
        await page.keyboard.press('Escape');
        await sleep(800);
      } catch (e) { rec.error = String(e.message || e).slice(0, 120); try { await page.keyboard.press('Escape'); } catch (e2) {} }
      out.surveyed.push(rec);
    }
  } finally { try { await page.close(); } catch (e) {} }
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
  console.log('done profiles=' + out.surveyed.length);
})();
