#!/usr/bin/env node
// Pigi Instagram+Threads engagement worker (runs on the Pig, Nolan's workstation).
// Attaches via CDP to the always-on headed Chrome (ig-profile, :9226) that holds
// Nolan's Instagram login. Threads rides the same session (Threads web auth is
// Instagram auth), so one driver serves both platforms, branching on URL host.
// The worker opens its OWN separate browser window (openWorkerWindow) and never
// uses tabs in Nolan's window. That browser must stay running; the session does
// not survive restarts, so this script never launches or closes it. Never attempts a login.
// Usage: node ig-engage.js <job.json>
// job.json: { "actions": [ {type:"like"|"comment", url, text?} ], "minDelaySec": 60, "maxDelaySec": 120,
//             "canary_required": false }
// Canary (2026-09-17, automation-resilience program): job.canary_required=true
// or env CANARY_REQUIRED=1 (a general flag any browser driver can adopt) makes
// the FIRST action a verified canary: the run executes exactly one action,
// verifies the result, and only continues the batch on success. A failed
// canary halts the run before any further actions. With a one-action job this
// is a canary-only probe with no mass operation.
// Writes <job.json>.result.json and prints a one-line summary. Never prints credentials.
// Exit codes: 0 ok, 2 usage, 3 CDP unavailable, 4 logged out (login gate),
// 5 worker error or canary failure, 6 fatal.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const CDP = 'http://localhost:9226';
const BAD = /checkpoint|verify your identity|action blocked|temporarily blocked|we suspect automated|suspicious activity|try again later|something went wrong/i;

// (2026-09-23, Nolan: Threads and Instagram each get their OWN separate browser
// window, not tabs in Nolan's window. Verified by live probe the same day:
// CDP Target.createTarget with newWindow:true opens a TRUE separate OS window
// on the SAME browser context, so the ig-profile login storage is shared.
// window.open (popup token or not) and Ctrl+N were both probed and do NOT
// create separate windows in this Chrome config -- they open tabs.)
// Returns { page, close, windowed }. close() closes the whole worker window.
// Fail-safe: if the window mechanism fails, falls back to a plain tab so a
// pass is never broken by the window machinery.
async function openWorkerWindow(browser, ctx, label) {
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
  try {
    ({ targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', newWindow: true }));
  } catch (_) { return fallback(); }
  let page = await pageP;
  if (!page || page.isClosed()) {
    for (const p of ctx.pages()) { if (!seen.has(p)) { page = p; break; } }
  }
  if (!page) { try { await cdp.send('Target.closeTarget', { targetId }); } catch (_) {} return fallback(); }
  const close = async () => {
    try { await cdp.send('Target.closeTarget', { targetId }); }
    catch (_) { try { await page.close(); } catch (_) {} }
  };
  return { page, close, windowed: true, label };
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// ---------- login gates ----------
async function igLoggedIn(page) {
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const st = await page.evaluate(() => ({
    userField: !!document.querySelector('input[name="username"]'),
    homeNav: !!document.querySelector('[aria-label="Home"]'),
    body: (document.body.innerText || '').slice(0, 300),
  }));
  // Logged out: username/password form. Logged in: home nav, no login form.
  return !st.userField && st.homeNav;
}

async function threadsLoggedIn(page) {
  await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  // Markers aligned with th-discover.js (2026-09-19 fix): the a[aria-label="Home"]
  // marker drifted off threads.com and false-negatived on healthy signed-in
  // sessions. Positive markers are profile links and the create affordance;
  // negative marker is any "Log in" prompt.
  const st = await page.evaluate(() => ({
    loginPrompt: Array.from(document.querySelectorAll('button, a'))
      .filter(e => /log in/i.test((e.innerText || '').trim()) && (e.innerText || '').trim().length < 45).length,
    profileLinks: Array.from(document.querySelectorAll('a[href]'))
      .filter(a => /^\/@[a-z0-9._]+\/?$/i.test(a.getAttribute('href') || '')).length,
    createBtn: Array.from(document.querySelectorAll('button, a'))
      .some(e => /^create$/i.test((e.innerText || '').trim()) || /create/i.test(e.getAttribute('aria-label') || '')),
  }));
  return st.loginPrompt === 0 && (st.profileLinks > 0 || st.createBtn);
}

// ---------- Instagram actions ----------
async function igLike(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(4000, 7000));
  // Identify the MAIN post heart. Comment hearts share the same aria-label but
  // live in the Reply-bearing comments section; the post action bar section
  // has no "Reply" text. The affordance is an SVG (no .click()), so dispatch
  // trusted mouse events at its coordinates via page.mouse.
  const findMain = () => page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('[aria-label="Like"], [aria-label="Unlike"]'));
    const main = all.map(el => ({ el, sec: el.closest('section') }))
      .filter(o => o.sec && !/reply/i.test(o.sec.innerText || ''))
      .map(o => o.el)[0];
    if (!main) return null;
    main.scrollIntoView({ block: 'center' });
    const r = main.getBoundingClientRect();
    return { label: main.getAttribute('aria-label'), x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }).catch(() => null);
  const mainUnlikeVisible = () => page.evaluate(() => {
    return Array.from(document.querySelectorAll('[aria-label="Unlike"]'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        const sec = el.closest('section');
        return r.width > 0 && r.y >= 0 && r.y < innerHeight && sec && !/reply/i.test(sec.innerText || '');
      }).length > 0;
  }).catch(() => false);
  const pt = await findMain();
  if (!pt) return { ok: false, note: 'like button not found' };
  if (pt.label === 'Unlike') return { ok: true, note: 'already liked' };
  await page.mouse.click(pt.x, pt.y);
  await sleep(4000);
  if (await mainUnlikeVisible()) return { ok: true, note: 'like registered (Unlike state visible)' };
  // Instagram sometimes renders a stale Like state on fresh loads; one reload
  // fetches the true state before declaring failure.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(6000);
  if (await mainUnlikeVisible()) return { ok: true, note: 'like verified after reload (initial render was stale)' };
  return { ok: false, note: 'click sent, no Unlike state observed' };
}

async function igComment(page, url, text) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(4000, 7000));
  const box = await page.$('textarea[aria-label^="Add a comment"]');
  if (!box) return { ok: false, note: 'comment box not found' };
  await box.scrollIntoViewIfNeeded().catch(() => {});
  await box.click({ timeout: 15000 });
  await sleep(1200);
  await page.keyboard.type(text, { delay: rand(40, 90) });
  await sleep(1500);
  // IG posts via the Post button (Enter alone is unreliable).
  const posted = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .find(b => /^post$/i.test((b.innerText || '').trim()) && b.getBoundingClientRect().width > 0);
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!posted) { await page.keyboard.press('Enter'); }
  await sleep(5000);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200000)).catch(() => '');
  const seen = bodyText.includes(text.slice(0, 30));
  return { ok: seen, note: seen ? 'comment text visible' : 'comment text not found after submit' };
}

// ---------- Threads actions ----------
async function thLike(page, url) {
  // Feed-based like (2026-09-19 redesign). Post permalinks return a server-side
  // 302 to home for this session, so never page.goto(url): like from the
  // Following feed instead. The action URL still carries the permalink; we use
  // it only to extract the handle + shortcode and locate THAT exact post in
  // the feed. The like control in feed cards is a div[role="button"] whose svg
  // carries <title>Like</title> (unliked) or <title>Unlike</title> (liked).
  const m = String(url).match(/\/@([a-z0-9._]+)\/post\/([A-Za-z0-9_-]+)/i);
  if (!m) return { ok: false, note: 'cannot parse handle/shortcode from url' };
  const handle = m[1].toLowerCase(), code = m[2];
  await page.goto('https://www.threads.com/following/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(5000, 8000));
  const findTarget = () => page.evaluate(({ code, handle }) => {
    const anchor = Array.from(document.querySelectorAll('a[href]')).find(a => {
      const h = a.getAttribute('href') || '';
      const mm = h.match(/\/@([a-z0-9._]+)\/post\/([A-Za-z0-9_-]+)\/?$/i);
      return mm && mm[2] === code;
    });
    if (!anchor) return { found: false };
    // Post container: largest ancestor holding exactly this one permalink.
    let container = anchor.parentElement;
    for (let n = anchor.parentElement; n && n !== document.body; n = n.parentElement) {
      const pl = Array.from(n.querySelectorAll('a[href]')).filter(a =>
        /\/post\/[A-Za-z0-9_-]+\/?$/i.test(a.getAttribute('href') || ''));
      if (pl.length === 1) container = n; else break;
    }
    // Author cross-check: container must link the expected handle's profile.
    const authorOk = Array.from(container.querySelectorAll('a[href]')).some(a =>
      new RegExp('^/@' + handle + '/?$', 'i').test(a.getAttribute('href') || ''));
    if (!authorOk) return { found: true, authorMismatch: true };
    const btn = Array.from(container.querySelectorAll('div[role="button"], button')).find(b =>
      Array.from(b.querySelectorAll('svg title')).some(t => /^(Like|Unlike)$/i.test((t.textContent || '').trim())) &&
      b.getBoundingClientRect().width > 0);
    if (!btn) return { found: true, noLikeControl: true };
    const liked = Array.from(btn.querySelectorAll('svg title'))
      .some(t => /^Unlike$/i.test((t.textContent || '').trim()));
    if (!liked) {
      btn.scrollIntoView({ block: 'center' });
      const r = btn.getBoundingClientRect();
      return { found: true, liked: false, x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return { found: true, liked: true };
  }, { code, handle }).catch(() => null);
  let target = null;
  for (let i = 0; i < 12; i++) {          // bounded scroll budget
    target = await findTarget();
    if (target && target.found) break;
    await page.evaluate(() => window.scrollBy(0, 1800));
    await sleep(rand(2500, 4000));
  }
  if (!target || !target.found) return { ok: false, note: 'post not found in Following feed within scroll budget' };
  if (target.authorMismatch) return { ok: false, note: 'post container author mismatch; refusing to like' };
  if (target.noLikeControl) return { ok: false, note: 'like control not found in post container' };
  if (target.liked) return { ok: true, note: 'already liked' };
  await page.mouse.click(target.x, target.y);
  await sleep(4000);
  const verify = await findTarget();
  if (verify && verify.liked) return { ok: true, note: 'like registered (Unlike state visible)' };
  return { ok: false, note: 'click sent, no Unlike state observed' };
}

async function thComment(page, url, text) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(4000, 7000));
  const replyBtn = await page.evaluate(() => {
    const vis = Array.from(document.querySelectorAll('[aria-label="Reply"]'))
      .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (!vis.length) return false;
    vis[0].scrollIntoView({ block: 'center' });
    vis[0].click();
    return true;
  });
  if (!replyBtn) return { ok: false, note: 'reply button not found' };
  await sleep(2500);
  const typed = await page.evaluate((t) => {
    const ta = document.querySelector('textarea[placeholder^="Reply to"], div[contenteditable="true"][role="textbox"]');
    if (!ta) return false;
    ta.focus();
    return true;
  }, text);
  if (!typed) return { ok: false, note: 'reply composer not found' };
  await page.keyboard.type(text, { delay: rand(40, 90) });
  await sleep(1500);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => /^post$/i.test((b.innerText || '').trim()) && b.getBoundingClientRect().width > 0 && !b.disabled);
    if (btn) btn.click();
  });
  await sleep(5000);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200000)).catch(() => '');
  const seen = bodyText.includes(text.slice(0, 30));
  return { ok: seen, note: seen ? 'reply text visible' : 'reply text not found after submit' };
}

// ---------- main ----------
(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node ig-engage.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const results = [];
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP, { timeout: 20000 });
  } catch (e) {
    const out = { ok: false, note: 'CDP attach failed; is the ig-profile Chrome running? ' + String(e.message || e).slice(0, 150), results: [] };
    fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
    console.log('RESULT cdp_unavailable');
    process.exit(3);
  }
  let canaryRequired = false;
  let canaryVerified = false;
  let win = null; // worker window; closed on every exit path incl. worker_error
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    // Worker-owned separate window (see openWorkerWindow). Nolan's own tabs and
    // window are never touched: the worker drives its window and closes it.
    win = await openWorkerWindow(browser, ctx, 'instagram');
    let page = win.page;
    // (2026-09-21, FL-20260921-015: the Pig entering/exiting Modern Standby
    // mid-pass can destroy our CDP page target while the browser lives on.
    // Recreate the worker window and continue instead of failing every
    // remaining action against a dead target.)
    async function ensurePage() {
      if (!page.isClosed()) return page;
      try { await win.close(); } catch (_) {}
      win = await openWorkerWindow(browser, ctx, 'instagram');
      page = win.page;
      return page;
    }
    // Login gate: refuse to run logged out. Never attempt a login.
    const needsIG = job.actions.some(a => hostOf(a.url).includes('instagram.com'));
    const needsTH = job.actions.some(a => hostOf(a.url).includes('threads.'));
    if (needsIG && !(await igLoggedIn(page))) {
      const out = { ok: false, logged_in: false, note: 'Instagram session logged out in the ig-profile browser; Nolan must log in again in that window', results: [] };
      fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
      console.log('RESULT logged_out');
      await win.close();
      process.exit(4);
    }
    if (needsTH && !(await threadsLoggedIn(page))) {
      const out = { ok: false, logged_in: false, note: 'Threads session not active in the ig-profile browser; Nolan must log into Instagram again in that window', results: [] };
      fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
      console.log('RESULT logged_out');
      await win.close();
      process.exit(4);
    }
    // canaryRequired/canaryVerified are declared outside the try block: the
    // success path builds the final result object after the try/catch.
    canaryRequired = job.canary_required === true || process.env.CANARY_REQUIRED === '1';
    canaryVerified = !canaryRequired || job.actions.length === 0;
    const minD = (job.minDelaySec || 60) * 1000, maxD = (job.maxDelaySec || 120) * 1000;
    async function runAction(a, idx) {
      const h = hostOf(a.url);
      if (idx > 0) await sleep(rand(minD, maxD));
      let status;
      try {
        page = await ensurePage();
        let r;
        if (h.includes('instagram.com')) {
          r = a.type === 'like' ? await igLike(page, a.url)
            : a.type === 'comment' ? await igComment(page, a.url, a.text)
            : { ok: false, note: 'unknown action type' };
        } else if (h.includes('threads.')) {
          r = a.type === 'like' ? await thLike(page, a.url)
            : a.type === 'comment' ? await thComment(page, a.url, a.text)
            : { ok: false, note: 'unknown action type' };
        } else {
          r = { ok: false, note: 'unsupported host: ' + h };
        }
        results.push({ type: a.type, url: a.url, ...r });
        status = r.ok ? 'ok' : 'fail';
      } catch (e) {
        results.push({ type: a.type, url: a.url, ok: false, note: 'exception: ' + String(e.message || e).slice(0, 200) });
        status = 'fail';
      }
      const body = await page.evaluate(() => document.body.innerText.slice(0, 5000)).catch(() => '');
      if (BAD.test(body)) {
        results.push({ type: 'abort', ok: false, note: 'possible checkpoint or block detected; stopping pass' });
        return 'abort';
      }
      return status;
    }
    let startIdx = 0;
    if (canaryRequired && job.actions.length > 0) {
      const st = await runAction(job.actions[0], 0);
      if (st !== 'ok') {
        const out = {
          ok: false, canary: true, canary_required: true, canary_verified: false,
          logged_in: true,
          note: 'canary action failed or aborted; batch halted before any further actions',
          results,
        };
        fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
        console.log('RESULT canary_failed');
        await win.close();
        process.exit(5);
      }
      results[0].canary = true;
      canaryVerified = true;
      startIdx = 1;
    }
    for (let i = startIdx; i < job.actions.length; i++) {
      if ((await runAction(job.actions[i], i)) === 'abort') break;
    }
    await win.close(); // close our worker window, never the browser
  } catch (e) {
    try { if (win) await win.close(); } catch (_) {}
    const out = { ok: false, note: 'worker exception: ' + String(e.message || e).slice(0, 300), results };
    fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
    console.log('RESULT worker_error');
    process.exit(5);
  }
  const out = { ok: results.every(r => r.ok || r.type === 'abort'), logged_in: true,
    canary_required: canaryRequired, canary_verified: canaryVerified, results };
  fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
  const done = results.filter(r => r.ok).length;
  console.log(`RESULT ok=${out.ok} actions=${results.length} succeeded=${done}`);
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(6); });
