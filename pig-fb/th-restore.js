#!/usr/bin/env node
// th-restore.js -- attempt to re-link the Threads session to the saved Instagram
// session in the Pig ig-profile Chrome (CDP localhost:9226). Sanctioned restore
// step: click "Continue with Instagram" on threads.com, then "Continue as
// @nolanpigi" on the Instagram side, which uses the browser's
// already-authenticated IG session. NEVER enters credentials. Aborts immediately
// (no engagement) if a 2FA code, checkpoint, or verification challenge appears,
// or if a password field is ever presented. Usage: node th-restore.js
// Prints JSON {ok, state} and exits 0 on any outcome (infra failure = exit 2).
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
const CHALLENGE = /two.?factor|authentication app|verification code|checkpoint|verify your identity|unusual login|confirm it's you/i;

async function gate(page) {
  const st = await page.evaluate(() => ({
    loginPrompt: Array.from(document.querySelectorAll('button, a'))
      .filter(e => /log in|continue with instagram/i.test((e.innerText || '').trim()) && (e.innerText || '').trim().length < 45).length,
    profileLinks: Array.from(document.querySelectorAll('a[href]'))
      .filter(a => /^\/@[a-z0-9._]+\/$/i.test(a.getAttribute('href') || '')).length,
    createBtn: Array.from(document.querySelectorAll('button, a'))
      .some(e => /^create$/i.test((e.innerText || '').trim()) || /create/i.test(e.getAttribute('aria-label') || '')),
    // 2026-09-27: feed chrome is a positive logged-in signal. The old gate
    // (profileLinks/createBtn only) misclassified a logged-in home feed as
    // logged out because the current threads.com DOM exposes neither.
    feedChrome: /what.s new\?/i.test(document.body.innerText || '') ||
      Array.from(document.querySelectorAll('a[href]')).some(a => /^\/$/.test(a.getAttribute('href') || '') && /for you/i.test((a.innerText || ''))),
  }));
  return { loggedIn: st.loginPrompt === 0 && (st.profileLinks > 0 || st.createBtn || st.feedChrome), raw: st };
}

async function clickText(page, pattern, retries) {
  for (let i = 0; i < (retries || 3); i++) {
    const hit = await page.evaluate((src) => {
      const re_ = new RegExp(src, 'i');
      const el = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'))
        .find(e => re_.test((e.innerText || '').trim()) && (e.innerText || '').trim().length < 60);
      if (el) { el.click(); return true; }
      return false;
    }, pattern);
    if (hit) return true;
    await sleep(8000);
  }
  return false;
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText || '');
}

async function hasPasswordField(page) {
  return page.evaluate(() => !!document.querySelector('input[type="password"]'));
}

(async () => {
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, state: 'cdp_down' })); process.exit(2); }
  const done = (o) => { console.log(JSON.stringify(o)); process.exit(0); };
  try {
    const ctx = browser.contexts().find(c => c.pages().length) || browser.contexts()[0];
    const page = await ctx.newPage();
    await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    let g = await gate(page);
    if (g.loggedIn) return done({ ok: true, state: 'already_logged_in' });
    let bt = '';

    // Go to the Threads login choice screen (has "Continue with Instagram").
    await page.goto('https://www.threads.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);
    bt = await bodyText(page);
    if (CHALLENGE.test(bt)) return done({ ok: false, state: 'needs_2fa_or_checkpoint', note: 'challenge on login screen; aborting' });
    // Login screen should offer "Continue with Instagram"; click it (rides the saved IG session).
    if (!(await clickText(page, 'continue with instagram')))
      return done({ ok: false, state: 'no_continue_ig_entry', note: 'no Continue with Instagram control found' });
    await sleep(9000);
    bt = await bodyText(page);
    if (CHALLENGE.test(bt)) return done({ ok: false, state: 'needs_2fa_or_checkpoint', note: 'challenge after Continue with Instagram; aborting' });
    if (await hasPasswordField(page))
      return done({ ok: false, state: 'password_required', note: 'password field presented; will not enter credentials' });

    // IG SSO side: click "Continue to Threads" as nolanpigi.
    if (!(await clickText(page, 'continue to threads'))) {
      // Maybe it bounced straight back to Threads already logged in.
      await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(7000);
      g = await gate(page);
      return done({ ok: g.loggedIn, state: g.loggedIn ? 'restored' : 'no_continue_as', gate: g.raw });
    }
    await sleep(9000);
    bt = await bodyText(page);
    if (CHALLENGE.test(bt)) return done({ ok: false, state: 'needs_2fa_or_checkpoint', note: 'challenge after continue as; aborting' });
    await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    g = await gate(page);
    return done({ ok: g.loggedIn, state: g.loggedIn ? 'restored' : 'restore_failed', gate: g.raw });
  } catch (e) {
    return done({ ok: false, state: 'worker_error', note: String(e.message || e).slice(0, 150) });
  }
})();
