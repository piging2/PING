#!/usr/bin/env node
// th-cookiedelete-diag.js -- Precisely deletes threads.com cookies one by one
// via Network.deleteCookies (clearDataForOrigin proved a no-op for cookies),
// verifies zero remain, then navigates cookie-less with header capture.
// Scope: ONLY cookies whose domain ends with threads.com. instagram.com and
// all other origins untouched. No login attempts, no clicks.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';

(async () => {
  const jobPath = process.argv[2];
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const out = { ok: true, steps: [] };

  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) {
    console.log(JSON.stringify({ ok: false, note: 'cdp_unavailable', err: String(e.message || e).slice(0, 120) }));
    process.exit(2);
  }
  const ctx0 = browser.contexts()[0];
  const page = await ctx0.newPage();
  const sess = await ctx0.newCDPSession(page);

  const isThreadsCookie = c => /threads\.com$/.test(c.domain);

  // Step 1: list threads.com cookies with domain+path (read-only)
  let all = await sess.send('Storage.getCookies');
  let tc = all.cookies.filter(isThreadsCookie);
  out.steps.push({ step: 'cookies_before', count: tc.length,
    list: tc.map(c => ({ name: c.name, domain: c.domain, path: c.path, httpOnly: c.httpOnly, secure: c.secure, session: c.session })) });

  // Step 2: delete each precisely via Network.deleteCookies
  const deleted = [];
  const failed = [];
  for (const c of tc) {
    try {
      await sess.send('Network.deleteCookies', { name: c.name, domain: c.domain, path: c.path });
      deleted.push(c.name + '@' + c.domain + c.path);
    } catch (e) { failed.push({ name: c.name, err: String(e.message || e).slice(0, 120) }); }
  }
  out.steps.push({ step: 'delete_cookies', deleted_count: deleted.length, deleted, failed });

  // Step 3: verify
  all = await sess.send('Storage.getCookies');
  tc = all.cookies.filter(isThreadsCookie);
  out.steps.push({ step: 'cookies_after', count: tc.length, names: tc.map(c => c.name) });

  // Step 4: capture headers on the next navigation
  const seen = [];
  const threadReqIds = new Set();
  sess.on('Network.requestWillBeSent', e => {
    const url = e.request.url || '';
    if (url.indexOf('threads.com') >= 0) threadReqIds.add(e.requestId);
    seen.push({ t: 'req', url: url.slice(0, 140), id: e.requestId.slice(-8) });
  });
  sess.on('Network.requestWillBeSentExtraInfo', e => {
    if (threadReqIds.has(e.requestId)) {
      const h = e.headers || {};
      const cookie = h['Cookie'] || h['cookie'] || '';
      seen.push({ t: 'reqExtra', id: e.requestId.slice(-8), has_cookie: cookie.length > 0, cookie_len: cookie.length });
    }
  });
  sess.on('Network.responseReceived', e => {
    seen.push({ t: 'resp', url: (e.response.url || '').slice(0, 140), status: e.response.status, id: e.requestId.slice(-8) });
  });
  sess.on('Network.loadingFailed', e => seen.push({ t: 'fail', id: e.requestId.slice(-8), errorText: e.errorText }));
  await sess.send('Network.enable');

  const nav = { loaded: false, err: '' };
  try {
    await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);
    nav.loaded = true;
    nav.final_url = page.url().slice(0, 120);
    nav.title = (await page.title()).slice(0, 80);
    const body = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 400) : '');
    nav.body_head = body.replace(/\s+/g, ' ').slice(0, 200);
  } catch (e) { nav.err = String(e.message || e).slice(0, 200); }
  try { await page.close(); } catch (_) {}
  out.navigation = nav;
  out.events = seen.slice(0, 20);

  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
