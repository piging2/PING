#!/usr/bin/env node
// READ-ONLY X sweep part 3: fixed engagement extraction.
// with_replies: every non-owner article author = someone they converse with.
// likes: every non-owner article author = someone they amplify.
// Navigation + DOM reads only. Never clicks, never types, never interacts.
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUT = 'C:/Users/nolan/.local/share/pigi/x-tools/sweep3-result.json';
const TIER1 = ['karpathy', 'lexfridman', 'simonw', 'sama'];
const SELF = 'geskenolan';
const NOISE = /^(home|explore|notifications|messages|i|search|settings|hashtag|topics|lists|bookmarks|communities)$/i;
const SKIP = new Set((process.argv[2] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

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
  let followers = null;
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') || '';
    if (/followers$/i.test(href)) { followers = (a.innerText || '').trim(); break; }
  }
  const bioLinks = [...document.querySelectorAll('div[data-testid="UserDescription"] a')]
    .map(a => ({ text: (a.innerText || '').trim().slice(0, 80), href: a.getAttribute('href') || '' }))
    .filter(l => /^https?:/.test(l.href));
  const seen = new Set(); const links = [];
  for (const l of bioLinks) { if (!seen.has(l.href)) { seen.add(l.href); links.push(l); } }
  return {
    name: nameBlock ? nameBlock.split('\n')[0].trim() : null,
    bio: desc ? desc.slice(0, 600) : null,
    followers,
    bioLinks: links.slice(0, 10),
  };
}

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9225', { timeout: 20000 });
  const ctx = (browser.contexts().find(c => c.pages().length) || browser.contexts()[0]);
  const page = await ctx.newPage();
  const result = { checkedAt: new Date().toISOString(), login: null, engagements: {}, tabAuthors: {}, candidates: [] };

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
    else if (kind === 'liked') { if (ctxHandle && !e.likedBy.includes(ctxHandle)) e.likedBy.push(ctxHandle); }
    else e.mentions++;
    if (ctxHandle && !e.from.includes(ctxHandle)) e.from.push(ctxHandle);
  };

  for (const h of TIER1) {
    // Replies tab
    await page.goto('https://x.com/' + h + '/with_replies', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    for (let i = 0; i < 5; i++) { await page.evaluate(() => window.scrollBy(0, 2800)); await sleep(2200); }
    const rtweets = await page.evaluate(extractTweetsJS);
    const rauthors = {};
    for (const t of rtweets) {
      if (!t.author) continue;
      const al = t.author.toLowerCase();
      rauthors[al] = (rauthors[al] || 0) + 1;
      if (al !== h) bump(t.author, 'reply', h);           // parent-tweet authors = conversation partners
      for (const m of (t.mentions || [])) {               // quoted / mentioned accounts
        if (m.toLowerCase() === al) continue;
        bump(m, t.isReply ? 'reply' : 'mention', h + ':replies');
      }
      for (const sl of (t.statusLinks || [])) {
        const qh = sl.split('/')[1];
        if (qh && qh.toLowerCase() !== al) bump(qh, 'quote', h + ':replies');
      }
    }
    result.tabAuthors[h + '/with_replies'] = rauthors;
    console.log('REPLIES ' + h + ' tweets=' + rtweets.length);

    // Likes tab
    await page.goto('https://x.com/' + h + '/likes', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    for (let i = 0; i < 5; i++) { await page.evaluate(() => window.scrollBy(0, 2800)); await sleep(2200); }
    const ltweets = await page.evaluate(extractTweetsJS);
    const lauthors = {};
    for (const t of ltweets) {
      if (!t.author) continue;
      const al = t.author.toLowerCase();
      lauthors[al] = (lauthors[al] || 0) + 1;
      if (al !== h) bump(t.author, 'liked', h);
    }
    result.tabAuthors[h + '/likes'] = lauthors;
    console.log('LIKES ' + h + ' tweets=' + ltweets.length);
  }

  const ranked = Object.values(result.engagements)
    .sort((a, b) => (b.replies * 4 + b.likedBy.length * 3 + b.reposts * 2 + b.quotes * 2 + b.mentions) - (a.replies * 4 + a.likedBy.length * 3 + a.reposts * 2 + a.quotes * 2 + a.mentions));
  console.log('ENGAGED_HANDLES=' + ranked.length);

  let visited = 0;
  for (const c of ranked) {
    if (SKIP.has(c.handle.toLowerCase())) continue;
    if (visited >= 30) break;
    visited++;
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
  console.log('SWEEP3_DONE candidates=' + result.candidates.length);
  process.exit(0);
})().catch(e => { console.error('SWEEP3_ERROR ' + String((e && e.message) || e).slice(0, 300)); process.exit(1); });
