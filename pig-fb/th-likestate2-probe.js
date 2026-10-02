#!/usr/bin/env node
// th-likestate2-probe.js -- READ-ONLY: like-button state for each target post.
// For each {url, code}: loads the permalink (may soft-redirect to /), finds the
// post card via the a[href*="/post/<code>"] anchor, reports the Like/Unlike
// control's svg title + count. Zero clicks, never logs in.
// Usage: node th-likestate2-probe.js <job.json>
// job.json: { "items": [{"url": "...", "code": "DdczcHgARMq"}], "resultFile": "..." }
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
    const r = { url: it.url, code: it.code, card_found: false };
    try {
      await page.goto(it.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(7000);
      Object.assign(r, await page.evaluate((code) => {
        const link = Array.from(document.querySelectorAll('a[href]'))
          .find(a => (a.getAttribute('href') || '').includes('/post/' + code));
        if (!link) return { card_found: false, note: 'permalink anchor not found' };
        // climb from the anchor to a container holding the action bar
        let card = link;
        for (let i = 0; i < 14 && card && card !== document.body; i++) {
          const hasLike = Array.from(card.querySelectorAll('div[role="button"]'))
            .some(d => { const t = d.querySelector('svg title'); return t && /^(Like|Unlike)$/.test(t.textContent.trim()); });
          if (hasLike) break;
          card = card.parentElement;
        }
        const btn = Array.from(card.querySelectorAll('div[role="button"]'))
          .find(d => { const t = d.querySelector('svg title'); const rc = d.getBoundingClientRect();
            return t && /^(Like|Unlike)$/.test(t.textContent.trim()) && rc.width > 0 && rc.height > 0; });
        if (!btn) return { card_found: true, note: 'anchor found but no Like/Unlike control in card' };
        const t = btn.querySelector('svg title');
        return { card_found: true, like_title: t.textContent.trim(),
                 like_count: (btn.innerText || '').trim().slice(0, 12) };
      }, it.code));
    } catch (e) { r.err = String(e.message || e).slice(0, 150); }
    out.items.push(r);
    await sleep(3000);
  }
  try { await page.close(); } catch (_) {}
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
