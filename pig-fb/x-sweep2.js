#!/usr/bin/env node
// READ-ONLY X sweep part 2: who Tier 1 talks to (replies tab) and amplifies (likes tab).
// Navigation + DOM reads only. Never clicks, never types, never interacts.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUT = 'C:/Users/nolan/.local/share/pigi/x-tools/sweep2-result.json';
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
    } catch (e) { /* skip */ }
  }
  return tweets;
}

function extractProfileJS() {
  const q = s => { const el = document.querySelector(s); return el ? el.innerText : null; };
  const desc = q('div[data-testid="UserDescription"]');
  const nameBlock = q('div[data-testid="UserName"]');
  // follower count: probe several selector shapes and report what matched
  let followers = null, followerSrc = null;
  const probes = [];
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') || '';
    if (/followers$/i.test(href)) probes.push({ href, text: (a.innerText || '').trim().slice(0, 40) });
  }
  if (probes.length) { followers = probes[0].text; followerSrc = probes[0].href; }
  const bioLinks = [...document.querySelectorAll('div[data-testid="UserDescription"] a')]
    .map(a => ({ text: (a.innerText || '').trim().slice(0, 80), href: a.getAttribute('href') || '' }))
    .filter(l => /^https?:/.test(l.href));
  const seen = new Set(); const links = [];
  for (const l of bioLinks) { if (!seen.has(l.href)) { seen.add(l.href); links.push(l); } }
  return {
    name: nameBlock ? nameBlock.split('\n')[0].trim() : null,
    bio: desc ? desc.slice(0, 600) : null,
    followers, followerSrc, followerProbes: probes.slice(0, 4),
    bioLinks: links.slice(0, 10),
  };
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9225', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  const result = { checkedAt: new Date().toISOString(), login: null, engagements: {}, tabStats: {}, candidates: [] };

  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const homeHtml = await page.content();
  result.login = /aria-label="Home timeline"/.test(homeHtml) ? 'ok' : 'logged_out';
  if (result.login !== 'ok') {
    await page.close();
    fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
    console.log('LOGIN logged_out');
    process.exit(2);
  }
  console.log('LOGIN ok');

  const bump = (h, kind, ctxHandle) => {
    h = (h || '').trim();
    if (!h || h.length > 15) return;
    const low = h.toLowerCase();
    if (low === SELF || TIER1.includes(low) || NOISE.test(low)) return;
    const e = result.engagements[low] || (result.engagements[low] = { handle: h, replies: 0, reposts: 0, quotes: 0, mentions: 0, likedBy: [], from: [] });
    if (kind === 'reply') e.replies++;
    else if (kind === 'repost') e.reposts++;
    else if (kind === 'quote') e.quotes++;
    else if (kind === 'liked') { if (ctxHandle && !e.likedBy.includes(ctxHandle)) e.likedBy.push(ctxHandle); e.mentions++; }
    else e.mentions++;
    if (ctxHandle && !e.from.includes(ctxHandle)) e.from.push(ctxHandle);
  };

  for (const h of TIER1) {
    // Replies tab: who they converse with
    try {
      await page.goto('https://x.com/' + h + '/with_replies', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(5000);
      for (let i = 0; i < 5; i++) { await page.evaluate(() => window.scrollBy(0, 2800)); await sleep(2200); }
      const tweets = await page.evaluate(extractTweetsJS);
      result.tabStats[h + '/with_replies'] = tweets.length;
      for (const t of tweets) {
        if (!t.author) continue;
        const authorLow = t.author.toLowerCase();
        for (const m of (t.mentions || [])) {
          if (m.toLowerCase() === authorLow) continue;
          bump(m, t.isReply ? 'reply' : (t.isRepost ? 'repost' : 'mention'), h + ':replies');
        }
        for (const sl of (t.statusLinks || [])) {
          const qh = sl.split('/')[1];
          if (qh && qh.toLowerCase() !== authorLow) bump(qh, 'quote', h + ':replies');
        }
      }
      console.log('REPLIES ' + h + ' tweets=' + tweets.length);
    } catch (e) { console.log('REPLIES ' + h + ' ERROR ' + String((e && e.message) || e).slice(0, 100)); }

    // Likes tab: who they amplify
    try {
      await page.goto('https://x.com/' + h + '/likes', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(5000);
      for (let i = 0; i < 5; i++) { await page.evaluate(() => window.scrollBy(0, 2800)); await sleep(2200); }
      const tweets = await page.evaluate(extractTweetsJS);
      result.tabStats[h + '/likes'] = tweets.length;
      for (const t of tweets) {
        if (t.author) bump(t.author, 'liked', h);
      }
      console.log('LIKES ' + h + ' tweets=' + tweets.length);
    } catch (e) { console.log('LIKES ' + h + ' ERROR ' + String((e && e.message) || e).slice(0, 100)); }
  }

  const ranked = Object.values(result.engagements)
    .sort((a, b) => (b.replies * 4 + b.reposts * 2 + b.quotes * 2 + b.likedBy.length * 3 + b.mentions) - (a.replies * 4 + a.reposts * 2 + a.quotes * 2 + a.likedBy.length * 3 + a.mentions));
  console.log('ENGAGED_HANDLES=' + ranked.length);

  for (const c of ranked.slice(0, 30)) {
    try {
      await page.goto('https://x.com/' + c.handle, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(4000);
      const prof = await page.evaluate(extractProfileJS);
      const tweets = await page.evaluate(extractTweetsJS);
      result.candidates.push({
        ...c,
        ...prof,
        sampleTweets: tweets.filter(t => t.text).slice(0, 3).map(t => ({ text: t.text.slice(0, 400), time: t.time })),
      });
      console.log('CANDIDATE ' + c.handle + ' followers=' + prof.followers);
    } catch (e) {
      result.candidates.push({ ...c, error: String((e && e.message) || e).slice(0, 120) });
    }
  }

  await page.close();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log('SWEEP2_DONE candidates=' + result.candidates.length);
  process.exit(0);
})().catch(e => { console.error('SWEEP2_ERROR ' + String((e && e.message) || e).slice(0, 300)); process.exit(1); });
