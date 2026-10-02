#!/usr/bin/env node
// READ-ONLY X intelligence sweep for PING's Technology Influence Graph (DISCOVER stage).
// Runs on the Pig against the dedicated headed Chrome (x-profile, CDP :9225).
// HARD RULES: navigation + DOM reads only. Never clicks, never types, never
// interacts. No follows, likes, comments, reposts, DMs, or any X API writes.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUT = 'C:/Users/nolan/.local/share/pigi/x-tools/sweep-result.json';
const TIER1 = ['karpathy', 'lexfridman', 'simonw', 'sama'];
const SELF = 'geskenolan';
const NOISE = /^(home|explore|notifications|messages|i|search|settings|hashtag|topics|lists|bookmarks|communities)$/i;

function extractTweetsJS() {
  const tweets = [];
  for (const art of document.querySelectorAll('article[data-testid="tweet"]')) {
    try {
      const textEl = art.querySelector('div[data-testid="tweetText"]');
      const timeEl = art.querySelector('time');
      const links = [...art.querySelectorAll('a[href]')].map(a => a.getAttribute('href') || '');
      const statusLinks = links.filter(h => /^\/[A-Za-z0-9_]+\/status\/\d+/.test(h));
      const author = statusLinks.length ? statusLinks[0].split('/')[1] : null;
      const mentions = [...new Set(
        links.filter(h => /^\/[A-Za-z0-9_]+$/.test(h)).map(h => h.slice(1))
      )].filter(h => h.length <= 15);
      const social = art.querySelector('div[data-testid="socialContext"]');
      const socialText = social ? social.innerText : '';
      const inner = art.innerText || '';
      tweets.push({
        author,
        text: textEl ? textEl.innerText.slice(0, 600) : '',
        time: timeEl ? timeEl.getAttribute('datetime') : null,
        isRepost: /reposted/i.test(socialText),
        isPinned: /pinned/i.test(socialText),
        isReply: /^\s*replying to/im.test(inner),
        mentions: mentions.slice(0, 12),
        statusLinks: statusLinks.slice(0, 4),
      });
    } catch (e) { /* skip malformed */ }
  }
  return tweets;
}

function extractProfileJS() {
  const q = s => { const el = document.querySelector(s); return el ? el.innerText : null; };
  const desc = q('div[data-testid="UserDescription"]');
  const nameBlock = q('div[data-testid="UserName"]');
  let followers = null, following = null;
  for (const a of document.querySelectorAll('a[href$="/followers"]')) { followers = (a.innerText || '').trim(); break; }
  for (const a of document.querySelectorAll('a[href$="/following"]')) { following = (a.innerText || '').trim(); break; }
  const bioLinks = [...document.querySelectorAll('div[data-testid="UserDescription"] a')]
    .map(a => ({ text: (a.innerText || '').trim().slice(0, 80), href: a.getAttribute('href') || '' }))
    .filter(l => /^https?:/.test(l.href));
  const seen = new Set(); const links = [];
  for (const l of bioLinks) { if (!seen.has(l.href)) { seen.add(l.href); links.push(l); } }
  return {
    name: nameBlock ? nameBlock.split('\n')[0].trim() : null,
    bio: desc ? desc.slice(0, 600) : null,
    followers, following,
    bioLinks: links.slice(0, 10),
  };
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9225', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  const result = { checkedAt: new Date().toISOString(), login: null, homeTweets: [], profiles: {}, engagements: {}, candidates: [] };

  // 0. Login gate: abort if the session is not live. Never attempt a login.
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);
  const homeHtml = await page.content();
  result.login = /aria-label="Home timeline"/.test(homeHtml) ? 'ok' : 'logged_out';
  if (result.login !== 'ok') {
    await page.close();
    fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
    console.log('LOGIN logged_out');
    process.exit(2);
  }
  console.log('LOGIN ok');

  // 1. Home timeline (read-only scroll + extract).
  for (let i = 0; i < 4; i++) { await page.evaluate(() => window.scrollBy(0, 2500)); await sleep(2500); }
  result.homeTweets = await page.evaluate(extractTweetsJS);
  console.log('HOME tweets=' + result.homeTweets.length);

  // 2. Tier 1 profiles: bio + recent tweets.
  for (const h of TIER1) {
    await page.goto('https://x.com/' + h, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    const prof = await page.evaluate(extractProfileJS);
    for (let i = 0; i < 3; i++) { await page.evaluate(() => window.scrollBy(0, 2500)); await sleep(2000); }
    const tweets = await page.evaluate(extractTweetsJS);
    result.profiles[h] = { ...prof, tweets: tweets.slice(0, 30) };
    console.log('PROFILE ' + h + ' tweets=' + tweets.length);
  }

  // 3. Aggregate who Tier 1 engages with: replies, reposts, quotes, mentions.
  const bump = (h, kind, ctxHandle) => {
    h = (h || '').trim();
    if (!h || h.length > 15) return;
    const low = h.toLowerCase();
    if (low === SELF || TIER1.includes(low) || NOISE.test(low)) return;
    const e = result.engagements[low] || (result.engagements[low] = { handle: h, replies: 0, reposts: 0, quotes: 0, mentions: 0, from: [] });
    if (kind === 'reply') e.replies++;
    else if (kind === 'repost') e.reposts++;
    else if (kind === 'quote') e.quotes++;
    else e.mentions++;
    if (ctxHandle && !e.from.includes(ctxHandle)) e.from.push(ctxHandle);
  };
  const allTweets = [
    ...result.homeTweets.map(t => ({ ...t, _ctx: 'home' })),
    ...Object.entries(result.profiles).flatMap(([h, p]) => (p.tweets || []).map(t => ({ ...t, _ctx: h }))),
  ];
  for (const t of allTweets) {
    if (!t.author) continue;
    const authorLow = t.author.toLowerCase();
    const ctxH = t._ctx || 'home';
    for (const m of (t.mentions || [])) {
      if (m.toLowerCase() === authorLow) continue;
      bump(m, t.isReply ? 'reply' : (t.isRepost ? 'repost' : 'mention'), ctxH);
    }
    for (const sl of (t.statusLinks || [])) {
      const qh = sl.split('/')[1];
      if (qh && qh.toLowerCase() !== authorLow) bump(qh, 'quote', ctxH);
    }
  }
  const ranked = Object.values(result.engagements)
    .sort((a, b) => (b.replies * 3 + b.reposts * 2 + b.quotes * 2 + b.mentions) - (a.replies * 3 + a.reposts * 2 + a.quotes * 2 + a.mentions));
  console.log('ENGAGED_HANDLES=' + ranked.length);

  // 4. Visit top engaged handles for bio / followers / sample posts.
  for (const c of ranked.slice(0, 25)) {
    try {
      await page.goto('https://x.com/' + c.handle, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(4000);
      const prof = await page.evaluate(extractProfileJS);
      const tweets = await page.evaluate(extractTweetsJS);
      const pinned = tweets.find(t => t.isPinned);
      result.candidates.push({
        ...c,
        ...prof,
        sampleTweets: tweets.filter(t => t.text).slice(0, 3).map(t => ({ text: t.text.slice(0, 400), time: t.time, pinned: !!t.isPinned })),
        pinnedText: pinned && pinned.text ? pinned.text.slice(0, 400) : null,
      });
      console.log('CANDIDATE ' + c.handle);
    } catch (e) {
      result.candidates.push({ ...c, error: String((e && e.message) || e).slice(0, 120) });
    }
  }

  await page.close();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log('SWEEP_DONE candidates=' + result.candidates.length);
  process.exit(0);
})().catch(e => { console.error('SWEEP_ERROR ' + String((e && e.message) || e).slice(0, 300)); process.exit(1); });
