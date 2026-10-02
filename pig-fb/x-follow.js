#!/usr/bin/env node
// X follow driver for Nolan-approved follows. Runs on the Pig against the
// dedicated headed Chrome (x-profile, CDP :9225), logged in as @GeskeNolan.
// Usage: x-follow.js <handle>  (one handle per invocation; the caller paces)
// HARD RULES:
//  - Login gate first: abort if logged out. Never attempt a login.
//  - Idempotent: if the profile already shows Following, report already and exit 0.
//  - Verify by state change (2026-09-29): the accessibility tree is the PRIMARY
//    success signal (a button named "Unfollow @<handle>"); the DOM button label
//    flipping Follow -> Following/Unfollow is kept as a secondary/legacy signal.
//  - Halt (exit 3) on any checkpoint/captcha/rate-limit signal. Never retry past it.
//  - Never closes the browser.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const verify = require('./x-follow-verify');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOG = 'C:/Users/nolan/.local/share/pigi/x-tools/follow-log.txt';

function log(line) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] ${line}\n`;
  try { fs.appendFileSync(LOG, entry); } catch (e) {}
  console.log(entry.trim());
}

const BAD = /(verify you are|unusual activity|checkpoint|temporarily limited|something went wrong|rate limit)/i;

async function main() {
  const handle = (process.argv[2] || '').replace(/^@/, '').trim();
  if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    console.error('usage: x-follow.js <handle>'); process.exit(2);
  }
  const browser = await chromium.connectOverCDP('http://localhost:9225', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    if (!/aria-label="Home timeline"/.test(await page.content())) {
      log(`HALT @${handle}: X session logged out`); await page.close(); process.exit(3);
    }
    await page.goto(`https://x.com/${handle}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    const state = await page.evaluate((h) => {
      const bad = document.body.innerText || '';
      const btn = document.querySelector(`button[data-testid="${h}-follow"]`)
        || [...document.querySelectorAll('button')].find(b =>
          /follow/i.test(b.getAttribute('aria-label') || '') && !/following|unfollow/i.test(b.getAttribute('aria-label') || ''));
      const label = btn ? (btn.getAttribute('aria-label') || btn.innerText || '') : null;
      const already = !!document.querySelector(`button[data-testid="${h}-unfollow"]`)
        || [...document.querySelectorAll('button')].some(b => /^following$/i.test((b.innerText || '').trim()));
      return { bad: bad.slice(0, 200), label, already,
               followTestId: btn ? btn.getAttribute('data-testid') : null };
    }, handle);
    if (BAD.test(state.bad)) { log(`HALT @${handle}: restriction signal: ${state.bad.slice(0, 120)}`); await page.close(); process.exit(3); }
    if (state.already) { log(`already following @${handle}`); await page.close(); process.exit(0); }
    if (!state.label) { log(`FAILED @${handle}: no Follow button found`); await page.close(); process.exit(1); }
    await page.evaluate((h) => {
      const btn = document.querySelector(`button[data-testid="${h}-follow"]`)
        || [...document.querySelectorAll('button')].find(b =>
          /follow/i.test(b.getAttribute('aria-label') || '') && !/following|unfollow/i.test(b.getAttribute('aria-label') || ''));
      if (btn) btn.click();
    }, handle);
    await sleep(5000);
    // PRIMARY signal: a11y tree shows "Unfollow @<handle>" (2026-09-29: the
    // button text sometimes never flips even though the follow succeeded).
    let a11yOk = false;
    try {
      const snap = await page.accessibility.snapshot({ interestingOnly: true });
      a11yOk = verify.a11yShowsUnfollow(snap, handle);
    } catch (e) { a11yOk = false; }
    const after = await page.evaluate((h) => {
      const bad = document.body.innerText || '';
      const following = !!document.querySelector(`button[data-testid="${h}-unfollow"]`)
        || [...document.querySelectorAll('button')].some(b => /^following$/i.test((b.innerText || '').trim()));
      return { bad: bad.slice(0, 200), following };
    }, handle);
    if (BAD.test(after.bad)) { log(`HALT @${handle}: restriction signal after click`); await page.close(); process.exit(3); }
    const verdict = verify.followVerdict({ a11yOk, domOk: verify.domShowsFollowing(after) });
    if (verdict.ok) { log(`followed @${handle} [signal=${verdict.signal}]`); await page.close(); process.exit(0); }
    const diag = await page.evaluate(() => [...document.querySelectorAll('button')]
      .map(b => (b.getAttribute('aria-label') || b.innerText || '').trim().slice(0, 40))
      .filter(t => t).slice(0, 12).join(' | '));
    log(`FAILED @${handle}: neither a11y "Unfollow @${handle}" nor legacy button flip observed; buttons now: ${diag.slice(0, 300)}`);
    await page.close(); process.exit(1);
  } catch (e) {
    log(`ERROR @${handle}: ${String(e.message || e).slice(0, 200)}`);
    try { await page.close(); } catch (ignored) {}
    process.exit(1);
  }
}
main();
