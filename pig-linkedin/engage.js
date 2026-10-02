#!/usr/bin/env node
// Pigi LinkedIn engagement worker (runs on the Pig, Nolan's workstation).
// Attaches via CDP to the always-on headed Chrome (remote-debugging-port 9224)
// that holds Nolan's LinkedIn login in a DEDICATED profile (li-profile).
// That browser must stay running; the session does not reliably survive
// restarts, so this script never launches or closes it.
// Phase 1 scope: likes and comments ONLY. Connection requests and DMs are
// deliberately unsupported by this worker (see linkedin-automation-plan doc).
// Usage: node engage.js <job.json>
// job.json: { "actions": [ {type:"like"|"comment", url, text?} ], "minDelaySec": 90, "maxDelaySec": 240 }
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

(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node engage.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const results = [];
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
    const ls = await loginState(page);
    if (ls.blocked) {
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
      if (i > 0) await sleep(rand(minD, maxD));
      try {
        const r = a.type === 'like' ? await doLike(page, a.url)
                : a.type === 'comment' ? await doComment(page, a.url, a.text)
                : { ok: false, note: 'unknown action type (phase 1 supports like/comment only)' };
        results.push({ type: a.type, url: a.url, ...r });
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
