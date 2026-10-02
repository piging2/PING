#!/usr/bin/env node
// th-window-recycle.js -- "close out, open it again" for Threads, done by the
// automation itself. Runs ON THE PIG (Windows node), CDP :9226 against the
// dedicated ig-profile Chrome. Nolan's 2026-10-02 directive: the worker must
// recycle the stale Threads window state before declaring a login problem,
// instead of asking him.
//
// What it does (bounded, graceful):
//   1. Gracefully closes stale threads.com pages in the ig-profile context
//      (page.close only; the browser process is NEVER killed -- the 2026-09-16
//      force-kill lost the IG session and must not recur). Closed targets are
//      audited in the output.
//   2. Opens ONE fresh dedicated OS window via the proven CDP
//      Target.createTarget newWindow pattern (th-engage.js openWorkerWindow,
//      live-verified 2026-09-23; shares the ig-profile login storage),
//      navigates to threads.com, and runs the th-restore.js login gate.
//   3. Closes the probe window (no window sprawl) and reports.
// The normal pass flow is: th-window-recycle.js -> th-restore.js (SSO relink
// rides the IG session) -> engagement. This script never enters credentials
// and aborts its verdict (never its safety) on challenge text: a challenge
// means the IG session underneath needs Nolan.
// Prints one JSON line {ok, state, closed, windowed, gate}; exit 0 on any
// determinate outcome, exit 2 on infra failure (CDP down).
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://127.0.0.1:9226';

// Same gate as th-restore.js (2026-09-27 feed-chrome fix included).
async function gate(page) {
  const st = await page.evaluate(() => ({
    loginPrompt: Array.from(document.querySelectorAll('button, a'))
      .filter(e => /log in|continue with instagram/i.test((e.innerText || '').trim()) && (e.innerText || '').trim().length < 45).length,
    profileLinks: Array.from(document.querySelectorAll('a[href]'))
      .filter(a => /^\/@[a-z0-9._]+\/$/i.test(a.getAttribute('href') || '')).length,
    createBtn: Array.from(document.querySelectorAll('button, a'))
      .some(e => /^create$/i.test((e.innerText || '').trim()) || /create/i.test(e.getAttribute('aria-label') || '')),
    feedChrome: /what.s new\?/i.test(document.body.innerText || '') ||
      Array.from(document.querySelectorAll('a[href]')).some(a => /^\/$/.test(a.getAttribute('href') || '') && /for you/i.test((a.innerText || ''))),
    challenge: /two.?factor|authentication app|verification code|checkpoint|verify your identity|unusual login|confirm it's you|suspicious activity/i.test(document.body.innerText || ''),
  }));
  return { loggedIn: st.loginPrompt === 0 && (st.profileLinks > 0 || st.createBtn || st.feedChrome), challenge: st.challenge, raw: st };
}

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
  const closed = [];
  const done = (o) => { console.log(JSON.stringify(Object.assign({ closed }, o))); process.exit(0); };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, state: 'cdp_down', closed, error: String(e.message || e).slice(0, 120) })); process.exit(2); }
  try {
    const ctx = browser.contexts()[0];
    // Close out: stale threads.com pages, graceful, audited.
    for (const p of ctx.pages()) {
      try {
        if (/threads\.com/.test(p.url() || '')) { closed.push(p.url()); await p.close(); }
      } catch (_) {}
    }
    // Open it again: one fresh dedicated window, gate it.
    const win = await openFreshWindow(browser, ctx);
    let g = null;
    try {
      await win.page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(8000);
      g = await gate(win.page);
    } catch (e) {
      try { await win.close(); } catch (_) {}
      return done({ ok: false, state: 'worker_error', windowed: win.windowed, error: String(e.message || e).slice(0, 150) });
    }
    try { await win.close(); } catch (_) {}
    if (g.challenge)
      return done({ ok: false, state: 'challenge_detected', windowed: win.windowed, note: 'challenge text in fresh window; underlying IG session needs Nolan' });
    if (g.loggedIn)
      return done({ ok: true, state: 'recycled_logged_in', windowed: win.windowed, note: 'fresh window is signed in; stale window state was the problem' });
    return done({ ok: false, state: 'recycled_still_logged_out', windowed: win.windowed, note: 'fresh window also logged out; run th-restore.js SSO next, then Nolan only if that fails' });
  } catch (e) {
    return done({ ok: false, state: 'worker_error', error: String(e.message || e).slice(0, 150) });
  }
})();
