#!/usr/bin/env node
// th-dom-probe.js -- READ-ONLY Threads DOM grounding probe.
// Navigates to ONE permalink, dumps the first post container's markup and all
// candidate control elements. Never clicks anything, never logs in.
// Usage: node th-dom-probe.js <job.json>
// job.json: { "url": "...", "marker": "distinctive post substring", "resultFile": "..." }
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = { ok: true, url: job.url, loaded: false };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, note: 'cdp_unavailable' })); process.exit(3); }
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  try {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    out.loaded = true;
    out.final_url = page.url();
    const r = await page.evaluate((marker) => {
      const body = document.body.innerHTML || '';
      const text = (document.body.innerText || '').replace(/\s+/g, ' ');
      const idx = text.indexOf(marker);
      // Find element containing the marker text (deepest)
      let el = null;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let deepest = null, best = -1;
      while (walker.nextNode()) {
        const n = walker.currentNode;
        const t = (n.innerText || '');
        if (t.includes(marker) && t.length < 4000 && t.length > best) { best = t.length; deepest = n; }
      }
      let postHtml = '', postPath = '';
      if (deepest) {
        // climb to a container with action-bar-ish children
        let c = deepest, path = [];
        for (let i = 0; i < 8 && c && c !== document.body; i++) {
          path.push(c.tagName.toLowerCase() + (c.getAttribute('class') ? '.' + c.getAttribute('class').split(' ').slice(0,2).join('.') : ''));
          c = c.parentElement;
        }
        postPath = path.join(' < ');
        postHtml = deepest.outerHTML.slice(0, 6000);
      }
      // All visible clickable-ish elements in the first 1200px with any label text
      const ctrls = [];
      for (const e of document.querySelectorAll('button, [role="button"], a[href*="/post/"]')) {
        const rect = e.getBoundingClientRect();
        if (rect.width === 0 || rect.top > 1400) continue;
        const inner = (e.innerText || '').trim().slice(0, 30);
        const aria = e.getAttribute('aria-label') || '';
        const svgTitle = (e.querySelector('svg title') || {}).textContent || '';
        if (/like|reply|repost|share/i.test(aria + ' ' + svgTitle + ' ' + inner)) {
          ctrls.push({
            tag: e.tagName.toLowerCase(), role: e.getAttribute('role'),
            aria, svgTitle, inner, pressed: e.getAttribute('aria-pressed'),
            testid: e.getAttribute('data-testid'), top: Math.round(rect.top),
            html: e.outerHTML.slice(0, 500),
          });
          if (ctrls.length >= 12) break;
        }
      }
      return {
        body_len: body.length, marker_found: idx >= 0, marker_idx: idx,
        post_path: postPath, post_html: postHtml, ctrls,
      };
    }, job.marker);
    Object.assign(out, r);
  } catch (e) { out.err = String(e.message || e).slice(0, 250); }
  try { await page.close(); } catch (_) {}
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out).slice(0, 4000));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
