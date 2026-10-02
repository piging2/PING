#!/usr/bin/env node
// th-sitedata-clear.js -- AUTHORIZED MUTATION.
// Nolan answered THREADS-002 YES on 2026-09-20 ~09:14 MDT: full origin-scoped
// site data clear for threads.com in the ig-profile Chrome; he will relink
// the session himself afterward.
// What it does:
//   1. Via CDP Storage.clearDataForOrigin, clears ALL site data for exactly
//      the origins https://www.threads.com and https://threads.com
//      (cookies, local/session storage, IndexedDB, service workers, cache).
//   2. Then does a READ-ONLY fresh-tab probe of https://www.threads.com/
//      (navigate only, zero clicks, zero further mutations, no login).
// Scope enforcement: ALLOWED_ORIGINS is hard-coded and assertScope() throws
// BEFORE any CDP call if an origin ever falls outside the threads.com scope.
// instagram.com and every other origin are never touched.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
const ALLOWED_ORIGINS = ['https://www.threads.com', 'https://threads.com'];
const SCOPE_RE = /^https:\/\/([a-z0-9-]+\.)?threads\.com$/;
function assertScope(origin) {
  if (!SCOPE_RE.test(origin) || ALLOWED_ORIGINS.indexOf(origin) === -1) {
    throw new Error('REFUSED: origin out of authorized scope: ' + origin);
  }
}
(async () => {
  const jobPath = process.argv[2];
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const out = {
    ok: true,
    mutation: 'threads_origin_site_data_clear',
    authorized_by: 'nolan_threads002_yes_2026-09-20_0914MDT',
    scope: ALLOWED_ORIGINS.slice(),
    clears: [],
    probe: null,
  };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { out.ok = false; out.note = 'cdp_unavailable'; console.log(JSON.stringify(out)); process.exit(2); }
  const ctx0 = browser.contexts()[0];
  // Page-level CDP session: DevTools' "Clear site data" attaches to a page
  // target; Storage.clearDataForOrigin on a browser-level session returns an
  // internal protocol error in this Chromium build (observed 2026-09-20).
  const attachPage = await ctx0.newPage();
  const bs = await ctx0.newCDPSession(attachPage);
  for (const origin of ALLOWED_ORIGINS) {
    assertScope(origin); // throws before any CDP mutation if scope ever drifts
    const c = { origin, scope_checked: true, usage_before: null, clear: null, usage_after: null };
    try { c.usage_before = await bs.send('Storage.getUsageAndQuota', { origin }); }
    catch (e) { c.usage_before = { error: String(e.message || e).slice(0, 150) }; }
    try {
      await bs.send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' });
      c.clear = { ok: true, storageTypes: 'all' };
    } catch (e) { c.clear = { ok: false, error: String(e.message || e).slice(0, 250) }; }
    try { c.usage_after = await bs.send('Storage.getUsageAndQuota', { origin }); }
    catch (e) { c.usage_after = { error: String(e.message || e).slice(0, 150) }; }
    out.clears.push(c);
    await sleep(2000);
  }
  try { if (attachPage) await attachPage.close(); } catch (_) {}
  await sleep(5000);
  // READ-ONLY probe: fresh tab, navigate only, extract text markers, never click.
  const t = { label: 'threads_post_sitedata_clear', url: 'https://www.threads.com/', loaded: false, final_url: '', title: '', err: '', auth: null };
  let page;
  try {
    page = await ctx0.newPage();
    await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(6000);
    t.loaded = true;
    t.final_url = page.url().slice(0, 160);
    t.title = (await page.title()).slice(0, 80);
    const text = await page.evaluate(() => {
      const el = document.querySelector('main') || document.body;
      return (el ? el.innerText : '').replace(/\s+/g, ' ').slice(0, 400);
    }).catch(() => '');
    const lower = text.toLowerCase();
    t.body_snippet = text.slice(0, 300);
    t.auth = {
      snippet: text.slice(0, 200),
      has_login_cta: /log in( to threads)?/.test(lower) && /create account|sign up/.test(lower),
      has_logged_out_wall: /log in to see|log in to threads|join threads/.test(lower),
      feed_markers: ['for you', 'following', "what's new", 'what is new'].filter(m => lower.includes(m)),
    };
  } catch (e) { t.err = String(e.message || e).slice(0, 250); }
  try { if (page) await page.close(); } catch (_) {}
  out.probe = t;
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
