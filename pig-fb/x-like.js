#!/usr/bin/env node
// X like driver for Nolan-approved engagement. Runs on the Pig against the
// dedicated headed Chrome (x-profile, CDP :9225), logged in as @GeskeNolan.
// Usage: x-like.js <post-url> [--check]
//   <post-url> like https://x.com/<handle>/status/<id> (twitter.com accepted)
//   --check    report like state only, take no action (read-only probe)
// HARD RULES:
//  - Login gate first: abort if logged out. Never attempt a login.
//  - Idempotent: if the post already shows liked, report already and exit 0.
//  - Verify by state change: button must flip like -> unlike.
//  - Halt (exit 3) on any checkpoint/captcha/rate-limit signal. Never retry past it.
//  - Never closes the browser.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOG = 'C:/Users/nolan/.local/share/pigi/x-tools/like-log.txt';

function log(line) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] ${line}\n`;
  try { fs.appendFileSync(LOG, entry); } catch (e) {}
  console.log(entry.trim());
}

const BAD = /(verify you are|unusual activity|checkpoint|temporarily limited|something went wrong|rate limit)/i;
const URL_RE = /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})\/status\/(\d+)\/?$/;

async function likeState(page) {
  return await page.evaluate(() => {
    const bad = document.body.innerText || '';
    const article = document.querySelector('article[data-testid="tweet"]');
    const root = article || document;
    const liked = !!root.querySelector('button[data-testid="unlike"]');
    const likeBtn = root.querySelector('button[data-testid="like"]');
    return { bad: bad.slice(0, 200), liked, hasLikeBtn: !!likeBtn };
  });
}

async function main() {
  const url = (process.argv[2] || '').trim();
  const checkOnly = process.argv.includes('--check');
  const m = URL_RE.exec(url);
  if (!m) {
    console.error('usage: x-like.js <post-url> [--check]');
    process.exit(2);
  }
  const tag = `@${m[1]}/${m[2]}`;
  const browser = await chromium.connectOverCDP('http://localhost:9225', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  try {
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    if (!/aria-label="Home timeline"/.test(await page.content())) {
      log(`HALT ${tag}: X session logged out`); await page.close(); process.exit(3);
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    let st = await likeState(page);
    if (BAD.test(st.bad)) { log(`HALT ${tag}: restriction signal: ${st.bad.slice(0, 120)}`); await page.close(); process.exit(3); }
    if (checkOnly) {
      log(`CHECK ${tag}: ${st.liked ? 'liked' : 'unliked'}`);
      console.log(JSON.stringify({ url, state: st.liked ? 'liked' : 'unliked' }));
      await page.close(); process.exit(0);
    }
    if (st.liked) { log(`already liked ${tag}`); await page.close(); process.exit(0); }
    if (!st.hasLikeBtn) { log(`FAILED ${tag}: no Like button found`); await page.close(); process.exit(1); }
    await page.evaluate(() => {
      const article = document.querySelector('article[data-testid="tweet"]');
      const root = article || document;
      const btn = root.querySelector('button[data-testid="like"]');
      if (btn) btn.click();
    });
    await sleep(5000);
    st = await likeState(page);
    if (BAD.test(st.bad)) { log(`HALT ${tag}: restriction signal after click`); await page.close(); process.exit(3); }
    if (st.liked) { log(`liked ${tag}`); await page.close(); process.exit(0); }
    log(`FAILED ${tag}: button did not flip to liked`);
    await page.close(); process.exit(1);
  } catch (e) {
    log(`ERROR ${tag}: ${String(e.message || e).slice(0, 200)}`);
    try { await page.close(); } catch (ignored) {}
    process.exit(1);
  }
}
main();
