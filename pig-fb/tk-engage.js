#!/usr/bin/env node
// Pigi TikTok engagement worker (runs on the Pig, Nolan's workstation).
// Attaches via CDP to the always-on headed Chrome (tt-profile, :9227) that holds
// Nolan's TikTok login (@ngeske).
// That browser must stay running; the session does not survive restarts, so this
// script never launches or closes it. Never attempts a login.
// Usage: node tk-engage.js <job.json>
// job.json: { "actions": [ {type:"like"|"comment", url, text?} ], "minDelaySec": 60, "maxDelaySec": 120 }
// Writes <job.json>.result.json and prints a one-line summary. Never prints credentials.
// Exit codes: 0 ok, 2 usage, 3 CDP unavailable, 4 logged out (login gate), 5 worker error, 6 fatal.
//
// Selector grounding (live-verified 2026-09-15 against the current TikTok web
// layout): the like control is a div[role="button"][data-e2e="like-icon"] with
// aria-pressed true/false carried on the div itself (TikTok moved it off the
// <button> element in a layout change; the old button[aria-label^="Like video"]
// selector matches nothing since ~2026-09-15). The comment opener is
// div[role="button"][data-e2e="comment-icon"]. On a direct /video/<id> page the
// target video is the first article, so the first VISIBLE matching icon is the
// target video's control; comment input is [data-e2e="comment-input"] /
// [data-e2e="comment-text"] / [role="textbox"][contenteditable="true"];
// submit is [data-e2e="comment-post"].
//
// Evidence design (2026-09-24, P2 lane): every like attempt records a full
// evidence object (element identity, control state before/after, timing,
// response signal) and a deterministic fail_class so failures carry a
// discriminating signature:
//   LIKE_APPLIED / LIKE_APPLIED_LATE / ALREADY_LIKED (ok=true)
//   SELECTOR_NOT_FOUND_ABSENT  - no [data-e2e="like-icon"] in the DOM at all
//   SELECTOR_NOT_FOUND_HIDDEN  - icons exist in DOM but none visible
//                                (degraded UI for this video/session, not a layout change)
//   NO_STATE_CHANGE_UNKNOWN    - click sent, control stable, no restriction signal
//   NO_STATE_CHANGE_REMOUNT    - the clicked control was replaced in the DOM
//                                after the click (hydration/rerender race)
//   NO_STATE_CHANGE_RESTRICTED - a restriction surface matched after the click
//                                (platform restriction signal; pass aborts)
//
// Restriction detection (2026-09-24 fix): the scan covers ONLY page chrome,
// i.e. body children EXCLUDING the video article subtree. TikTok renders
// restriction feedback (toasts, dialogs, banners) as top-level overlays
// outside the article; video captions live INSIDE the article. This is what
// keeps a caption like "you need to slow down" from tripping detection (the
// 2026-09-15 false positive). The matched phrase and a text snippet are
// recorded on every abort so the evidence is auditable.
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const CDP = 'http://localhost:9227';

// ---------- restriction-surface scan (self-contained: serializable into the page) ----------
// Uses the page's `document` global. The same function runs in the browser via
// page.evaluate and in node regression tests against a stub document.
function scanRestrictionChrome() {
  const PHRASES = [
    'checkpoint', 'verify your identity', 'action blocked',
    'temporarily blocked', 'we suspect automated', 'suspicious activity',
    'try again later', 'something went wrong', "you're liking too fast",
    "youre liking too fast", 'slow down', 'captcha', "confirm you're a person",
    'confirm youre a person'
  ];
  const doc = document;
  const article = doc.querySelector('article');
  let text = '';
  const kids = (doc.body && doc.body.children) || [];
  for (const el of kids) {
    // Exclude the video content subtree: captions live here and must never
    // trip restriction detection.
    if (article && (el === article || (el.contains && el.contains(article)))) continue;
    text += '\n' + (el.innerText || '');
  }
  const lower = text.toLowerCase();
  const hits = [];
  for (const alt of PHRASES) {
    const idx = lower.indexOf(alt);
    if (idx >= 0) {
      hits.push({
        phrase: alt,
        snippet: text.slice(Math.max(0, idx - 40), idx + 60).replace(/\s+/g, ' ').trim().slice(0, 140),
      });
    }
  }
  return { matched: hits.length > 0, hits, text_len: text.length };
}

// ---------- like-attempt classifier (pure, node-testable) ----------
function classifyLikeAttempt(ev) {
  if (!ev || typeof ev !== 'object') {
    return { ok: false, fail_class: 'EVIDENCE_MISSING', note: 'no evidence object returned from page probe' };
  }
  if (ev.stage === 'already') {
    return { ok: true, fail_class: 'ALREADY_LIKED', note: 'already liked (aria-pressed=true)' };
  }
  if (ev.stage === 'not_found') {
    if ((ev.icons_total || 0) > 0) {
      return {
        ok: false, fail_class: 'SELECTOR_NOT_FOUND_HIDDEN',
        note: `like icon present in DOM (${ev.icons_total}) but none visible; degraded UI for this video/session, not a layout change`,
      };
    }
    return { ok: false, fail_class: 'SELECTOR_NOT_FOUND_ABSENT', note: 'like button not found (no [data-e2e="like-icon"] in DOM)' };
  }
  const polls = Array.isArray(ev.polls) ? ev.polls : [];
  const flipped = polls.find(p => p.pressed === 'true');
  if (flipped) {
    const late = flipped.at_ms > 2500;
    return {
      ok: true, fail_class: late ? 'LIKE_APPLIED_LATE' : 'LIKE_APPLIED',
      note: `like registered (aria-pressed flipped true at +${flipped.at_ms}ms${late ? '; delayed state propagation' : ''})`,
    };
  }
  const scan = ev.restriction_scan || {};
  const hit = scan.hits && scan.hits[0];
  if (hit) {
    return {
      ok: false, fail_class: 'NO_STATE_CHANGE_RESTRICTED',
      note: `click sent, no aria-pressed=true; restriction surface matched after click: "${hit.phrase}" ("${hit.snippet}"); treated as platform restriction signal`,
    };
  }
  const remounted = polls.some(p => p.present === false);
  if (remounted) {
    return {
      ok: false, fail_class: 'NO_STATE_CHANGE_REMOUNT',
      note: 'click sent, no aria-pressed=true; the clicked control was replaced in the DOM after the click (hydration/rerender race)',
    };
  }
  const countNote = ev.like_count_changed ? 'like-count text changed' : 'like-count text unchanged';
  return {
    ok: false, fail_class: 'NO_STATE_CHANGE_UNKNOWN',
    note: `click sent, no aria-pressed=true observed (pressed stayed ${ev.pressed_before} at +2s/+5s/+10s); control stable, no remount; no restriction surface matched; ${countNote}; cause unknown`,
  };
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// ---------- login gate ----------
async function ttLoggedIn(page) {
  await page.goto('https://www.tiktok.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const st = await page.evaluate(() => ({
    // Guest header shows a prominent "Log in" button.
    topLogin: !!document.querySelector('[data-e2e="top-login-button"]'),
    // Logged-in header shows the Upload entry point. TikTok changes its upload
    // href, so match any upload link or the upload icon, never an exact path.
    upload: !!document.querySelector('a[href*="/upload"], [data-e2e="upload-icon"]'),
    body: (document.body.innerText || '').slice(0, 300),
  }));
  // Fail closed on ambiguity: require a positive session marker.
  return st.upload && !st.topLogin;
}

// ---------- page-side like probe (self-contained: runs inside the page) ----------
// Records element identity, control state before/after, timing, and response
// signal in one round trip. Polls aria-pressed at +2s/+5s/+10s after the click
// so delayed state propagation is distinguished from a click that did
// nothing. The clicked element is tagged with data-ping-probe; if the tag is
// gone at a later poll, the control remounted (rerender race evidence).
function likeProbeInPage() {
  const sleepMs = ms => new Promise(r => setTimeout(r, ms));
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  const icons = Array.from(document.querySelectorAll('[data-e2e="like-icon"]'));
  const visible = icons.filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const article = document.querySelector('article');
  let videoId = null;
  const link = article ? article.querySelector('a[href*="/video/"]') : null;
  if (link && link.href) { const m = link.href.match(/\/video\/(\d+)/); if (m) videoId = m[1]; }
  const ident = btn => {
    const r = btn.getBoundingClientRect();
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      outer_html: (btn.outerHTML || '').slice(0, 400),
    };
  };
  const likeCountText = () => {
    const c = (article || document).querySelector('[data-e2e="like-count"]');
    return c ? (c.innerText || '').trim() : null;
  };
  if (visible.length === 0) {
    return { stage: 'not_found', icons_total: icons.length, icons_hidden: icons.length, video_id: videoId, t_ms: ms() };
  }
  const btn = visible[0];
  const pressedBefore = btn.getAttribute('aria-pressed');
  const ev = {
    stage: 'clicked',
    video_id: videoId,
    icons_visible: visible.length,
    icons_hidden: icons.length - visible.length,
    identity_before: ident(btn),
    pressed_before: pressedBefore,
    like_count_before: likeCountText(),
    t_preread_ms: ms(),
  };
  if (pressedBefore === 'true') {
    ev.stage = 'already';
    ev.t_ms = ms();
    return ev;
  }
  btn.scrollIntoView({ block: 'center' });
  btn.setAttribute('data-ping-probe', '1');
  ev.t_click_ms = ms();
  btn.click();
  const readMarked = () => {
    const marked = document.querySelector('[data-ping-probe="1"]');
    if (!marked) {
      const vis2 = Array.from(document.querySelectorAll('[data-e2e="like-icon"]'))
        .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      return { present: false, remounted_candidate: vis2.length > 0, pressed: vis2.length ? vis2[0].getAttribute('aria-pressed') : null };
    }
    return { present: true, pressed: marked.getAttribute('aria-pressed') };
  };
  ev.polls = [];
  // Cumulative waits of 2s, 5s, 10s after the click.
  const waits = [2000, 3000, 5000];
  let cum = 0;
  const run = async () => {
    for (const w of waits) {
      await sleepMs(w);
      cum += w;
      const r = readMarked();
      ev.polls.push({ at_ms: cum, present: r.present, pressed: r.pressed, remounted_candidate: !!r.remounted_candidate });
      if (r.pressed === 'true') break; // applied; stop polling early
    }
    ev.like_count_after = likeCountText();
    ev.like_count_changed = ev.like_count_before !== ev.like_count_after;
    ev.restriction_scan = scanRestrictionChrome();
    ev.t_ms = ms();
    return ev;
  };
  return run();
}

// ---------- TikTok actions ----------
async function ttLike(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(5000, 8000)); // let the video page hydrate; watch briefly, stay human
  // likeProbeInPage references scanRestrictionChrome as a bare identifier, but it
  // is serialized ALONE into the page, where that identifier is unbound --
  // every like attempt threw ReferenceError and the click evidence was lost
  // (2026-09-28 pass 90). Compose a self-contained page function in Node (no
  // page-side eval, CSP-safe): the scan's source is inlined at the call site.
  // The main-loop post-action scan is unchanged; this preserves the
  // NO_STATE_CHANGE_RESTRICTED vs NO_STATE_CHANGE_UNKNOWN discrimination.
  const probeSrc = likeProbeInPage.toString().replace(
    'ev.restriction_scan = scanRestrictionChrome();',
    'ev.restriction_scan = (' + scanRestrictionChrome.toString() + ')();'
  );
  if (!probeSrc.includes('ev.restriction_scan = (function scanRestrictionChrome')) {
    throw new Error('like-probe composition failed: scan call site not found');
  }
  const evidence = await page.evaluate(new Function('return (' + probeSrc + ')')());
  const cls = classifyLikeAttempt(evidence);
  const result = { ok: cls.ok, fail_class: cls.fail_class, note: cls.note, evidence };
  if (cls.fail_class === 'NO_STATE_CHANGE_RESTRICTED') {
    result.restriction_signal = true;
  }
  return result;
}

async function ttComment(page, url, text) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(5000, 8000));
  const opened = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('[data-e2e="comment-icon"]'))
      .find(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (!btn) return false;
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    return true;
  });
  if (!opened) return { ok: false, fail_class: 'SELECTOR_NOT_FOUND_ABSENT', note: 'comment button not found (comments may be disabled)' };
  await sleep(3000);
  const focused = await page.evaluate(() => {
    const box = document.querySelector('[data-e2e="comment-input"]') ||
      document.querySelector('[data-e2e="comment-text"]') ||
      document.querySelector('[role="textbox"][contenteditable="true"]');
    if (!box) return false;
    box.scrollIntoView({ block: 'center' });
    box.click();
    return true;
  });
  if (!focused) return { ok: false, fail_class: 'SELECTOR_NOT_FOUND_ABSENT', note: 'comment input not found' };
  await sleep(1200);
  await page.keyboard.type(text, { delay: rand(40, 90) });
  await sleep(1500);
  const submitted = await page.evaluate(() => {
    const btn = document.querySelector('[data-e2e="comment-post"]:not([disabled])');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!submitted) return { ok: false, fail_class: 'COMMENT_SUBMIT_DISABLED', note: 'comment submit button not found/disabled' };
  await sleep(6000);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200000)).catch(() => '');
  const seen = bodyText.includes(text.slice(0, 30));
  return { ok: seen, fail_class: seen ? 'COMMENT_APPLIED' : 'COMMENT_NOT_VISIBLE', note: seen ? 'comment text visible' : 'comment text not found after submit' };
}

// ---------- main ----------
async function main() {
  const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node tk-engage.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const results = [];
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP, { timeout: 20000 });
  } catch (e) {
    const out = { ok: false, note: 'CDP attach failed; is the tt-profile Chrome running? ' + String(e.message || e).slice(0, 150), results: [] };
    fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
    console.log('RESULT cdp_unavailable');
    process.exit(3);
  }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    // Login gate: refuse to run logged out. Never attempt a login.
    if (!(await ttLoggedIn(page))) {
      const out = { ok: false, logged_in: false, note: 'TikTok session logged out in the tt-profile browser; Nolan must log in as ngeske again in that window', results: [] };
      fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
      console.log('RESULT logged_out');
      await page.close();
      process.exit(4);
    }
    const minD = (job.minDelaySec || 60) * 1000, maxD = (job.maxDelaySec || 120) * 1000;
    for (let i = 0; i < job.actions.length; i++) {
      const a = job.actions[i];
      const h = hostOf(a.url);
      if (i > 0) await sleep(rand(minD, maxD));
      try {
        let r;
        if (h.includes('tiktok.com')) {
          r = a.type === 'like' ? await ttLike(page, a.url)
            : a.type === 'comment' ? await ttComment(page, a.url, a.text)
            : { ok: false, fail_class: 'UNKNOWN_ACTION', note: 'unknown action type' };
        } else {
          r = { ok: false, fail_class: 'UNSUPPORTED_HOST', note: 'unsupported host: ' + h };
        }
        results.push({ type: a.type, url: a.url, ...r });
      } catch (e) {
        results.push({ type: a.type, url: a.url, ok: false, fail_class: 'WORKER_EXCEPTION', note: 'exception: ' + String(e.message || e).slice(0, 200) });
      }
      // Restriction check after each action: page chrome only (article
      // excluded), so captions cannot false-positive. The matched phrase is
      // recorded; a restriction becomes BLOCKED, never an optimization input.
      const scan = await page.evaluate(scanRestrictionChrome).catch(() => ({ matched: false, hits: [] }));
      if (scan.matched) {
        const hit = scan.hits[0];
        results.push({
          type: 'abort', ok: false, fail_class: 'PASS_ABORT_RESTRICTION',
          matched_phrase: hit.phrase, matched_snippet: hit.snippet,
          note: `possible checkpoint, rate limit, or block detected; stopping pass; matched phrase "${hit.phrase}" in page chrome ("${hit.snippet}")`,
        });
        break;
      }
    }
    await page.close(); // close only our tab, never the browser
  } catch (e) {
    const out = { ok: false, note: 'worker exception: ' + String(e.message || e).slice(0, 300), results };
    fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
    console.log('RESULT worker_error');
    process.exit(5);
  }
  const out = { ok: results.every(r => r.ok || r.type === 'abort'), logged_in: true, results };
  fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
  const done = results.filter(r => r.ok).length;
  console.log(`RESULT ok=${out.ok} actions=${results.length} succeeded=${done}`);
  process.exit(0);
}

if (require.main === module) {
  main().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(6); });
}

// Exported for node regression tests (pure functions only; never the CDP driver).
module.exports = { scanRestrictionChrome, classifyLikeAttempt };
