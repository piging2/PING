#!/usr/bin/env node
// th-replydiag-probe.js -- diagnostic: what happens when Reply is clicked?
// Clicks the Reply button of the marker-matched post ONCE, then dumps new DOM
// (dialogs, composers, navigation). Types nothing, publishes nothing.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = { ok: true };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, note: 'cdp_unavailable' })); process.exit(3); }
  const page = await browser.contexts()[0].newPage();
  try {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    const before = await page.evaluate(() => ({
      url: location.href,
      dialogs: document.querySelectorAll('[role="dialog"]').length,
      textboxes: document.querySelectorAll('[contenteditable="true"], [role="textbox"]').length,
    }));
    out.before = before;
    const clicked = await page.evaluate((marker) => {
      const btns = Array.from(document.querySelectorAll('div[role="button"]')).filter(d => {
        const t = d.querySelector('svg title');
        const rc = d.getBoundingClientRect();
        return t && t.textContent.trim() === 'Reply' && rc.width > 0 && rc.height > 0;
      });
      for (const btn of btns) {
        let c = btn;
        for (let i = 0; i < 12 && c && c !== document.body; i++) {
          if ((c.innerText || '').includes(marker)) {
            btn.scrollIntoView({ block: 'center' });
            const r = btn.getBoundingClientRect();
            return { found: true, x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }
          c = c.parentElement;
        }
      }
      return { found: false };
    }, job.marker);
    out.clicked = clicked;
    if (clicked.found) {
      await page.mouse.click(clicked.x, clicked.y);
      await sleep(4000);
    }
    out.after = await page.evaluate(() => {
      const info = {
        url: location.href,
        dialogs: document.querySelectorAll('[role="dialog"]').length,
        textboxes: [],
        buttons: [],
      };
      for (const d of document.querySelectorAll('[role="dialog"]')) {
        info.dialog_text = (d.innerText || '').replace(/\s+/g, ' ').slice(0, 300);
        info.dialog_html_head = d.outerHTML.slice(0, 800);
      }
      for (const b of document.querySelectorAll('[contenteditable="true"], [role="textbox"]')) {
        const r = b.getBoundingClientRect();
        info.textboxes.push({ tag: b.tagName, role: b.getAttribute('role'), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) });
      }
      // Any fixed/absolute overlay added?
      const overlays = Array.from(document.querySelectorAll('div')).filter(e => {
        const s = getComputedStyle(e); const r = e.getBoundingClientRect();
        return (s.position === 'fixed' || s.position === 'absolute') && r.width > 300 && r.height > 200;
      }).length;
      info.overlay_divs = overlays;
      info.body_head = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400);
      return info;
    });
  } catch (e) { out.err = String(e.message || e).slice(0, 250); }
  try { await page.close(); } catch (_) {}
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out).slice(0, 3500));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
