#!/usr/bin/env node
// th-likecheck-probe.js -- READ-ONLY: did the like clicks land?
// For each (url, marker): finds the Like button, dumps its count text and full
// button-div outerHTML, plus the same for a sibling post's Like button.
// Zero clicks.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = { ok: true, items: [] };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, note: 'cdp_unavailable' })); process.exit(3); }
  const page = await browser.contexts()[0].newPage();
  for (const it of job.items) {
    const r = { url: it.url, marker: it.marker };
    try {
      await page.goto(it.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(7000);
      Object.assign(r, await page.evaluate((marker) => {
        const btns = Array.from(document.querySelectorAll('div[role="button"]')).filter(d => {
          const t = d.querySelector('svg title');
          const rc = d.getBoundingClientRect();
          return t && t.textContent.trim() === 'Like' && rc.width > 0 && rc.height > 0;
        });
        const info = (btn) => {
          if (!btn) return null;
          const svg = btn.querySelector('svg');
          return { count: (btn.innerText || '').trim().slice(0, 12),
                   divClass: (btn.getAttribute('class') || '').split(' ').slice(-4).join(' '),
                   svgHtml: svg ? svg.outerHTML.slice(0, 1200) : '' };
        };
        let target = null, sibling = null;
        for (const btn of btns) {
          let c = btn, post = null;
          for (let i = 0; i < 12 && c && c !== document.body; i++) {
            if ((c.innerText || '').includes(marker)) { post = c; break; }
            c = c.parentElement;
          }
          if (post && !target) target = btn;
          else if (!post && !sibling) sibling = btn;
        }
        const t = info(target), s = info(sibling);
        return { found: !!target, target: t,
                 sibling: s, svg_differs_from_sibling: t && s ? t.svgHtml !== s.svgHtml : null,
                 class_differs: t && s ? t.divClass !== s.divClass : null };
      }, it.marker));
    } catch (e) { r.err = String(e.message || e).slice(0, 200); }
    out.items.push(r);
    await sleep(3000);
  }
  try { await page.close(); } catch (_) {}
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out).slice(0, 3000));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
