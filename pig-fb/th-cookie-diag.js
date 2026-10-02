#!/usr/bin/env node
// th-cookie-diag.js -- Tests whether the threads.com 429 is keyed on cookies.
// Mutations are scoped STRICTLY to threads.com cookies only:
//   Storage.clearDataForOrigin(storageTypes:'cookies') for
//   https://www.threads.com and https://threads.com.
// instagram.com and all other origins untouched. No login attempts, no clicks.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
const ALLOWED_ORIGINS = ['https://www.threads.com', 'https://threads.com'];

function assertScope(origin) {
  if (!ALLOWED_ORIGINS.includes(origin)) throw new Error('SCOPE DRIFT BLOCKED: ' + origin);
}

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

  // Step 1: count threads.com cookies before clear (read-only)
  let page = await ctx0.newPage();
  let sess = await ctx0.newCDPSession(page);
  let before = await sess.send('Storage.getCookies');
  const beforeThreads = before.cookies.filter(c => /threads\.com$/.test(c.domain));
  out.steps.push({ step: 'cookies_before', threads_cookie_count: beforeThreads.length,
    names: beforeThreads.map(c => c.name) });

  // Step 2: clear ONLY cookies for the two threads.com origins
  for (const origin of ALLOWED_ORIGINS) {
    assertScope(origin);
    const r = await sess.send('Storage.clearDataForOrigin', { origin, storageTypes: 'cookies' });
    out.steps.push({ step: 'clear_cookies', origin, result: 'ok' });
  }

  // Step 3: verify zero threads.com cookies remain
  let after = await sess.send('Storage.getCookies');
  const afterThreads = after.cookies.filter(c => /threads\.com$/.test(c.domain));
  out.steps.push({ step: 'cookies_after', threads_cookie_count: afterThreads.length,
    names: afterThreads.map(c => c.name) });
  await page.close();

  // Step 4: immediate cookie-less navigation with header capture
  page = await ctx0.newPage();
  sess = await ctx0.newCDPSession(page);
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
    seen.push({ t: 'resp', url: (e.response.url || '').slice(0, 140), status: e.response.status,
      id: e.requestId.slice(-8) });
  });
  sess.on('Network.responseReceivedExtraInfo', e => {
    const hdr = e.headers || {};
    seen.push({ t: 'respExtra', id: e.requestId.slice(-8), status: e.statusCode,
      retry_after: hdr['retry-after'] || hdr['Retry-After'] || null,
      header_count: Object.keys(hdr).length,
      headers: JSON.stringify(hdr).slice(0, 1500) });
  });
  sess.on('Network.loadingFailed', e => seen.push({ t: 'fail', id: e.requestId.slice(-8), errorText: e.errorText }));
  await sess.send('Network.enable');
  const nav = { loaded: false, err: '' };
  try {
    await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    nav.loaded = true;
    nav.final_url = page.url().slice(0, 120);
    nav.title = (await page.title()).slice(0, 80);
    // auth markers, no clicks
    const body = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 500) : '');
    nav.body_head = body.replace(/\s+/g, ' ').slice(0, 200);
  } catch (e) { nav.err = String(e.message || e).slice(0, 200); }
  try { await page.close(); } catch (_) {}
  out.navigation = nav;
  out.events = seen.slice(0, 20);

  // Step 5: control — instagram.com still loads (read-only)
  const ctl = { loaded: false, err: '' };
  try {
    const cp = await ctx0.newPage();
    await cp.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(3000);
    ctl.loaded = true;
    ctl.title = (await cp.title()).slice(0, 60);
    await cp.close();
  } catch (e) { ctl.err = String(e.message || e).slice(0, 150); }
  out.instagram_control = ctl;

  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
