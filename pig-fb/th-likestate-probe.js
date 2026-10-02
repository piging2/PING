#!/usr/bin/env node
// th-likestate-probe.js -- READ-ONLY: is @nolanpigi's like present on each target post?
// For each {handle, post_id}: loads the profile page, finds the post card via
// the permalink href, dumps its Like button count + svg markup, and compares
// against sibling cards. Zero clicks.
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
    const r = { handle: it.handle, post_id: it.post_id };
    try {
      await page.goto('https://www.threads.com/' + it.handle, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(6000);
      for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollBy(0, 1500)); await sleep(2500); }
      Object.assign(r, await page.evaluate((pid) => {
        const link = Array.from(document.querySelectorAll('a[href]'))
          .find(a => (a.getAttribute('href') || '').includes('/post/' + pid));
        if (!link) return { card_found: false };
        const btns = Array.from(document.querySelectorAll('div[role="button"]')).filter(d => {
          const t = d.querySelector('svg title');
          const rc = d.getBoundingClientRect();
          return t && t.textContent.trim() === 'Like' && rc.width > 0 && rc.height > 0;
        });
        const info = (btn) => {
          const svg = btn.querySelector('svg');
          return { count: (btn.innerText || '').trim().slice(0, 12),
                   svg: svg ? svg.outerHTML.slice(0, 900) : '' };
        };
        let target = null;
        const sibSvgs = [];
        for (const btn of btns) {
          let c = btn, inCard = false;
          for (let i = 0; i < 14 && c && c !== document.body; i++) {
            if (c.contains(link)) { inCard = true; break; }
            c = c.parentElement;
          }
          if (inCard && !target) target = btn;
          else if (!inCard && sibSvgs.length < 3) sibSvgs.push(info(btn).svg);
        }
        const t = target ? info(target) : null;
        return { card_found: true, like_found: !!target, count: t && t.count,
                 svg_matches_sibling: t ? sibSvgs.some(s => s === t.svg) : null,
                 target_svg_head: t ? t.svg.slice(0, 400) : null };
      }, it.post_id));
    } catch (e) { r.err = String(e.message || e).slice(0, 200); }
    out.items.push(r);
    await sleep(3000);
  }
  try { await page.close(); } catch (_) {}
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out).slice(0, 2500));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
