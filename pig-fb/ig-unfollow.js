#!/usr/bin/env node
// Pigi Instagram unfollow worker (runs on the Pig, Nolan's workstation).
// Attaches via CDP to the always-on headed Chrome (ig-profile, :9226) that
// holds Nolan's Instagram login. Never launches or closes the browser and
// never attempts a login.
//
// Nolan's directive (2026-09-14): unfollow literally everyone he follows.
// There is no page-vs-person distinction on Instagram: every row in the
// Following list is a candidate. "Suggested for you" rows are never touched.
//
// Strategy: open https://www.instagram.com/nolanpigi/following/, scroll the
// dialog, enumerate rows (username + profile URL), then for each row click
// its exact-text "Following" button and confirm "Unfollow" in the dialog.
// Success is verified by the row button flipping to "Follow"/"Follow Back".
//
// Usage: node ig-unfollow.js <job.json>
// job.json: { "mode": "enumerate"|"unfollow", "max": 80,
//             "minDelaySec": 45, "maxDelaySec": 75,
//             "canary_required": false }
// Canary (2026-09-17, automation-resilience program): job.canary_required=true
// or env CANARY_REQUIRED=1 (a general flag any browser driver can adopt) runs
// the first queue entry as a verified canary: exactly one unfollow, verify
// the button flip, and only continue the batch on success. A failed canary
// halts the run before any further unfollows. The canary counts toward max.
// Writes <job.json>.result.json and prints a one-line summary.
// Exit codes: 0 ok, 2 usage, 3 CDP unavailable, 4 logged out (login gate),
// 5 worker error or canary failure. Must process.exit(0) on success or node lingers on CDP.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const CDP = 'http://localhost:9226';
const LIST_URL = 'https://www.instagram.com/nolanpigi/following/';
// Non-profile path segments on instagram.com; anything else shaped
// /<segment>/ is treated as a profile link.
const NON_PROFILE = /^(explore|reels|direct|accounts|stories|p|reel|tv|nolanpigi)$/i;
const WARN_RE = /action blocked|try again later|we restrict certain activity|we limit how often|temporarily blocked|suspicious login|checkpoint|verify your identity|verify it's you|something went wrong|unusual activity|confirm your identity|we suspect automated behaviour/i;

async function loginState(page) {
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const st = await page.evaluate(() => ({
    userField: !!document.querySelector('input[name="username"]'),
    homeNav: !!document.querySelector('[aria-label="Home"]'),
  })).catch(() => ({ userField: true, homeNav: false }));
  return !st.userField && st.homeNav;
}

async function pageWarning(page) {
  const body = await page.evaluate(() => document.body.innerText.slice(0, 20000)).catch(() => '');
  if (/log in/i.test(body.slice(0, 500)) && /password/i.test(body.slice(0, 500)) && !/home/i.test(body.slice(0, 200))) {
    return 'login page (session dropped)';
  }
  const m = body.match(WARN_RE);
  return m ? m[0] : null;
}

// Instagram no longer opens the following-list dialog on direct navigation to
// /<user>/following/ (observed 2026-09-19: the profile renders, dialogCount 0).
// Fall back to clicking the "following" link on the profile page.
async function openFollowingDialog(page) {
  const hasDialog = () => page.evaluate(() => !!document.querySelector('div[role="dialog"]')).catch(() => false);
  if (await hasDialog()) return 'direct';
  const clicked = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[role="link"], a[href]'));
    // Profile header counts render as <a href="#"> with a JS handler; match the
    // "N following" count link by text, not href.
    const t = links.find(a => /^\s*[\d,]+\s+following\s*$/i.test((a.innerText || '')));
    if (t) { t.click(); return true; }
    return false;
  }).catch(() => false);
  if (!clicked) return 'no-link';
  for (let i = 0; i < 12; i++) {
    await sleep(1500);
    if (await hasDialog()) return 'clicked';
  }
  return 'no-dialog-after-click';
}

// Scroll the following-list dialog until stable or maxScrolls reached.
async function scrollList(page, maxScrolls) {
  await page.evaluate(() => {
    window.__igScroll = () => {
      const dlg = document.querySelector('div[role="dialog"]');
      if (!dlg) return -1;
      const scroller = Array.from(dlg.querySelectorAll('div'))
        .find(d => d.scrollHeight > d.clientHeight + 40);
      if (!scroller) return -1;
      scroller.scrollTo(0, scroller.scrollHeight);
      return scroller.scrollHeight;
    };
  }).catch(() => {});
  let stable = 0, lastH = 0;
  for (let i = 0; i < (maxScrolls || 120); i++) {
    const h = await page.evaluate(() => window.__igScroll()).catch(() => -1);
    await sleep(rand(1500, 2600));
    if (h < 0 || h === lastH) { stable++; if (stable >= 5) break; } else stable = 0;
    lastH = h;
  }
}

// Collect following rows: [{username, url}]. Scoped to the list dialog;
// "Suggested for you" rows carry Follow (not Following) buttons and are
// excluded from unfollow candidacy by the exact-text button match, but they
// are still listed here so the caller can see the raw enumeration.
async function enumerateFollowing(page) {
  return await page.evaluate((nonProfileSrc) => {
    const NON_PROFILE = new RegExp(nonProfileSrc);
    const dlg = document.querySelector('div[role="dialog"]');
    if (!dlg) return { entries: [], error: 'no dialog found' };
    const links = Array.from(dlg.querySelectorAll('a[href]'));
    const seen = new Set(), entries = [];
    for (const a of links) {
      const m = (a.getAttribute('href') || '').match(/^\/([A-Za-z0-9._]+)\/?$/);
      if (!m || NON_PROFILE.test(m[1])) continue;
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      entries.push({ username: m[1], url: 'https://www.instagram.com/' + m[1] + '/' });
    }
    return { entries };
  }, NON_PROFILE.source).catch(e => ({ entries: [], error: String(e).slice(0, 200) }));
}

// Click the exact-text "Following" button for a row, confirm "Unfollow",
// verify the flip. Returns {ok, note, warning?}.
async function unfollowUser(page, username) {
  // Re-query the row every time: the DOM shifts as rows are processed.
  const clickedFollowing = await page.evaluate((username) => {
    const dlg = document.querySelector('div[role="dialog"]');
    if (!dlg) return 'no-dialog';
    const btns = Array.from(dlg.querySelectorAll('div[role="button"], button'))
      .filter(b => (b.innerText || '').trim() === 'Following')
      .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    for (const b of btns) {
      let el = b, row = null;
      for (let d = 0; d < 8 && el && el !== dlg; d++) {
        el = el.parentElement;
        const t = (el.innerText || '');
        if (t.includes(username)) { row = el; break; }
      }
      if (!row) continue;
      b.scrollIntoView({ block: 'center' });
      b.click();
      return 'clicked';
    }
    return 'button-not-found';
  }, username).catch(() => 'eval-error');
  if (clickedFollowing !== 'clicked') {
    return { ok: false, note: 'following button not found for @' + username + ' (' + clickedFollowing + ')' };
  }
  await sleep(rand(2500, 4000));
  let warn = await pageWarning(page);
  if (warn) return { ok: false, note: 'warning after opening unfollow menu', warning: warn };

  const confirmed = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
    for (const dlg of dialogs) {
      const cands = Array.from(dlg.querySelectorAll('button, div[role="button"]'))
        .filter(e => {
          const r = e.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return false;
          return (e.innerText || '').trim() === 'Unfollow';
        });
      if (cands.length) { cands[0].click(); return 'confirmed'; }
    }
    return 'no-confirm-button';
  }).catch(() => 'eval-error');
  if (confirmed !== 'confirmed') {
    // Dismiss any open menu with Escape so the next row is clickable.
    await page.keyboard.press('Escape').catch(() => {});
    return { ok: false, note: 'no Unfollow confirm button appeared (' + confirmed + ')' };
  }
  await sleep(rand(2500, 4000));
  warn = await pageWarning(page);
  if (warn) return { ok: false, note: 'warning after confirm', warning: warn };

  const flipped = await page.evaluate((username) => {
    const dlg = document.querySelector('div[role="dialog"]');
    if (!dlg) return false;
    const btns = Array.from(dlg.querySelectorAll('div[role="button"], button'))
      .filter(b => /^(Following|Follow|Follow Back)$/.test((b.innerText || '').trim()))
      .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    for (const b of btns) {
      let el = b;
      for (let d = 0; d < 8 && el && el !== dlg; d++) {
        el = el.parentElement;
        if ((el.innerText || '').includes(username)) {
          return /^(Follow|Follow Back)$/.test((b.innerText || '').trim());
        }
      }
    }
    return 'row-gone';
  }, username).catch(() => 'eval-error');
  if (flipped === true || flipped === 'row-gone') {
    return { ok: true, note: 'unfollowed @' + username + (flipped === 'row-gone' ? ' (row left list)' : ' (button flipped)') };
  }
  return { ok: false, note: 'button did not flip after confirm for @' + username };
}

(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node ig-unfollow.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const mode = job.mode || 'enumerate';
  // Owner-hold sentinel (2026-10-02, owner-hold authority repair): the
  // dispatcher writes <jobFile>.hold.json = {"held":false,...} at dispatch;
  // enforce-hold pushes {"held":true} when a hold lands mid-pass. Checked
  // before EVERY external action; missing/unreadable/invalid fails closed
  // (the worker never acts blind). Canonical source: pig-fb/engage.js.
  function ownerHoldState() {
    try {
      const s = JSON.parse(fs.readFileSync(jobFile + '.hold.json', 'utf8'));
      if (s && s.held === false) return { held: false };
      if (s && s.held === true) return { held: true, reason: String(s.reason || 'owner hold') };
      return { held: true, reason: 'sentinel invalid (fail closed)' };
    } catch (e) {
      return { held: true, reason: 'sentinel unreadable (fail closed)' };
    }
  }
  const write = (out) => fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP, { timeout: 30000 });
  } catch (e) {
    write({ ok: false, infra: 'cdp_unavailable', note: 'CDP attach failed: ' + String(e.message || e).slice(0, 150) });
    console.log('RESULT cdp_unavailable');
    process.exit(3);
  }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    if (!(await loginState(page))) {
      write({ ok: false, logged_in: false, note: 'Instagram session logged out in the ig-profile browser; Nolan must log in again in that window' });
      console.log('RESULT logged_out');
      await page.close().catch(() => {});
      process.exit(4);
    }
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);
    let warn = await pageWarning(page);
    if (warn) {
      write({ ok: false, logged_in: /login page/.test(warn), note: 'warning on list load', warning: warn });
      console.log('RESULT warning_on_load');
      await page.close().catch(() => {});
      process.exit(5);
    }
    const dlgState = await openFollowingDialog(page);
    if (dlgState !== 'direct' && dlgState !== 'clicked') {
      write({ ok: false, note: 'following dialog did not open (' + dlgState + '); surface may have drifted' });
      console.log('RESULT no_following_dialog');
      await page.close().catch(() => {});
      process.exit(5);
    }
    await scrollList(page, 150);
    const enumRes = await enumerateFollowing(page);
    const entries = enumRes.entries || [];

    if (mode === 'enumerate') {
      const out = { ok: true, mode, listUrl: LIST_URL, totalEntries: entries.length, entries, enumError: enumRes.error || null };
      write(out);
      console.log('RESULT enumerate total=' + entries.length);
      await page.close().catch(() => {});
      process.exit(0);
    }

    // unfollow mode
    const max = job.max || 80;
    const minD = (job.minDelaySec || 45) * 1000, maxD = (job.maxDelaySec || 75) * 1000;
    const exclude = new Set(job.excludeUsernames || []);
    const queue = entries.filter(e => !exclude.has(e.username)).slice(0, max);
    const results = [];
    let done = 0, failed = 0, stopped = null;
    const canaryRequired = job.canary_required === true || process.env.CANARY_REQUIRED === '1';
    let canaryVerified = !canaryRequired;
    // Honest reporting (2026-09-19): an empty queue means no canary ACTION ran.
    // Never report canary_verified:true when nothing was actually verified.
    let canarySkipped = canaryRequired && queue.length === 0;
    async function unfollowOne(entry, isCanary) {
      // Owner-hold re-check (2026-10-02): a hold landing mid-batch stops the
      // worker before the next external action. Zero new effects from here.
      const hs = ownerHoldState();
      if (hs.held) { stopped = 'owner hold in force: ' + hs.reason; return; }
      if (done > 0) await sleep(rand(minD, maxD));
      let r;
      try {
        r = await unfollowUser(page, entry.username);
        if (r.ok) { done++; failed = 0; }
        else if (!r.warning) { failed++; }
      } catch (e) { r = { ok: false, note: 'exception: ' + String(e.message || e).slice(0, 200) }; failed++; }
      if (isCanary) r.canary = true;
      results.push({ username: entry.username, url: entry.url, ...r });
      if (r.warning) stopped = 'warning: ' + r.warning;
      else if (failed >= 3) stopped = '3 consecutive failures; stopping';
      return r;
    }
    let startIdx = 0;
    if (canaryRequired && queue.length > 0) {
      const cr = await unfollowOne(queue[0], true);
      if (!cr.ok) {
        stopped = 'canary action failed; batch halted';
        const out = {
          ok: false, mode, canary: true, canary_required: true, canary_verified: false,
          listUrl: LIST_URL, enumerated: entries.length, queued: queue.length,
          attempted: results.length, unfollowed: done, stopped,
          unfollowedUsernames: [], results,
        };
        write(out);
        console.log('RESULT canary_failed');
        await page.close().catch(() => {});
        process.exit(5);
      }
      canaryVerified = true;
      startIdx = 1;
    }
    for (let k = startIdx; k < queue.length && !stopped; k++) {
      await unfollowOne(queue[k], false);
      if (done >= max) break;
    }
    const out = {
      ok: true, mode, listUrl: LIST_URL,
      canary_required: canaryRequired, canary_verified: canaryVerified, canary_skipped_empty_queue: canarySkipped,
      enumerated: entries.length, queued: queue.length,
      attempted: results.length, unfollowed: done, stopped,
      unfollowedUsernames: results.filter(r => r.ok).map(r => r.username),
      results,
    };
    write(out);
    console.log('RESULT unfollow unfollowed=' + done + ' attempted=' + results.length + (stopped ? ' stopped=' + stopped : ''));
    await page.close().catch(() => {});
    process.exit(0);
  } catch (e) {
    write({ ok: false, note: 'worker exception: ' + String(e.message || e).slice(0, 300) });
    console.log('RESULT worker_exception');
    process.exit(5);
  }
})();
