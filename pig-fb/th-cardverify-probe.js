#!/usr/bin/env node
// th-cardverify-probe.js -- READ-ONLY: verify the EXACT post card on a profile.
// Finds the permalink link, climbs ONLY to the nearest post card (bounded,
// stopping at the first ancestor that contains both the link and a Like
// button), dumps the card's text head + the Like button svg. Zero clicks.
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
        if (!link) return { link_found: false };
        // Climb from the link to the smallest ancestor that holds a Like button.
        let card = link;
        for (let i = 0; i < 14 && card && card !== document.body; i++) {
          card = card.parentElement;
          const like = card.querySelector('div[role="button"]');
          const t = like && like.querySelector('svg title');
          if (like && t && t.textContent.trim() === 'Like') break;
        }
        if (!card || card === document.body) return { link_found: true, card_found: false };
        const likeBtn = Array.from(card.querySelectorAll('div[role="button"]'))
          .find(d => { const t = d.querySelector('svg title'); return t && t.textContent.trim() === 'Like'; });
        const svg = likeBtn && likeBtn.querySelector('svg');
        const title = svg && svg.querySelector('title');
        return {
          link_found: true, card_found: true,
          card_text_head: (card.innerText || '').replace(/\s+/g, ' ').slice(0, 220),
          like_count: likeBtn ? (likeBtn.innerText || '').trim().slice(0, 12) : null,
          svg_title_text: title ? title.textContent : null,
          svg_outer: svg ? svg.outerHTML.slice(0, 1500) : null,
        };
      }, it.post_id));
    } catch (e) { r.err = String(e.message || e).slice(0, 200); }
    out.items.push(r);
    await sleep(3000);
  }
  try { await page.close(); } catch (_) {}
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out).slice(0, 4000));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
