#!/usr/bin/env node
// th-diag-probe.js -- READ-ONLY diagnostic: why did marker matching fail?
// Navigates to a permalink twice on one reused page (like th-engage.js does),
// then dumps: final_url, marker presence, Like button count, and the ancestor
// chain innerText probe for the first Like button. Zero clicks.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = { ok: true, navs: [] };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, note: 'cdp_unavailable' })); process.exit(3); }
  const page = await browser.contexts()[0].newPage();
  for (const nav of job.navs) {
    const t = { url: nav.url, marker: nav.marker };
    try {
      await page.goto(nav.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(7000);
      t.final_url = page.url();
      Object.assign(t, await page.evaluate((marker) => {
        const text = (document.body.innerText || '');
        const btns = Array.from(document.querySelectorAll('div[role="button"]')).filter(d => {
          const s = d.querySelector('svg[aria-label="Like"]');
          const r = d.getBoundingClientRect();
          return s && r.width > 0 && r.height > 0;
        });
        const first = btns[0];
        const chain = [];
        if (first) {
          let c = first;
          for (let i = 0; i < 20 && c && c !== document.body; i++) {
            const it = (c.innerText || '');
            chain.push({ level: i, tag: c.tagName, len: it.length, hasMarker: it.includes(marker) });
            c = c.parentElement;
          }
        }
        return {
          body_len: text.length, marker_in_body: text.includes(marker),
          like_btn_count: btns.length,
          first_btn_text: first ? (first.innerText || '').slice(0, 20) : null,
          chain,
        };
      }, nav.marker));
    } catch (e) { t.err = String(e.message || e).slice(0, 200); }
    out.navs.push(t);
    await sleep(3000);
  }
  try { await page.close(); } catch (_) {}
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out).slice(0, 3500));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
