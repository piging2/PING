#!/usr/bin/env node
// check-page-generic.js -- READ-ONLY Page identity + Message-button check.
// Usage: node check-page-generic.js <page-url>
// NEVER sends messages or clicks anything.
const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGE_URL = process.argv[2];
if (!PAGE_URL) { console.log(JSON.stringify({ error: 'no url' })); process.exit(1); }

(async () => {
  const out = {};
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    out.info = await page.evaluate(() => {
      const text = document.body.innerText.replace(/\s+/g, ' ').slice(0, 2500);
      const buttons = [];
      document.querySelectorAll('[role="button"]').forEach(el => {
        const t = (el.innerText || '').trim();
        if (t && t.length < 40) buttons.push(t);
      });
      const msgBtn = buttons.some(t => /^(Message|Send message)$/i.test(t));
      return { text, buttons: [...new Set(buttons)].slice(0, 30), hasMessageButton: msgBtn };
    });
    out.url = page.url();
  } catch (e) {
    out.error = String(e.message || e).slice(0, 200);
  } finally {
    await page.close();
  }
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 200)); process.exit(1); });
