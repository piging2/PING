#!/usr/bin/env node
// READ-ONLY X 2nd-degree sweep for PING follow curation (2026-09-14).
// Runs on the Pig against the dedicated headed Chrome (x-profile, CDP :9225).
// HARD RULES: navigation + DOM reads only. Never clicks, never types, never
// interacts. No follows, likes, comments, reposts, DMs, or any X API writes.
// For each of 5 thesis-relevant FOLLOW-WORTHY seed accounts, reads the
// with_replies tab (profile header + conversations) and aggregates who the
// seed converses with. Then visits the top new handles for bio + samples.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUT = 'C:/Users/nolan/.local/share/pigi/x-tools/sweep4-result.json';
const SEEDS = ['emollick', 'si_pbc', 'elevenlabs', 'awesomekling', 'domenkozar'];
const SELF = 'geskenolan';
const TIER1 = ['karpathy', 'lexfridman', 'simonw', 'sama'];
const KNOWN = new Set([...SEEDS, ...TIER1, 'sonyatweetybird', '_milankovac_', 'tszzl', 'shivon',
  'jenzhuscott', 'willcb', 'github', 'gauthampai', 'nicdunz', 'chrisgpt', '_dmontgomery40',
  'mansteingeorg', 'mikowaia', 'icanvardar', 'exm7777', 'tony_carnev', 'punk6529',
  'bryan_johnson', 'ffmpeg', 'synthwavedd']);
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
        text: textEl ? textEl.innerText.slice(0, 500) : '',
        time: timeEl ? timeEl.getAttribute('datetime') : null,
        isRepost: /reposted/i.test(socialText),
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
  return {
    name: nameBlock ? nameBlock.split('\n')[0].trim() : null,
    bio: desc ? desc.slice(0, 600) : null,
    followers, following,
  };
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9225', { timeout: 20000 });
  const contexts = browser.contexts();
  const ctx = contexts.find(c => c.pages().length) || contexts[0];
  const page = await ctx.newPage();
  const result = { checkedAt: new Date().toISOString(), login: null, seeds: {}, engagements: {}, candidates: [] };

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

  const bump = (h, kind, seedH, tweetText) => {
    h = (h || '').trim();
    if (!h || h.length > 15) return;
    const low = h.toLowerCase();
    if (low === SELF || SEEDS.includes(low) || TIER1.includes(low) || NOISE.test(low)) return;
    const e = result.engagements[low] || (result.engagements[low] = {
      handle: h, replies: 0, reposts: 0, mentions: 0, from: [], contexts: [], known: KNOWN.has(low),
    });
    if (kind === 'reply') e.replies++;
    else if (kind === 'repost') e.reposts++;
    else e.mentions++;
    if (seedH && !e.from.includes(seedH)) e.from.push(seedH);
    if (tweetText && e.contexts.length < 3) e.contexts.push(tweetText.slice(0, 280));
  };

  for (const h of SEEDS) {
    try {
      await page.goto('https://x.com/' + h + '/with_replies', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(5000);
      const prof = await page.evaluate(extractProfileJS);
      for (let i = 0; i < 4; i++) { await page.evaluate(() => window.scrollBy(0, 2800)); await sleep(2200); }
      const tweets = await page.evaluate(extractTweetsJS);
      result.seeds[h] = { ...prof, replyTweets: tweets.length };
      for (const t of tweets) {
        if (!t.author) continue;
        const authorLow = t.author.toLowerCase();
        for (const m of (t.mentions || [])) {
          if (m.toLowerCase() === authorLow) continue;
          bump(m, t.isReply ? 'reply' : (t.isRepost ? 'repost' : 'mention'), h, t.text);
        }
        for (const sl of (t.statusLinks || [])) {
          const qh = sl.split('/')[1];
          if (qh && qh.toLowerCase() !== authorLow) bump(qh, 'mention', h, t.text);
        }
      }
      console.log('SEED ' + h + ' tweets=' + tweets.length);
    } catch (e) {
      result.seeds[h] = { error: String((e && e.message) || e).slice(0, 120) };
      console.log('SEED ' + h + ' ERROR');
    }
  }

  const ranked = Object.values(result.engagements)
    .sort((a, b) => (b.replies * 3 + b.reposts * 2 + b.mentions) - (a.replies * 3 + a.reposts * 2 + a.mentions));
  console.log('ENGAGED_HANDLES=' + ranked.length);

  for (const c of ranked.slice(0, 12)) {
    try {
      await page.goto('https://x.com/' + c.handle, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(4000);
      const prof = await page.evaluate(extractProfileJS);
      for (let i = 0; i < 2; i++) { await page.evaluate(() => window.scrollBy(0, 2500)); await sleep(2000); }
      const tweets = await page.evaluate(extractTweetsJS);
      result.candidates.push({
        ...c,
        ...prof,
        sampleTweets: tweets.filter(t => t.text).slice(0, 3).map(t => t.text.slice(0, 350)),
      });
      console.log('CANDIDATE ' + c.handle);
    } catch (e) {
      result.candidates.push({ ...c, error: String((e && e.message) || e).slice(0, 120) });
    }
  }

  await page.close();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log('SWEEP4_DONE candidates=' + result.candidates.length);
  process.exit(0);
})().catch(e => { console.error('SWEEP4_ERROR ' + String((e && e.message) || e).slice(0, 300)); process.exit(1); });
