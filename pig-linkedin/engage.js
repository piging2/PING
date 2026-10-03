#!/usr/bin/env node
// Pigi LinkedIn engagement worker (runs on the Pig, Nolan's workstation).
// Attaches via CDP to the always-on headed Chrome (remote-debugging-port 9224)
// that holds Nolan's LinkedIn login in a DEDICATED profile (li-profile).
// That browser must stay running; the session does not reliably survive
// restarts, so this script never launches or closes it.
// Phase 1 scope: likes and comments ONLY. Connection requests and DMs are
// deliberately unsupported by this worker (see linkedin-automation-plan doc).
// 2026-10-02: Nolan binding order ~14:19 MDT reactivates LinkedIn; params
// revised ~14:22 MDT: 100 connection invites per WEEK (weekly counter, ~14/day
// pace) + 15 likes per pass every 2h. Connection support added below
// (doConnect). DMs remain unsupported.
// Usage: node engage.js <job.json>
// job.json: { "actions": [ {type:"like"|"comment"|"connect", url, text?} ], "minDelaySec": 90, "maxDelaySec": 240 }
//   - "connect": url must be a LinkedIn profile URL (/in/<slug>). text, if
//     present, is sent as the invitation note; otherwise sent without a note.
// Writes <job.json>.result.json and prints a one-line summary. Never prints credentials.
const fs = require('fs');
const { chromium } = require('playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

// LinkedIn restriction / checkpoint language. Any match aborts the pass.
const BLOCK_RE = /checkpoint|verify your identity|unusual activity|temporarily restricted|action blocked|captcha|we've detected|suspicious activity|please verify|account restricted/i;

async function loginState(page) {
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const probe = await page.evaluate(() => {
    const q = s => !!document.querySelector(s);
    const body = document.body.innerText;
    return {
      loginForm: q('#username') || q('[name="session_key"]'),
      // LinkedIn restyled to obfuscated classes (2026-09): data-testid is the stable hook.
      primaryNav: q('[data-testid="primary-nav"]'),
      textFallback: /My Network/.test(body) && /Messaging/.test(body) && /Nolan Geske/.test(body),
      body: body.slice(0, 2000),
    };
  });
  if (BLOCK_RE.test(probe.body)) return { loggedIn: false, blocked: true };
  // Logged in = no login form AND at least one logged-in marker present.
  return { loggedIn: !probe.loginForm && (probe.primaryNav || probe.textFallback), blocked: false };
}

async function doLike(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(5000, 9000)); // slower than FB: LinkedIn watches velocity harder
  const pre = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  if (BLOCK_RE.test(pre)) return { ok: false, blocked: true, note: 'restriction/checkpoint language on page' };
  // Already liked? aria-pressed=true on the like trigger, or label flips toward Unlike.
  // (Detail pages label it "React Like"; feed cards use "Like".)
  const already = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[aria-label]'))
      .filter(b => /\blike\b/i.test(b.getAttribute('aria-label') || ''));
    return btns.some(b => b.getAttribute('aria-pressed') === 'true');
  });
  if (already) return { ok: true, note: 'already liked' };
  const clicked = await page.evaluate(() => {
    const vis = Array.from(document.querySelectorAll('button[aria-label]'))
      .filter(b => {
        const l = b.getAttribute('aria-label') || '';
        if (!/\blike\b/i.test(l) || /unlike/i.test(l)) return false;
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    if (!vis.length) return { found: false };
    vis[0].scrollIntoView({ block: 'center' });
    return { found: true };
  });
  if (!clicked.found) return { ok: false, note: 'like button not found' };
  await sleep(rand(1200, 2500));
  const changed = await page.evaluate(() => {
    const vis = Array.from(document.querySelectorAll('button[aria-label]'))
      .filter(b => {
        const l = b.getAttribute('aria-label') || '';
        if (!/\blike\b/i.test(l) || /unlike/i.test(l)) return false;
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    if (!vis.length) return { ok: false, note: 'like button vanished after scroll' };
    vis[0].click(); // DOM click: Playwright actionability checks time out on LI buttons
    return { ok: true };
  });
  if (!changed.ok) return changed;
  await sleep(5000);
  const verified = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[aria-label]'))
      .filter(b => /\blike\b/i.test(b.getAttribute('aria-label') || ''));
    return btns.some(b => b.getAttribute('aria-pressed') === 'true');
  });
  return { ok: verified, note: verified ? 'like registered (aria-pressed=true)' : 'click sent, no state change observed' };
}

async function doComment(page, url, text) {
  if (!text || text.length < 4) return { ok: false, note: 'comment text missing or too short' };
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(5000, 9000));
  const pre = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  if (BLOCK_RE.test(pre)) return { ok: false, blocked: true, note: 'restriction/checkpoint language on page' };
  // Open the comment composer for the main post.
  const opened = await page.evaluate(() => {
    const vis = Array.from(document.querySelectorAll('button[aria-label]'))
      .filter(b => {
        const l = b.getAttribute('aria-label') || '';
        if (!/^comment\b/i.test(l)) return false;
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    if (!vis.length) return false;
    vis[0].scrollIntoView({ block: 'center' });
    vis[0].click();
    return true;
  });
  if (!opened) return { ok: false, note: 'comment button not found' };
  await sleep(rand(2000, 3500));
  const editor = await page.$('div[aria-label="Text editor for creating content"][contenteditable="true"]');
  if (!editor) return { ok: false, note: 'comment editor not found' };
  await editor.click({ timeout: 15000 }).catch(() => {});
  await sleep(1200);
  // Human-like typing, slower than FB: LinkedIn fingerprints input cadence.
  await page.keyboard.type(text, { delay: rand(60, 140) });
  await sleep(rand(2000, 4000));
  const submitted = await page.evaluate(() => {
    const btn = document.querySelector('button.comments-comment-box__submit-button--cr');
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  });
  if (!submitted) return { ok: false, note: 'comment submit button not clickable' };
  await sleep(6000);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200000)).catch(() => '');
  if (BLOCK_RE.test(bodyText.slice(0, 3000))) return { ok: false, blocked: true, note: 'restriction language after submit' };
  const posted = bodyText.includes(text.slice(0, 30));
  return { ok: posted, note: posted ? 'comment text visible' : 'comment text not found after submit' };
}

// Weekly invitation limit language. Hitting this is NOT an account
// restriction; the pass must stop sending invites gracefully (no abort).
const LIMIT_RE = /weekly invitation limit|you've reached.*invitation|invitation.*limit reached/i;

async function doConnect(page, url, noteText) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(6000, 10000)); // connections are the highest-risk action: go slow
  const pre = await page.evaluate(() => document.body.innerText.slice(0, 5000));
  if (BLOCK_RE.test(pre)) return { ok: false, blocked: true, note: 'restriction/checkpoint language on profile page' };
  if (LIMIT_RE.test(pre)) return { ok: false, limit: true, note: 'weekly invitation limit reached; stopping invites for this pass' };
  const state = await page.evaluate(() => {
    const body = document.body.innerText;
    const btns = Array.from(document.querySelectorAll('button'));
    const vis = b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const label = b => ((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).trim();
    // Already connected / invite pending?
    const pending = btns.find(b => vis(b) && /invitation pending|^pending$/i.test(label(b)));
    if (pending) return { kind: 'pending' };
    const msg = btns.find(b => vis(b) && /^message$/i.test((b.innerText || '').trim()));
    const connectBtn = btns.find(b => vis(b) && /invite .* to connect/i.test(b.getAttribute('aria-label') || ''));
    if (msg && !connectBtn) return { kind: 'connected' }; // Message present, no Connect: 1st-degree
    if (connectBtn) return { kind: 'connect' };
    // Fallback: a bare "Connect" text button (some locales/layouts).
    const bare = btns.find(b => vis(b) && /^connect$/i.test((b.innerText || '').trim()));
    if (bare) return { kind: 'connect' };
    return { kind: 'none', body: body.slice(0, 500) };
  });
  if (state.kind === 'pending') return { ok: true, note: 'invitation already pending' };
  if (state.kind === 'connected') return { ok: true, note: 'already connected (1st-degree)' };
  if (state.kind !== 'connect') return { ok: false, note: 'connect button not found; not clicking blindly' };
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const vis = b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const t = btns.find(b => vis(b) && /invite .* to connect/i.test(b.getAttribute('aria-label') || ''))
           || btns.find(b => vis(b) && /^connect$/i.test((b.innerText || '').trim()));
    if (!t) return false;
    t.scrollIntoView({ block: 'center' });
    t.click();
    return true;
  });
  if (!clicked) return { ok: false, note: 'connect button vanished before click' };
  await sleep(rand(2500, 4000));
  // Invitation modal: either send directly or add a note first.
  const modal = await page.evaluate((withNote) => {
    const dlg = document.querySelector('div[role="dialog"]');
    if (!dlg) return { open: false };
    const btns = Array.from(dlg.querySelectorAll('button'));
    const byText = t => btns.find(b => new RegExp('^' + t + '$', 'i').test((b.innerText || '').trim()));
    if (withNote) {
      const addNote = byText('Add a note');
      if (addNote) { addNote.click(); return { open: true, noteClicked: true }; }
    }
    return { open: true, noteClicked: false };
  }, !!noteText);
  if (!modal.open) {
    // No modal: LinkedIn sometimes sends immediately. Verify pending state.
    await sleep(3000);
    const nowPending = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const vis = b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return btns.some(b => vis(b) && /invitation pending|^pending$/i.test(((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).trim()));
    });
    return { ok: nowPending, note: nowPending ? 'invite sent (no modal), now pending' : 'no modal appeared and no pending state; invite uncertain' };
  }
  if (modal.noteClicked) {
    await sleep(rand(1500, 2500));
    const noteBox = await page.$('div[role="dialog"] textarea, div[role="dialog"] div[contenteditable="true"]');
    if (!noteBox) return { ok: false, note: 'note field not found after Add a note; aborting invite' };
    const tag = await noteBox.evaluate(e => e.tagName.toLowerCase());
    if (tag === 'textarea') await noteBox.fill(noteText.slice(0, 300));
    else { await noteBox.click(); await page.keyboard.type(noteText.slice(0, 300), { delay: rand(60, 140) }); }
    await sleep(rand(1500, 2500));
  }
  const sent = await page.evaluate(() => {
    const dlg = document.querySelector('div[role="dialog"]');
    if (!dlg) return { sent: false, note: 'modal closed before send' };
    const btns = Array.from(dlg.querySelectorAll('button'));
    const send = btns.find(b => /^send$/i.test((b.innerText || '').trim()) && !b.disabled)
              || btns.find(b => /send invitation/i.test(b.getAttribute('aria-label') || '') && !b.disabled);
    if (!send) return { sent: false, note: 'send button not clickable in modal' };
    send.click();
    return { sent: true };
  });
  if (!sent.sent) return { ok: false, note: sent.note || 'send failed' };
  await sleep(5000);
  const post = await page.evaluate(() => document.body.innerText.slice(0, 8000));
  if (BLOCK_RE.test(post)) return { ok: false, blocked: true, note: 'restriction language after invite send' };
  if (LIMIT_RE.test(post)) return { ok: false, limit: true, note: 'weekly invitation limit hit on send' };
  const confirmed = /invitation.*sent|your invitation|pending/i.test(post);
  return { ok: confirmed, note: confirmed ? 'invitation sent (confirmation observed)' : 'send clicked, no confirmation observed' };
}

(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node engage.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const results = [];
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
  let aborted = false;
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9224', { timeout: 20000 });
  } catch (e) {
    const out = { ok: false, note: 'CDP attach failed on :9224; is the LinkedIn always-on Chrome running? ' + String(e.message || e).slice(0, 150), results: [] };
    fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
    console.log('RESULT cdp_unavailable');
    process.exit(3);
  }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    const ls = await loginState(page);    if (ls.blocked) {
      const out = { ok: false, logged_in: false, blocked: true, note: 'LinkedIn restriction/checkpoint detected at login check; HALTING. Nolan must review the account before any further automation.', results: [] };
      fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
      console.log('RESULT blocked');
      await page.close();
      process.exit(7);
    }
    if (!ls.loggedIn) {
      const out = { ok: false, logged_in: false, note: 'LinkedIn session logged out in the always-on browser; Nolan must log in again in that window', results: [] };
      fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
      console.log('RESULT logged_out');
      await page.close();
      process.exit(4);
    }
    // Phase-1 pacing defaults are deliberately wider than the FB worker.
    const minD = (job.minDelaySec || 90) * 1000, maxD = (job.maxDelaySec || 240) * 1000;
    for (let i = 0; i < job.actions.length; i++) {
      const a = job.actions[i];
      // Owner-hold re-check (2026-10-02): a hold landing mid-pass stops the
      // worker before the next external action. Zero new effects from here.
      const hs = ownerHoldState();
      if (hs.held) {
        aborted = true;
        results.push({ type: 'abort', url: a.url, ok: false, note: 'owner hold in force; stopping pass: ' + hs.reason });
        break;
      }
      if (i > 0) await sleep(rand(minD, maxD));
      try {
        const r = a.type === 'like' ? await doLike(page, a.url)
                : a.type === 'comment' ? await doComment(page, a.url, a.text)
                : a.type === 'connect' ? await doConnect(page, a.url, a.text)
                : { ok: false, note: 'unknown action type (supports like/comment/connect)' };
        results.push({ type: a.type, url: a.url, ...r });
        if (r.limit) {
          // Weekly invite limit: stop this pass gracefully. Not a restriction.
          results.push({ type: 'limit', ok: false, note: 'weekly invitation limit reached; pass stopped, no further invites attempted' });
          break;
        }
        if (r.blocked) {
          aborted = true;
          results.push({ type: 'abort', ok: false, note: 'restriction/checkpoint signal; pass halted, no further actions attempted' });
          break;
        }
      } catch (e) {
        results.push({ type: a.type, url: a.url, ok: false, note: 'exception: ' + String(e.message || e).slice(0, 200) });
      }
      const body = await page.evaluate(() => document.body.innerText.slice(0, 5000)).catch(() => '');
      if (BLOCK_RE.test(body)) {
        aborted = true;
        results.push({ type: 'abort', ok: false, note: 'restriction/checkpoint language detected; pass halted' });
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
  const out = { ok: !aborted && results.every(r => r.ok || r.type === 'abort'), logged_in: true, results };
  fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
  const done = results.filter(r => r.ok).length;
  console.log(`RESULT ok=${out.ok} aborted=${aborted} actions=${results.length} succeeded=${done}`);
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(6); });
