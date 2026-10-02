#!/usr/bin/env node
// th-discover.js -- READ-ONLY Threads discovery on the Pig ig-profile Chrome.
// Connects via CDP to http://localhost:9226 (ig-profile, holds Nolan's login;
// Threads web auth rides the Instagram session). Contract: READS ONLY.
// Never likes, comments, reposts, follows, DMs, or clicks any engagement
// control. Navigation + DOM reads only. Never attempts a login.
// Usage: node th-discover.js <job.json>
// job.json: { "seeds": ["@garyvee", ...], "maxPostsPerProfile": 4,
//             "resultFile": "C:/.../th-discover-result.json" }
// Writes JSON to resultFile and prints one summary line. Exit codes:
// 0 ok, 2 usage, 3 CDP unavailable, 4 logged out (login gate), 5 worker error.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
const POST_RE = /^\/@[a-z0-9._]+\/post\/[A-Za-z0-9_-]+\/?$/i;
const BAD = /checkpoint|verify your identity|action blocked|temporarily blocked|we suspect automated|suspicious activity|try again later|something went wrong/i;

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
  }));
  return st.loginPrompt === 0 && (st.profileLinks > 0 || st.createBtn);
}

async function scrapeProfile(page, handle, maxPosts) {
  const clean = handle.replace(/^@/, '');
  const url = `https://www.threads.com/@${clean}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  // Scroll a couple times to load more posts.
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await sleep(2500);
  }
  const info = await page.evaluate((re) => {
    const re_ = new RegExp(re);
    const body = document.body.innerText || '';
    const missing = /sorry,? this page isn't available/i.test(body);
    // Verified badge: svg/title/aria marking next to the handle.
    const verified = Array.from(document.querySelectorAll('svg')).some(s =>
      /verified/i.test(s.getAttribute('aria-label') || '') || /verified/i.test(s.innerHTML.slice(0, 200))) ||
      Array.from(document.querySelectorAll('[title]')).some(e => /verified/i.test(e.getAttribute('title') || ''));
    const displayName = (document.querySelector('h1, [data-testid="profile-name"]') || {}).innerText || '';
    const seen = new Set();
    const posts = [];
    for (const a of document.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href') || '';
      if (!re_.test(h)) continue;
      const canon = 'https://www.threads.com' + h.split('?')[0].replace(/\/$/, '') + '/';
      if (seen.has(canon)) continue;
      seen.add(canon);
      posts.push(canon);
    }
    return { missing, verified, displayName: (displayName || '').slice(0, 120), posts };
  }, POST_RE.source);
  return { account: '@' + clean, profileUrl: url + '/', found: !info.missing, verified: info.verified, posts: info.posts.slice(0, maxPosts) };
}

async function scrapePostText(page, postUrl) {
  await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);
  const text = await page.evaluate(() => {
    // Main post content: the article element of the first (top-level) post.
    const arts = Array.from(document.querySelectorAll('article'));
    if (!arts.length) return '';
    // Top-level post is usually the first article; take its full text minus reply prompts.
    let t = arts[0].innerText || '';
    return t.slice(0, 600);
  });
  return (text || '').replace(/\s+/g, ' ').trim();
}

(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node th-discover.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const seeds = job.seeds || [];
  const maxPosts = job.maxPostsPerProfile || 4;
  const resultFile = job.resultFile;
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP, { timeout: 20000 });
  } catch (e) {
    const out = { ok: false, note: 'CDP attach failed: ' + String(e.message || e).slice(0, 150), candidates: [] };
    if (resultFile) fs.writeFileSync(resultFile, JSON.stringify(out, null, 2));
    console.log('RESULT cdp_unavailable');
    process.exit(3);
  }
  // Single-tab discovery (2026-09-29 fix): one page is created per run and
  // closed on every exit path, so discovery never accumulates tabs.
  let page = null;
  const closePage = async () => { try { if (page && !page.isClosed()) await page.close(); } catch {} page = null; };
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    page = await ctx.newPage();
    // Login gate: refuse to run logged out. Never attempt a login.
    if (!(await threadsLoggedIn(page))) {
      const out = { ok: false, logged_in: false, note: 'Threads session not active in the ig-profile browser; Nolan must log into Instagram again in that window', candidates: [] };
      fs.writeFileSync(resultFile, JSON.stringify(out, null, 2));
      console.log('RESULT logged_out');
      await closePage();
      process.exit(4);
    }
    const own = await page.evaluate(() => {
      for (const a of document.querySelectorAll('a[href]')) {
        const h = a.getAttribute('href') || '';
        if (!/^\/@[a-z0-9._]+\/?$/i.test(h)) continue;
        const img = a.querySelector('img');
        if (img && /profile (picture|photo)/i.test(img.getAttribute('alt') || '')) return h.replace(/\//g, '');
      }
      return null;
    });
    const candidates = [];
    for (const seed of seeds) {
      try {
        const prof = await scrapeProfile(page, seed, maxPosts);
        for (const url of prof.posts) {
          let snippet = '';
          try { snippet = await scrapePostText(page, url); } catch (e) { snippet = ''; }
          if (BAD.test(snippet)) continue;
          candidates.push({
            account: prof.account, url,
            verified: prof.verified, profile_found: prof.found,
            snippet: snippet.slice(0, 300),
            signed_in_as: own,
          });
        }
        await sleep(3000);
      } catch (e) {
        candidates.push({ account: seed, url: '', error: 'profile scrape failed: ' + String(e.message || e).slice(0, 120) });
      }
    }
    const out = { ok: true, logged_in: true, signed_in_as: own, candidates };
    fs.writeFileSync(resultFile, JSON.stringify(out, null, 2));
    console.log('RESULT ok candidates=' + candidates.length + ' signed_in_as=' + own);
    await closePage();
    process.exit(0);
  } catch (e) {
    const out = { ok: false, note: 'worker error: ' + String(e.message || e).slice(0, 200), candidates: [] };
    try { fs.writeFileSync(resultFile, JSON.stringify(out, null, 2)); } catch {}
    console.log('RESULT worker_error');
    await closePage();
    process.exit(5);
  }
})();
