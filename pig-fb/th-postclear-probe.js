#!/usr/bin/env node
// th-postclear-probe.js -- READ-ONLY. Verifies whether Nolan's manual cache
// clear for threads.com changed anything in the persistent ig-profile Chrome.
// Fresh tab, navigate only, extract page text markers only; never clicks,
// never mutates storage, never logs in.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
(async () => {
  const jobPath = process.argv[2];
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const out = { ok: true, probe: 'post_cache_clear', tests: [] };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, note: 'cdp_unavailable' })); process.exit(2); }
  const ctx0 = browser.contexts()[0];
  const t = { label: 'threads_post_clear', url: 'https://www.threads.com/', loaded: false, final_url: '', title: '', err: '', auth: null };
  let page;
  try {
    page = await ctx0.newPage();
    await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(6000);
    t.loaded = true;
    t.final_url = page.url().slice(0, 160);
    t.title = (await page.title()).slice(0, 80);
    // Auth state from rendered text only. Never clicks anything.
    const text = await page.evaluate(() => {
      const el = document.querySelector('main') || document.body;
      return (el ? el.innerText : '').replace(/\s+/g, ' ').slice(0, 400);
    }).catch(() => '');
    t.body_snippet = text.slice(0, 300);
    const lower = text.toLowerCase();
    t.auth = {
      snippet: text.slice(0, 200),
      has_login_cta: /log in( to threads)?/.test(text.toLowerCase()) && /create account|sign up/.test(lower),
      has_logged_out_wall: /log in to see|log in to threads|join threads/.test(lower),
      feed_markers: ['for you', 'following', "what's new", 'what is new'].filter(m => lower.includes(m)),
    };
  } catch (e) { t.err = String(e.message || e).slice(0, 250); }
  try { if (page) await page.close(); } catch (_) {}
  out.tests.push(t);
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
