#!/usr/bin/env node
// ig-session-recover.js -- bounded self-healing for the Instagram web session.
// Runs ON THE PIG (Windows node), CDP :9226 against the dedicated ig-profile
// Chrome. Implements Nolan's 2026-10-02 directive: on a pure logged-out state
// (no challenge, no flag) the automation closes the stale window state out and
// opens it again BY ITSELF, instead of declaring AUTH_FAILURE to Nolan after
// two soft retries (reload / fresh nav).
//
// Sequence (each step re-runs the login gate):
//   0. Gate the best existing instagram.com tab (read-only).
//   1. Close stale instagram.com tabs GRACEFULLY (page.close, never process
//      kill: the 2026-09-16 force-kill lost the session; that must not recur),
//      open one fresh tab in the SAME profile context, re-gate.
//   2. If still logged out, open one fresh dedicated OS window via the proven
//      CDP Target.createTarget newWindow pattern (same as th-engage.js
//      openWorkerWindow; shares the ig-profile login storage), re-gate.
// Abort immediately (no further steps) on any challenge/2FA/checkpoint text
// or a password field: those need Nolan, never the worker. NEVER enters
// credentials. Read-only with respect to the account: no likes, no follows,
// no navigation beyond instagram.com.
//
// Usage (from cloud): pig_ssh "powershell ... node.exe
//   'C:/Users/nolan/.local/share/pigi/fb-engage/ig-session-recover.js'"
// Prints one JSON line {ok, state, attempts:[...]}; exit 0 on any determinate
// outcome, exit 2 on infra failure (CDP down).
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://127.0.0.1:9226';
const CHALLENGE = /two.?factor|authentication app|verification code|checkpoint|verify your identity|unusual login|confirm it's you|suspicious activity/i;

async function gate(page) {
  const st = await page.evaluate(() => ({
    url: location.href,
    loginForm: !!document.querySelector('input[name="username"]'),
    homeNav: !!document.querySelector('a[aria-label="Home"], svg[aria-label="Home"]'),
    passwordField: !!document.querySelector('input[type="password"]'),
    challengeText: /two.?factor|authentication app|verification code|checkpoint|verify your identity|unusual login|confirm it's you|suspicious activity/i.test(document.body.innerText || ''),
  }));
  return {
    loggedIn: !st.loginForm && st.homeNav,
    blocked: st.passwordField || st.challengeText,
    raw: st,
  };
}

async function freshGate(ctx, url, attempts, label) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    const g = await gate(page);
    attempts.push({ phase: label, action: 'fresh-nav+gate', loggedIn: g.loggedIn, blocked: g.blocked, url: g.raw.url });
    return { page, g };
  } catch (e) {
    attempts.push({ phase: label, action: 'fresh-nav+gate', error: String(e.message || e).slice(0, 120) });
    try { await page.close(); } catch (_) {}
    return { page: null, g: null };
  }
}

// Proven pattern (th-engage.js openWorkerWindow, live-verified 2026-09-23):
// Target.createTarget newWindow:true opens a TRUE separate OS window on the
// SAME browser context, so the ig-profile login storage is shared.
async function openFreshWindow(browser, ctx) {
  const fallback = async () => {
    const page = await ctx.newPage();
    return { page, windowed: false, close: async () => { try { await page.close(); } catch (_) {} } };
  };
  let cdp;
  try { cdp = await browser.newBrowserCDPSession(); }
  catch (_) { return fallback(); }
  const seen = new Set(ctx.pages());
  const pageP = ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null);
  let targetId;
  try { ({ targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', newWindow: true })); }
  catch (_) { return fallback(); }
  let page = await pageP;
  if (!page || page.isClosed()) {
    for (const p of ctx.pages()) { if (!seen.has(p)) { page = p; break; } }
  }
  if (!page) { try { await cdp.send('Target.closeTarget', { targetId }); } catch (_) {} return fallback(); }
  const close = async () => {
    try { await cdp.send('Target.closeTarget', { targetId }); }
    catch (_) { try { await page.close(); } catch (_) {} }
  };
  return { page, close, windowed: true };
}

(async () => {
  const attempts = [];
  const done = (o) => { console.log(JSON.stringify(Object.assign({ attempts }, o))); process.exit(0); };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, state: 'cdp_down', attempts, error: String(e.message || e).slice(0, 120) })); process.exit(2); }
  try {
    const ctx = browser.contexts()[0];
    const igTabs = ctx.pages().filter(p => /instagram\.com/.test(p.url() || ''));
    attempts.push({ phase: 'probe', action: 'enumerate', instagramTabs: igTabs.length });

    // Step 0: gate the best existing tab (read-only).
    let best = null, bestGate = null;
    for (const p of igTabs) {
      try {
        const g = await gate(p);
        if (!best || (g.loggedIn && !bestGate.loggedIn)) { best = p; bestGate = g; }
        if (g.blocked) { best = p; bestGate = g; break; }
      } catch (_) {}
    }
    if (bestGate && bestGate.blocked)
      return done({ ok: false, state: 'challenge_detected', note: 'challenge/password on existing tab; needs Nolan' });
    if (bestGate && bestGate.loggedIn)
      return done({ ok: true, state: 'already_logged_in', note: 'existing tab is signed in; no recovery needed' });
    attempts.push({ phase: 'probe', action: 'gate-existing', loggedIn: false });

    // Step 1: close stale IG tabs gracefully, fresh tab, re-gate.
    const closed = [];
    for (const p of igTabs) {
      try { closed.push(p.url()); await p.close(); } catch (_) {}
    }
    attempts.push({ phase: 'close-tabs', action: 'graceful-tab-close', closed });
    let r = await freshGate(ctx, 'https://www.instagram.com/', attempts, 'fresh-tab');
    if (r.g && r.g.blocked) { try { await r.page.close(); } catch (_) {} return done({ ok: false, state: 'challenge_detected', note: 'challenge/password after fresh tab; needs Nolan' }); }
    if (r.g && r.g.loggedIn) { try { await r.page.close(); } catch (_) {} return done({ ok: true, state: 'recovered', note: 'fresh tab in same profile is signed in; stale tabs were the problem' }); }
    if (r.page) { try { await r.page.close(); } catch (_) {} }

    // Step 2: fresh dedicated OS window, re-gate.
    const win = await openFreshWindow(browser, ctx);
    attempts.push({ phase: 'fresh-window', action: 'open', windowed: win.windowed });
    let wg = null;
    try {
      await win.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(8000);
      wg = await gate(win.page);
      attempts.push({ phase: 'fresh-window', action: 'gate', loggedIn: wg.loggedIn, blocked: wg.blocked });
    } catch (e) {
      attempts.push({ phase: 'fresh-window', action: 'gate', error: String(e.message || e).slice(0, 120) });
    }
    try { await win.close(); } catch (_) {}
    if (wg && wg.blocked)
      return done({ ok: false, state: 'challenge_detected', note: 'challenge/password in fresh window; needs Nolan' });
    if (wg && wg.loggedIn)
      return done({ ok: true, state: 'recovered', note: 'fresh window is signed in; stale window state was the problem' });
    return done({ ok: false, state: 'still_logged_out', note: 'close-out/open-again exhausted; session genuinely gone from the ig-profile; Nolan re-login needed' });
  } catch (e) {
    return done({ ok: false, state: 'worker_error', error: String(e.message || e).slice(0, 150) });
  }
})();
