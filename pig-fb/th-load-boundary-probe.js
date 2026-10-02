#!/usr/bin/env node
// th-load-boundary-probe.js -- READ-ONLY. Loads instagram.com and threads.com
// in the Pig ig-profile Chrome and reports which renders. Navigates only;
// never clicks any engagement control. Determines whether the threads.com
// ERR_HTTP_RESPONSE_CODE_FAILURE is browser-wide or Threads-specific.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
(async () => {
  const jobPath = process.argv[2];
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const out = { ok: true, tests: [] };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { out.ok = false; out.note = 'cdp_unavailable'; done(); return; }
  const ctx0 = browser.contexts()[0];
  const incog = await browser.newContext();
  const incogPage = await incog.newPage();
  let incogResult = { loaded: false, title: '', err: '' };
  try {
    await incogPage.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(3000);
    incogResult.loaded = true; incogResult.title = (await incogPage.title()).slice(0, 80);
  } catch (e) { incogResult.err = String(e.message || e).slice(0, 200); }
  try { await incog.close(); } catch (_) {}
  out.incognito_threads = incogResult;
  const page = await ctx0.newPage();
  for (const url of (job.urls || ['https://www.instagram.com/', 'https://www.threads.com/'])) {
    const t = { url, loaded: false, title: '', err: '' };
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(3000);
      t.loaded = true; t.title = (await page.title()).slice(0, 80);
    } catch (e) { t.err = String(e.message || e).slice(0, 200); }
    out.tests.push(t);
  }
  function done() { fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out)); }
  try { await page.close(); } catch (_) {}
  done();
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
