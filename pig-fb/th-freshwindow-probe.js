#!/usr/bin/env node
// th-freshwindow-probe.js -- READ-ONLY. Tests Nolan's hypothesis that a fresh
// tab/window in the SAME persistent ig-profile Chrome might load threads.com
// differently than the poisoned tabs. Navigates only; never clicks any
// engagement control, never clears any storage, never logs in.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
(async () => {
  const jobPath = process.argv[2];
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const out = { ok: true, hypothesis: 'fresh_tab_same_profile', tests: [] };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, note: 'cdp_unavailable' })); process.exit(2); }
  const ctx0 = browser.contexts()[0];
  // Evidence 0: current tabs in the persistent profile (any parked threads.com error page?)
  const tabs = [];
  for (const p of ctx0.pages()) {
    try { tabs.push({ url: p.url().slice(0, 120), title: (await p.title()).slice(0, 60) }); }
    catch (_) { tabs.push({ url: '(unreadable)' }); }
  }
  out.current_tabs = tabs;
  // Test A: fresh tab, first attempt at threads.com
  for (const label of ['A_fresh_tab_attempt1', 'B_fresh_tab_attempt2']) {
    const t = { label, url: 'https://www.threads.com/', loaded: false, final_url: '', title: '', err: '' };
    let page;
    try {
      page = await ctx0.newPage();
      await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(4000);
      t.loaded = true;
      t.final_url = page.url().slice(0, 120);
      t.title = (await page.title()).slice(0, 80);
    } catch (e) { t.err = String(e.message || e).slice(0, 250); }
    try { if (page) await page.close(); } catch (_) {}
    out.tests.push(t);
    await sleep(2000);
  }
  // Test C: control — is the profile still authenticated on instagram.com?
  const c = { label: 'C_instagram_control', url: 'https://www.instagram.com/', loaded: false, final_url: '', title: '', err: '' };
  let cp;
  try {
    cp = await ctx0.newPage();
    await cp.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(4000);
    c.loaded = true;
    c.final_url = cp.url().slice(0, 120);
    c.title = (await cp.title()).slice(0, 80);
  } catch (e) { c.err = String(e.message || e).slice(0, 250); }
  try { if (cp) await cp.close(); } catch (_) {}
  out.tests.push(c);
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
