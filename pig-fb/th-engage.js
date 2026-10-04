#!/usr/bin/env node
// th-engage.js -- Threads engagement worker (runs on the Pig, Nolan's workstation).
// Attaches via CDP to the always-on headed Chrome (ig-profile, :9226) that holds
// Nolan's Instagram-linked Threads login (@nolanpigi). The worker opens its OWN
// separate browser window (openWorkerWindow) and never uses tabs in Nolan's window.
// That browser must stay running; this script never launches or closes it and
// never attempts a login.
// Usage: node th-engage.js <job.json>
// job.json: { "actions": [ {"type":"like"|"comment", "account":"@x",
//             "url":"https://www.threads.com/@x/post/CODE/", "marker":"distinctive post substring",
//             "text":"comment text (for comment)"} ],
//             "minDelaySec": 60, "maxDelaySec": 120 }
// Writes <job.json>.result.json and prints a one-line summary. Never prints credentials.
// Exit codes: 0 ok, 2 usage, 3 CDP unavailable, 4 logged out (login gate),
//             5 worker error, 6 aborted (block/challenge/rate-limit seen).
//
// Challenge resilience (2026-10-03 ~17:38, Nolan binding): page text is
// classified HARD (checkpoint, verify identity, action blocked, captcha,
// rate limit exceeded, ...) -> abort the pass, vs SOFT (something went
// wrong, try again later, liking too fast, slow down) -> skip that post and
// continue. Action outcomes add 'softskip' (post skipped, pass continues)
// and 'quarantined' (URL in th-post-quarantine.json, skipped without
// loading). 3+ distinct-post soft-skips in one pass escalate to abort.
// A URL soft-skipped 3 times (cumulative across passes) is quarantined 24h.
// Deployed per-pass by run_th_pass.sh scp; the quarantine file lives
// Pig-side next to this script and survives the scp.
//
// Selector grounding (live-verified 2026-09-20 against current Threads web):
// - Like control: div[role="button"] containing svg>title "Like" (unliked) or
//   "Unlike" (already liked by the signed-in account). No aria-pressed.
// - Reply control: div[role="button"] containing svg>title "Reply"; clicking it
//   opens the thread view with a div[role="textbox"] composer (no dialog).
// - Targeting (v3, live-verified 2026-09-20 17:0x MDT): the permalink may
//   soft-redirect to /; the target post card is found via its permalink anchor
//   a[href*="/post/<CODE>"], climbing to the card that holds the action bar.
//   Deterministic; immune to unicode/curly-quote marker mismatches. Falls back
//   to marker-substring matching when the URL carries no post code.
// - Already-liked (v3): svg title "Unlike" means the account already liked the
//   post; the driver reports 'already' and never clicks (a click would toggle
//   the like OFF).
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const CDP = 'http://localhost:9226';

// (2026-10-03 ~17:38 MDT, Nolan binding; re-applied 2026-10-03 after the
// stale local copy overwrote the Pig implementation via run_th_pass.sh's
// per-pass scp): challenge-text classifier. HARD patterns are account-level
// signals -> abort the whole pass. SOFT patterns are post-level/transient
// signals -> skip that post, continue the pass. pageChallengeMatch records
// WHICH pattern fired (level + name + matched text), not just a boolean.
const HARD_PATTERNS = [
  [/checkpoint/i, 'checkpoint'],
  [/verify your identity/i, 'verify-identity'],
  [/action blocked/i, 'action-blocked'],
  [/temporarily blocked/i, 'temporarily-blocked'],
  [/we suspect automated/i, 'suspect-automated'],
  [/suspicious activity/i, 'suspicious-activity'],
  [/captcha/i, 'captcha'],
  [/confirm you'?re a person/i, 'confirm-person'],
  [/unusual activity/i, 'unusual-activity'],
  [/rate limit exceeded/i, 'rate-limit-exceeded'],
];
const SOFT_PATTERNS = [
  [/try again later/i, 'try-again-later'],
  [/something went wrong/i, 'something-went-wrong'],
  [/you'?re liking too fast/i, 'liking-too-fast'],
  [/slow down/i, 'slow-down'],
];

// Post quarantine (2026-10-03 ~17:38): a URL soft-skipped 3 times (cumulative
// across passes) is quarantined 24h so it stops burning the first action of
// every pass. Pig-side file next to the worker: it survives the per-pass scp
// (run_th_pass.sh only overwrites th-engage.js itself) and pig-retention.sh
// (which only sweeps fb-engage/ transfer buffers, never ig-engage/).
const QUARANTINE_PATH = path.join(__dirname, 'th-post-quarantine.json');
const QUARANTINE_SKIPS = 3;
const QUARANTINE_MS = 24 * 3600 * 1000;

function loadQuarantine() {
  try {
    const q = JSON.parse(fs.readFileSync(QUARANTINE_PATH, 'utf8'));
    return (q && typeof q === 'object') ? q : {};
  } catch (_) { return {}; }
}
function saveQuarantine(q) {
  try { fs.writeFileSync(QUARANTINE_PATH, JSON.stringify(q, null, 1)); }
  catch (_) { /* best-effort; never break a pass over quarantine I/O */ }
}
// Returns { quarantined: bool, until?: string }. Expired quarantines reset
// the skip counter so the URL gets fresh chances.
function quarantineCheck(url) {
  if (!url) return { quarantined: false };
  const q = loadQuarantine();
  const e = q[url];
  if (!e || !e.quarantinedUntil) return { quarantined: false };
  if (Date.now() < Date.parse(e.quarantinedUntil)) return { quarantined: true, until: e.quarantinedUntil };
  e.skips = 0; delete e.quarantinedUntil; saveQuarantine(q);
  return { quarantined: false };
}
// Record one soft-skip sighting; quarantine for 24h on the 3rd.
function quarantineNoteSoftSkip(url, pattern) {
  if (!url) return;
  const q = loadQuarantine();
  const e = q[url] || { skips: 0 };
  e.skips = (e.skips || 0) + 1;
  e.lastSkip = new Date().toISOString();
  e.lastPattern = pattern || '';
  if (e.skips >= QUARANTINE_SKIPS && !e.quarantinedUntil)
    e.quarantinedUntil = new Date(Date.now() + QUARANTINE_MS).toISOString();
  q[url] = e;
  saveQuarantine(q);
}

// Returns null when the page is clean, else { level: 'hard'|'soft',
// pattern: <pattern name>, text: <matched snippet> }.
async function pageChallengeMatch(page) {
  const bodyText = await page.evaluate(() => document.body.innerText || '').catch(() => '');
  for (const [re, name] of HARD_PATTERNS) {
    const m = bodyText.match(re);
    if (m) return { level: 'hard', pattern: name, text: String(m[0]).slice(0, 120) };
  }
  for (const [re, name] of SOFT_PATTERNS) {
    const m = bodyText.match(re);
    if (m) return { level: 'soft', pattern: name, text: String(m[0]).slice(0, 120) };
  }
  return null;
}

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

async function threadsLoggedIn(page) {
  await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(7000);
  const st = await page.evaluate(() => ({
    loginPrompt: Array.from(document.querySelectorAll('button, a'))
      .filter(e => /log in/i.test((e.innerText || '').trim()) && (e.innerText || '').trim().length < 45).length,
    profileLinks: Array.from(document.querySelectorAll('a[href]'))
      .filter(a => /^\/@[a-z0-9._]+\/?$/i.test(a.getAttribute('href') || '')).length,
    createBtn: Array.from(document.querySelectorAll('button, a'))
      .some(e => /^create$/i.test((e.innerText || '').trim()) || /create/i.test(e.getAttribute('aria-label') || '')),
    // 2026-10-03: feed chrome is a positive logged-in signal (ported from the
    // 2026-09-27 th-restore.js fix). The old gate (profileLinks only)
    // misclassified a logged-in home feed as logged out because the current
    // threads.com DOM does not reliably expose profile links on the home
    // feed -- the exact false-negative Nolan reported ("it literally always
    // opens logged in and you don't see it").
    feedChrome: /what.s new\?/i.test(document.body.innerText || '') ||
      Array.from(document.querySelectorAll('a[href]')).some(a => /^\/$/.test(a.getAttribute('href') || '') && /for you/i.test((a.innerText || ''))),
  }));
  return st.loginPrompt === 0 && (st.profileLinks > 0 || st.createBtn || st.feedChrome);
}

// (pageHasBad removed 2026-10-03: superseded by pageChallengeMatch above,
// which records WHICH pattern fired per the 17:38 directive.)

// Mark the Like/Unlike/Reply button of the target post with data-th-ctl.
// v3 targeting: find the a[href*="/post/<CODE>"] permalink anchor, climb to the
// card holding the action bar, then the control within. Deterministic; immune
// to unicode/curly-quote marker mismatches. Falls back to the v2
// marker-substring match when the URL has no post code.
// Returns for kind='like': 'like' (unliked, safe to click), 'unlike' (already
// liked, must skip), null (not found). For kind='reply': true/false.
async function markControl(page, a, kind) {
  return await page.evaluate(({ url, marker, kind }) => {
    document.querySelectorAll('[data-th-ctl]').forEach(e => e.removeAttribute('data-th-ctl'));
    const want = kind === 'like' ? /^(Like|Unlike)$/ : /^Reply$/;
    const pickBtn = (scope) => Array.from(scope.querySelectorAll('div[role="button"]')).find(d => {
      const t = d.querySelector('svg title');
      const r = d.getBoundingClientRect();
      return t && want.test(t.textContent.trim()) && r.width > 0 && r.height > 0;
    });
    const noHit = kind === 'like' ? null : false;
    const code = (String(url).match(/\/post\/([A-Za-z0-9_-]+)/) || [])[1];
    if (code) {
      const link = Array.from(document.querySelectorAll('a[href]'))
        .find(x => (x.getAttribute('href') || '').includes('/post/' + code));
      if (link) {
        let card = link;
        for (let i = 0; i < 14 && card && card !== document.body; i++) {
          const has = Array.from(card.querySelectorAll('div[role="button"]')).some(d => {
            const t = d.querySelector('svg title');
            return t && /^(Like|Unlike|Reply)$/.test(t.textContent.trim());
          });
          if (has) break;
          card = card.parentElement;
        }
        if (card && card !== document.body) {
          const btn = pickBtn(card);
          if (btn) {
            btn.setAttribute('data-th-ctl', '1');
            if (kind === 'like') {
              const t = btn.querySelector('svg title');
              return t && t.textContent.trim() === 'Unlike' ? 'unlike' : 'like';
            }
            return true;
          }
        }
      }
    }
    // Fallback: v2 marker-substring targeting.
    if (!marker) return noHit;
    const btns = Array.from(document.querySelectorAll('div[role="button"]')).filter(d => {
      const t = d.querySelector('svg title');
      const r = d.getBoundingClientRect();
      return t && want.test(t.textContent.trim()) && r.width > 0 && r.height > 0;
    });
    for (const btn of btns) {
      let c = btn;
      for (let i = 0; i < 12 && c && c !== document.body; i++) {
        if ((c.innerText || '').includes(marker)) {
          btn.setAttribute('data-th-ctl', '1');
          if (kind === 'like') {
            const t = btn.querySelector('svg title');
            return t && t.textContent.trim() === 'Unlike' ? 'unlike' : 'like';
          }
          return true;
        }
        c = c.parentElement;
      }
    }
    return noHit;
  }, { url: a.url, marker: a.marker, kind });
}

// Full outerHTML of the marked control's svg (for liked-state comparison).
async function markedSvgHtml(page) {
  return await page.evaluate(() => {
    const btn = document.querySelector('[data-th-ctl="1"]');
    const svg = btn && btn.querySelector('svg');
    return {
      svg: svg ? svg.outerHTML : '',
      count: btn ? (btn.innerText || '').trim().slice(0, 12) : '',
    };
  });
}

async function doLike(page, a) {
  await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(6000, 9000)); // view the post fully before engaging
  const preLike = await pageChallengeMatch(page);
  if (preLike) {
    if (preLike.level === 'hard')
      return { outcome: 'abort', note: 'HARD challenge pre-action [' + preLike.pattern + ']: "' + preLike.text + '"', challenge: preLike };
    return { outcome: 'softskip', note: 'SOFT challenge pre-action [' + preLike.pattern + ']: "' + preLike.text + '" — post skipped, pass continues', challenge: preLike, pattern: preLike.pattern };
  }
  const likeState = await markControl(page, a, 'like');
  if (!likeState)
    return { outcome: 'failed', note: 'like control for target post not found (code-anchor + marker fallback)' };
  // Already-liked detection (v3, live-verified 2026-09-20 17:0x MDT): svg title
  // "Unlike" means the signed-in account already liked the post. Skip rather
  // than risk an unlike toggle.
  if (likeState === 'unlike') {
    return { outcome: 'already', note: 'post already liked by the account (control reads Unlike); click skipped to avoid toggling' };
  }
  const before = await markedSvgHtml(page);
  try {
    await page.locator('[data-th-ctl="1"]').click({ timeout: 15000 });
  } catch (e) {
    return { outcome: 'failed', note: 'like click failed actionability: ' + String(e.message || e).slice(0, 120) };
  }
  await sleep(4000);
  const after = await markedSvgHtml(page);
  const postLike = await pageChallengeMatch(page);
  if (postLike) return { outcome: 'abort', note: 'challenge post-action (level=' + postLike.level + ') [' + postLike.pattern + ']: "' + postLike.text + '"', challenge: postLike };
  const changed = after.svg !== before.svg;
  const countChanged = after.count !== before.count;
  return {
    outcome: (changed || countChanged) ? 'ok' : 'sent',
    note: changed ? 'like registered (control svg state changed)'
      : countChanged ? 'like registered (count ' + before.count + ' -> ' + after.count + ')'
      : 'click sent to like control, no state change observed, no challenge',
  };
}

async function doComment(page, a) {
  await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(6000, 9000)); // view the post fully before engaging
  const preComment = await pageChallengeMatch(page);
  if (preComment) {
    if (preComment.level === 'hard')
      return { outcome: 'abort', note: 'HARD challenge pre-action [' + preComment.pattern + ']: "' + preComment.text + '"', challenge: preComment };
    return { outcome: 'softskip', note: 'SOFT challenge pre-action [' + preComment.pattern + ']: "' + preComment.text + '" — post skipped, pass continues', challenge: preComment, pattern: preComment.pattern };
  }
  if (!await markControl(page, a, 'reply'))
    return { outcome: 'failed', note: 'reply control for target post not found' };
  try {
    await page.locator('[data-th-ctl="1"]').click({ timeout: 15000 });
  } catch (e) {
    return { outcome: 'failed', note: 'reply click failed actionability: ' + String(e.message || e).slice(0, 120) };
  }
  // Live-grounded 2026-09-20: clicking Reply opens the thread view (same URL,
  // page shows "Thread ... Reply to <author>") with a div[role="textbox"]
  // reply composer. No dialog.
  let composer = false;
  try {
    await page.waitForFunction(() => {
      const t = document.querySelector('div[role="textbox"]');
      return t && t.getBoundingClientRect().width > 0;
    }, { timeout: 15000 });
    composer = true;
  } catch (_) { /* fall through */ }
  if (!composer) return { outcome: 'failed', note: 'reply thread view did not show a composer textbox; nothing published' };
  await page.evaluate(() => {
    document.querySelectorAll('[data-th-ctl]').forEach(e => e.removeAttribute('data-th-ctl'));
  });
  try {
    await page.locator('div[role="textbox"]').first().click({ timeout: 10000 });
  } catch (e) {
    return { outcome: 'failed', note: 'composer textbox not clickable; nothing published' };
  }
  await sleep(1200);
  await page.keyboard.type(a.text, { delay: rand(40, 110) });
  await sleep(1500);
  // Mark the Post button near the composer, then click it via locator.
  const postMarked = await page.evaluate(() => {
    const box = document.querySelector('div[role="textbox"]');
    let scope = box;
    for (let i = 0; i < 10 && scope && scope !== document.body; i++) {
      scope = scope.parentElement;
      const btn = Array.from(scope.querySelectorAll('button, div[role="button"]'))
        .find(b => /^post$/i.test((b.innerText || '').trim()) && b.getBoundingClientRect().width > 0);
      if (btn) { btn.setAttribute('data-th-ctl', '1'); return true; }
    }
    return false;
  });
  if (!postMarked) {
    await page.keyboard.press('Escape');
    return { outcome: 'failed', note: 'composer has text but no Post button found; composer closed, nothing published' };
  }
  try {
    await page.locator('[data-th-ctl="1"]').click({ timeout: 15000 });
  } catch (e) {
    await page.keyboard.press('Escape');
    return { outcome: 'failed', note: 'Post button not clickable; composer closed, nothing published' };
  }
  await sleep(5000);
  const postComment = await pageChallengeMatch(page);
  if (postComment) return { outcome: 'abort', note: 'challenge post-action (level=' + postComment.level + ') [' + postComment.pattern + ']: "' + postComment.text + '"', challenge: postComment };
  const visible = await page.evaluate((t) => (document.body.innerText || '').includes(t.slice(0, 30)), a.text).catch(() => false);
  return { outcome: visible ? 'ok' : 'sent',
           note: visible ? 'comment posted and visible on page' : 'Post clicked, no challenge; comment not confirmed visible' };
}

(async () => {
  const jobPath = process.argv[2];
  if (!jobPath) { console.log(JSON.stringify({ ok: false, note: 'usage: th-engage.js <job.json>' })); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const resPath = jobPath + '.result.json';
  // Owner-hold sentinel (2026-10-02, owner-hold authority repair): the
  // dispatcher writes <jobPath>.hold.json = {"held":false,...} at dispatch;
  // enforce-hold pushes {"held":true} when a hold lands mid-pass. Checked
  // before EVERY external action; missing/unreadable/invalid fails closed
  // (the worker never acts blind). Canonical source: pig-fb/engage.js.
  function ownerHoldState() {
    try {
      const s = JSON.parse(fs.readFileSync(jobPath + '.hold.json', 'utf8'));
      if (s && s.held === false) return { held: false };
      if (s && s.held === true) return { held: true, reason: String(s.reason || 'owner hold') };
      return { held: true, reason: 'sentinel invalid (fail closed)' };
    } catch (e) {
      return { held: true, reason: 'sentinel unreadable (fail closed)' };
    }
  }
  const out = { ok: true, pass: 'threads-engage', started: new Date().toISOString(), actions: [] };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, infra: 'cdp_unavailable' })); process.exit(3); }
  const ctx = browser.contexts()[0];
  // Worker-owned separate window (see openWorkerWindow). Nolan's own tabs and
  // window are never touched: the worker drives its window and closes it.
  const win = await openWorkerWindow(browser, ctx, 'threads');
  const page = win.page;
  try {
    if (!await threadsLoggedIn(page)) {
      out.ok = false; out.infra = 'logged_out';
      fs.writeFileSync(resPath, JSON.stringify(out, null, 1));
      console.log(JSON.stringify(out)); process.exit(4);
    }
    const minD = (job.minDelaySec || 60), maxD = (job.maxDelaySec || 120);
    // Distinct post URLs soft-skipped this pass (2026-10-03 ~17:38): 3+
    // distinct soft-skips escalate to abort, treated as account-wide.
    const softSkippedUrls = new Set();
    let i = 0;
    for (const a of job.actions) {
      i++;
      // Owner-hold re-check (2026-10-02): a hold landing mid-pass stops the
      // worker before the next external action. Zero new effects from here.
      const hs = ownerHoldState();
      if (hs.held) {
        out.ok = false;
        out.aborted = 'owner hold in force; stopping pass: ' + hs.reason;
        out.actions.push({ account: a.account, url: a.url, action: a.type, ok: false, outcome: 'aborted', note: out.aborted });
        break;
      }
      // Post quarantine (2026-10-03 ~17:38): a URL soft-skipped 3 times is
      // quarantined 24h — skip it without loading the page so it never burns
      // an action slot (or aborts the pass) again until the quarantine lapses.
      const qc = quarantineCheck(a.url);
      if (qc.quarantined) {
        out.actions.push({ account: a.account, url: a.url, action: a.type, ok: false,
                           outcome: 'quarantined',
                           note: 'URL quarantined until ' + qc.until + '; skipped without loading' });
        if (i < job.actions.length) await sleep(rand(minD, maxD) * 1000);
        continue;
      }
      let r;
      try {
        r = a.type === 'like' ? await doLike(page, a)
          : a.type === 'comment' ? await doComment(page, a)
          : { outcome: 'failed', note: 'unknown action type ' + a.type };
      } catch (e) { r = { outcome: 'failed', note: 'exception: ' + String(e.message || e).slice(0, 160) }; }
      out.actions.push({ account: a.account, url: a.url, action: a.type,
                         ok: r.outcome === 'ok' || r.outcome === 'already',
                         outcome: r.outcome, note: r.note,
                         challenge: r.challenge || null, pattern: r.pattern || null });
      if (r.outcome === 'abort') { out.ok = false; out.aborted = r.note + '; remaining actions skipped'; break; }
      if (r.outcome === 'softskip') {
        if (a.url) softSkippedUrls.add(a.url);
        quarantineNoteSoftSkip(a.url, r.pattern);
        if (softSkippedUrls.size >= 3) {
          out.ok = false;
          out.aborted = 'account-wide soft challenge: ' + softSkippedUrls.size +
            ' distinct posts soft-skipped this pass (' + [...softSkippedUrls].join(', ') +
            '); remaining actions skipped';
          break;
        }
      }
      if (i < job.actions.length) await sleep(rand(minD, maxD) * 1000);
    }
  } catch (e) {
    out.ok = false; out.error = String(e.message || e).slice(0, 250);
  }
  try { await win.close(); } catch (_) {} // close our window, never the browser
  out.finished = new Date().toISOString();
  fs.writeFileSync(resPath, JSON.stringify(out, null, 1));
  const landed = out.actions.filter(x => x.ok).length;
  console.log(JSON.stringify({ ok: out.ok, actions: out.actions.length, landed, aborted: !!out.aborted }));
  process.exit(out.ok ? 0 : (out.aborted ? 6 : 5));
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
