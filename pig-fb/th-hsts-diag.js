#!/usr/bin/env node
// th-hsts-diag.js -- READ-ONLY diagnostics for the threads.com failure in the
// ig-profile Chrome. Zero mutations: navigates only, reads extension manifests
// from disk, never clicks, never clears storage, never logs in.
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
const PROFILE_DIR = 'C:/Users/nolan/.local/share/pigi/ig-profile';

(async () => {
  const jobPath = process.argv[2];
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const out = { ok: true, profile_dir: PROFILE_DIR };

  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) {
    console.log(JSON.stringify({ ok: false, note: 'cdp_unavailable', err: String(e.message || e).slice(0, 120) }));
    process.exit(2);
  }

  // ---- Part B: extensions (disk manifest reads, read-only) ----
  const exts = [];
  try {
    const extRoot = path.join(PROFILE_DIR, 'Extensions');
    for (const id of fs.readdirSync(extRoot)) {
      const idDir = path.join(extRoot, id);
      try { if (!fs.statSync(idDir).isDirectory()) continue; } catch (_) { continue; }
      let vers = [];
      try { vers = fs.readdirSync(idDir).filter(v => { try { return fs.statSync(path.join(idDir, v)).isDirectory(); } catch (_) { return false; } }); } catch (_) {}
      for (const v of vers) {
        const manPath = path.join(idDir, v, 'manifest.json');
        if (!fs.existsSync(manPath)) continue;
        let man; try { man = JSON.parse(fs.readFileSync(manPath, 'utf8')); } catch (_) { continue; }
        const perms = [].concat(man.permissions || [], man.host_permissions || []);
        const matches = (man.content_scripts || []).reduce((acc, cs) => acc.concat(cs.matches || []), []);
        const all = perms.concat(matches);
        const coversThreads = all.some(p => /threads\.com|all_urls|^\*:\/\/\*/.test(p));
        exts.push({
          id, version: v, name: man.name,
          covers_threads: coversThreads,
          has_webrequest: perms.some(p => /webrequest/i.test(p)),
          has_declarative_net: perms.some(p => /declarativeNetRequest/i.test(p)),
          perms: perms.slice(0, 25), content_matches: matches.slice(0, 10)
        });
      }
    }
  } catch (e) { out.ext_read_error = String(e.message || e).slice(0, 200); }
  out.extensions = exts;

  // ---- Part C: fresh incognito-like context loads threads.com ----
  const c = { label: 'C_fresh_context', loaded: false, err: '', title: '', final_url: '' };
  let fctx;
  try {
    fctx = await browser.newContext();
    const fp = await fctx.newPage();
    await fp.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(4000);
    c.loaded = true;
    c.final_url = fp.url().slice(0, 120);
    c.title = (await fp.title()).slice(0, 80);
  } catch (e) { c.err = String(e.message || e).slice(0, 300); }
  try { if (fctx) await fctx.close(); } catch (_) {}
  out.fresh_context = c;

  // ---- Part A: Network-domain capture of the exact failure ----
  const ctx0 = browser.contexts()[0];
  const a = { label: 'A_network_capture', events: [], nav_err: '', loaded: false };
  let page;
  try {
    page = await ctx0.newPage();
    const sess = await ctx0.newCDPSession(page);
    const seen = [];
    const threadReqIds = new Set();
    sess.on('Network.requestWillBeSent', e => {
      const url = e.request.url || '';
      if (url.indexOf('threads.com') >= 0) threadReqIds.add(e.requestId);
      seen.push({ t: 'req', url: url.slice(0, 140), method: e.request.method, id: e.requestId.slice(-8) });
    });
    sess.on('Network.requestWillBeSentExtraInfo', e => {
      if (threadReqIds.has(e.requestId)) {
        const h = e.headers || {};
        const keys = Object.keys(h);
        const cookie = h['Cookie'] || h['cookie'] || '';
        seen.push({ t: 'reqExtra', id: e.requestId.slice(-8),
          has_cookie: cookie.length > 0, cookie_len: cookie.length,
          header_keys: keys.slice(0, 30) });
      }
    });
    sess.on('Network.responseReceived', e => {
      let sec = null;
      if (e.response.securityDetails) sec = { protocol: e.response.securityDetails.protocol, issuer: (e.response.securityDetails.issuer || '').slice(0, 60) };
      seen.push({ t: 'resp', url: (e.response.url || '').slice(0, 140), status: e.response.status, fromDiskCache: e.response.fromDiskCache, sec, id: e.requestId.slice(-8) });
    });
    sess.on('Network.responseReceivedExtraInfo', e => {
      seen.push({ t: 'respExtra', id: e.requestId.slice(-8), status: e.statusCode,
        headers: JSON.stringify(e.headers || {}).slice(0, 800) });
    });
    sess.on('Network.loadingFailed', e => seen.push({ t: 'fail', id: e.requestId.slice(-8), errorText: e.errorText, blockedReason: e.blockedReason || null, cors: e.corsErrorStatus ? JSON.stringify(e.corsErrorStatus).slice(0, 120) : null }));
    await sess.send('Network.enable');
    try {
      await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);
      a.loaded = true;
      a.final_url = page.url().slice(0, 120);
      a.title = (await page.title()).slice(0, 80);
    } catch (e) { a.nav_err = String(e.message || e).slice(0, 300); }
    a.events = seen.slice(0, 40);
  } catch (e) { a.setup_err = String(e.message || e).slice(0, 200); }
  try { if (page) await page.close(); } catch (_) {}
  out.network_capture = a;

  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
  process.exit(0);
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
