#!/usr/bin/env node
// ig-observe-post.js -- READ-ONLY observation of one Instagram post on the Pig
// ig-profile Chrome (CDP localhost:9226, Nolan's login). Built for deliberate
// reconciliation of UNKNOWN_EXECUTION intents: reports the current user's like
// state on the post and whether an exact comment text is present from them.
// Contract: READS ONLY. Never likes, comments, follows, DMs, or clicks any
// engagement control. Never attempts a login (exit 4 if logged out).
// Usage: node ig-observe-post.js <job.json>
// job.json: { "url": "https://www.instagram.com/p/.../", "expect_comment": "exact text or null",
//             "resultFile": "C:/.../observe-result.json" }
// Exit codes: 0 ok, 2 usage, 3 CDP unavailable, 4 logged out, 5 worker error.
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
const BAD = /checkpoint|verify your identity|action blocked|temporarily blocked|we suspect automated|suspicious activity|try again later|something went wrong/i;

async function igLoggedIn(page) {
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const st = await page.evaluate(() => ({
    userField: !!document.querySelector('input[name="username"]'),
    homeNav: !!document.querySelector('[aria-label="Home"]'),
  }));
  return !st.userField && st.homeNav;
}

async function ownUsername(page) {
  return page.evaluate(() => {
    for (const a of document.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href') || '';
      if (!/^\/[a-z0-9._]{1,30}\/$/i.test(h)) continue;
      const img = a.querySelector('img');
      if (img && /profile picture/i.test(img.getAttribute('alt') || '')) return h.slice(1, -1);
    }
    return null;
  });
}

if (require.main !== module) return;
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node ig-observe-post.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const out = { ok: false, logged_in: false, account: null, anomalies: [],
    url: job.url, liked_by_me: null, like_count_text: null,
    expect_comment_present: null, comments_seen: 0, comments: [], note: undefined };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) {
    out.note = 'CDP attach failed: ' + String(e.message || e).slice(0, 150);
    fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 2));
    console.log('RESULT cdp_unavailable'); process.exit(3);
  }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    if (!(await igLoggedIn(page))) {
      out.note = 'Instagram session logged out in the ig-profile browser; Nolan must log in again in that window';
      fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 2));
      console.log('RESULT logged_out'); await page.close(); process.exit(4);
    }
    out.logged_in = true;
    out.account = await ownUsername(page);
    if (out.account && out.account.toLowerCase() !== 'nolanpigi') {
      out.anomalies.push('unexpected_account:' + out.account);
      out.note = 'unexpected logged-in account; aborting observation';
      fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 2));
      console.log('RESULT unexpected_account'); await page.close(); process.exit(5);
    }

    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(7000);
    // Deep comment expansion (READ-ONLY: expands/scrolls the thread, never clicks engagement controls).
    await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let round = 0; round < 6; round++) {
        let clicked = 0;
        for (const el of document.querySelectorAll('button, div[role="button"], span')) {
          const t = (el.innerText || '').trim().toLowerCase();
          if (/^(view all|view|load|show) .*(comment|repl)|more comments/.test(t) && el.offsetParent) {
            try { el.click(); clicked++; } catch (_) {}
          }
        }
        // Scroll the comment thread area (the tallest scrollable ancestor near the comment list).
        const items = document.querySelectorAll('ul li, div[role="listitem"]');
        let scroller = null, maxH = 0;
        for (const it of items) {
          let n = it.parentElement;
          while (n && n !== document.body) {
            if (n.scrollHeight > n.clientHeight + 40 && n.scrollHeight > maxH) { maxH = n.scrollHeight; scroller = n; }
            n = n.parentElement;
          }
        }
        if (scroller) { scroller.scrollTop = scroller.scrollHeight; }
        window.scrollBy(0, 400);
        await sleep(2500);
        if (clicked === 0 && round >= 2) break;
      }
    });
    await sleep(3000);
    const body = await page.evaluate(() => document.body.innerText.slice(0, 4000));
    if (BAD.test(body)) out.anomalies.push('possible_restriction_banner');

    const state = await page.evaluate((expectComment) => {
      const res = { likedByMe: null, likeCountText: null, comments: [] };
      // Like state: the like/unlike button in the post action bar.
      const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
      for (const b of btns) {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        if (label === 'like') { res.likedByMe = false; break; }
        if (label === 'unlike') { res.likedByMe = true; break; }
      }
      // Like count text near the action bar.
      const m = document.body.innerText.match(/([\d,]+)\s+likes?/i);
      if (m) res.likeCountText = m[1];
      // Comments: list items with author links.
      const items = Array.from(document.querySelectorAll('ul li, div[role="listitem"]'));
      for (const li of items) {
        const a = li.querySelector('a[href]');
        if (!a) continue;
        const h = a.getAttribute('href') || '';
        if (!/^\/[a-z0-9._]{1,30}\/$/i.test(h)) continue;
        const author = h.slice(1, -1);
        const txt = (li.innerText || '').replace(/\n+/g, ' ').trim().slice(0, 300);
        if (txt) res.comments.push({ author, text: txt });
      }
      return res;
    }, job.expect_comment || null);

    out.liked_by_me = state.likedByMe;
    out.like_count_text = state.likeCountText;
    out.comments_seen = state.comments.length;
    // Keep only comments authored by nolanpigi plus the exact-text match check.
    out.comments = state.comments.filter(c => c.author.toLowerCase() === 'nolanpigi');
    if (job.expect_comment) {
      const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
      out.expect_comment_present = state.comments.some(c =>
        c.author.toLowerCase() === 'nolanpigi' && norm(c.text).includes(norm(job.expect_comment)));
    }
    out.ok = true;
    fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 2));
    console.log('RESULT ok liked_by_me=' + out.liked_by_me + ' expect_comment_present=' + out.expect_comment_present);
    await page.close();
    process.exit(0);
  } catch (e) {
    out.note = 'worker error: ' + String(e.message || e).slice(0, 200);
    try { fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 2)); } catch (_) {}
    console.log('RESULT worker_error'); process.exit(5);
  }
})();
