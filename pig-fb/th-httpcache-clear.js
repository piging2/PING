#!/usr/bin/env node
// th-httpcache-clear.js -- AUTHORIZED MUTATION: HTTP disk cache ONLY.
// Nolan authorized on 2026-09-20 ~09:32 MDT: clear "Cached images and files"
// for ALL TIME in the ig-profile Chrome. He understands this touches the
// live profile's disk cache for all sites but involves no logout.
// What it does:
//   1. Via CDP Network.clearBrowserCache (page-level session, as the prior
//      mutation scripts used), clears the browser's HTTP disk cache. This is
//      the cache-only clear: it touches NO cookies, NO sessions, NO local
//      storage, NO passwords, NO other browsing-data type. It is all-time
//      (the method takes no time-range parameter; it clears the whole cache).
//   2. Then does READ-ONLY fresh-tab probes: https://www.threads.com/
//      (target) and https://www.instagram.com/ (control). Navigate only,
//      zero clicks, zero further mutations, no login, no 2FA.
// Safety: this script contains exactly ONE mutating CDP call,
// 'Network.clearBrowserCache'. It NEVER calls Storage.clearDataForOrigin,
// BrowsingData.remove, or any other clear method. If a step risks session
// loss, it must stop and report instead (none expected here).
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
const MUTATING_CALLS = ['Network.clearBrowserCache']; // audit surface: only cache
(async () => {
  const jobPath = process.argv[2];
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const out = {
    ok: true,
    mutation: 'http_disk_cache_clear_all_time',
    authorized_by: 'nolan_httpcache_clear_yes_2026-09-20_0932MDT',
    mutating_calls: MUTATING_CALLS.slice(),
    cache_clear: null,
    probes: [],
  };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { out.ok = false; out.note = 'cdp_unavailable'; console.log(JSON.stringify(out)); process.exit(2); }
  const ctx0 = browser.contexts()[0];
  // Page-level CDP session (same pattern as the site-data clear: browser-level
  // sessions returned protocol internal errors in this Chromium build).
  const attachPage = await ctx0.newPage();
  const bs = await ctx0.newCDPSession(attachPage);
  // THE cache-only mutation. Takes no parameters; clears the entire HTTP
  // cache (all time). No browsing-data type is touched.
  const c = { method: 'Network.clearBrowserCache', ok: false };
  try {
    await bs.send('Network.clearBrowserCache');
    c.ok = true;
  } catch (e) { c.error = String(e.message || e).slice(0, 250); }
  out.cache_clear = c;
  try { if (attachPage) await attachPage.close(); } catch (_) {}
  if (!c.ok) {
    out.ok = false;
    out.note = 'cache_clear_failed_no_mutation_to_profile';
    fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out));
    process.exit(3);
  }
  await sleep(5000);
  // READ-ONLY probes: navigate only, extract markers, never click.
  const probeDefs = [
    { label: 'threads_post_httpcache_clear', url: 'https://www.threads.com/' },
    { label: 'instagram_control', url: 'https://www.instagram.com/' },
  ];
  for (const def of probeDefs) {
    const t = { label: def.label, url: def.url, loaded: false, final_url: '', title: '', err: '', auth: null };
    let page;
    try {
      page = await ctx0.newPage();
      await page.goto(def.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
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
        has_login_cta: /log in( to threads)?|log in/.test(lower) && /create account|sign up/.test(lower),
        has_logged_out_wall: /log in to see|log in to threads|join threads/.test(lower),
        feed_markers: ['for you', 'following', "what's new", 'what is new'].filter(m => lower.includes(m)),
      };
    } catch (e) { t.err = String(e.message || e).slice(0, 250); }
    try { if (page) await page.close(); } catch (_) {}
    out.probes.push(t);
    await sleep(2000);
  }
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
