#!/usr/bin/env node
// X comment driver for Nolan-approved engagement. Runs on the Pig against the
// dedicated headed Chrome (x-profile, CDP :9225), logged in as @GeskeNolan.
// Usage: x-comment.js <post-url> <comment-file>
//   <post-url>     like https://x.com/<handle>/status/<id> (twitter.com accepted)
//   <comment-file> path to a UTF-8 text file with the comment (avoids shell quoting)
// HARD RULES:
//  - Login gate first: abort if logged out. Never attempt a login.
//  - Comment text is drafted by the caller (the pass worker); this driver posts verbatim.
//  - Verify by state change: reply count must increment after posting.
//  - Halt (exit 3) on any checkpoint/captcha/rate-limit signal. Never retry past it.
//  - One comment per invocation. Pacing is the caller's job.
//  - Never closes the browser.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOG = 'C:/Users/nolan/.local/share/pigi/x-tools/comment-log.txt';

function log(line) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] ${line}\n`;
  try { fs.appendFileSync(LOG, entry); } catch (e) {}
  console.log(entry.trim());
}

const BAD = /(verify you are|unusual activity|checkpoint|temporarily limited|suspicious activity|something went wrong|rate limit|this action has been limited)/i;
const URL_RE = /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})\/status\/(\d+)\/?$/;

async function replyCount(page) {
  return await page.evaluate(() => {
    const bad = document.body.innerText || '';
    const article = document.querySelector('article[data-testid="tweet"]');
    const root = article || document;
    const btn = root.querySelector('button[data-testid="reply"]');
    let n = null;
    if (btn) {
      const label = btn.getAttribute('aria-label') || '';
      const m = label.match(/([\d,]+)/);
      if (m) n = parseInt(m[1].replace(/,/g, ''), 10);
    }
    return { bad: bad.slice(0, 200), count: n, hasReply: !!btn };
  });
}

async function main() {
  const url = (process.argv[2] || '').trim();
  const file = (process.argv[3] || '').trim();
  const m = URL_RE.exec(url);
  if (!m || !file) {
    console.error('usage: x-comment.js <post-url> <comment-file>');
    process.exit(2);
  }
  let text;
  try { text = fs.readFileSync(file, 'utf8').trim(); } catch (e) {
    console.error('cannot read comment file: ' + file);
    process.exit(2);
  }
  if (!text || text.length > 280) {
    console.error('comment must be 1-280 chars, got ' + text.length);
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
    let st = await replyCount(page);
    if (BAD.test(st.bad)) { log(`HALT ${tag}: restriction signal: ${st.bad.slice(0, 120)}`); await page.close(); process.exit(3); }
    if (!st.hasReply) { log(`FAILED ${tag}: no Reply button found`); await page.close(); process.exit(1); }
    const before = st.count;
    // Open the reply composer.
    await page.evaluate(() => {
      const article = document.querySelector('article[data-testid="tweet"]');
      const root = article || document;
      const btn = root.querySelector('button[data-testid="reply"]');
      if (btn) btn.click();
    });
    await sleep(4000);
    // Type into the composer. X renders a contenteditable; pressSequentially via keyboard.
    const box = await page.$('div[data-testid="tweetTextarea_0"] [contenteditable="true"], div[role="textbox"][data-testid="tweetTextarea_0"]');
    if (!box) {
      // Fallback: click whatever textbox appeared in the modal.
      const fb = await page.$('div[role="dialog"] div[role="textbox"]');
      if (!fb) { log(`FAILED ${tag}: composer did not open`); await page.close(); process.exit(1); }
      await fb.click();
    } else {
      await box.click();
    }
    await page.keyboard.type(text, { delay: 25 });
    await sleep(2000);
    // Post the reply.
    const posted = await page.evaluate(() => {
      const dlg = document.querySelector('div[role="dialog"]');
      const root = dlg || document;
      const btn = root.querySelector('button[data-testid="tweetButton"]');
      if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') { btn.click(); return true; }
      return false;
    });
    if (!posted) { log(`FAILED ${tag}: post button not clickable`); await page.close(); process.exit(1); }
    await sleep(8000);
    const bodyText = await page.evaluate(() => (document.body.innerText || '').slice(0, 200));
    if (BAD.test(bodyText)) { log(`HALT ${tag}: restriction signal after post`); await page.close(); process.exit(3); }
    // Verify: reply count incremented.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    st = await replyCount(page);
    if (st.count !== null && before !== null && st.count > before) {
      log(`commented ${tag} (replies ${before} -> ${st.count})`);
      await page.close(); process.exit(0);
    }
    // Count unreadable but no restriction signal: check our reply text appears.
    const seen = await page.evaluate((t) => (document.body.innerText || '').includes(t.slice(0, 40)), text);
    if (seen) { log(`commented ${tag} (verified by text match)`); await page.close(); process.exit(0); }
    log(`UNKNOWN ${tag}: posted without restriction signal but could not verify (replies ${before} -> ${st.count})`);
    await page.close(); process.exit(1);
  } catch (e) {
    log(`ERROR ${tag}: ${String(e.message || e).slice(0, 200)}`);
    try { await page.close(); } catch (ignored) {}
    process.exit(1);
  }
}
main();
