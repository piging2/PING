#!/usr/bin/env node
// ig-discover.js -- READ-ONLY Instagram discovery on the Pig ig-profile Chrome.
// Connects via CDP to http://127.0.0.1:9226 (ig-profile, holds Nolan's login).
// Contract: READS ONLY. Never likes, comments, follows, DMs, or clicks any
// engagement control. The only click performed is the Search nav item (opens
// the search panel). Never attempts a login.
// Usage: node ig-discover.js <job.json>
// job.json: { "queries": [...], "skip": ["@handle",...], "maxProfiles": 16,
//             "resultFile": "C:/.../ig-discover-result.json" }
// Writes JSON to resultFile and prints one summary line. Exit codes:
// 0 ok, 2 usage, 3 CDP unavailable, 4 logged out (login gate), 5 worker error.
const fs = require('fs');
// playwright-core is Pig-only (Windows path) and loads lazily in the Pig
// entrypoint below, so the pure exports stay loadable on any machine
// (tests, local follow-up runner).

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const CDP = 'http://localhost:9226';
const BAD = /checkpoint|verify your identity|action blocked|temporarily blocked|we suspect automated|suspicious activity|try again later|something went wrong/i;
const HANDLE_RE = /^\/[a-z0-9._]{1,30}\/$/i;

// BROADENED 2026-09-21 (Nolan's directive "there should always be eligible candidates",
// refined same day): NOT limited to trades. Any local business owner with a business
// account is eligible; trades stay priority. Positive signal list covers trades plus
// common local-business categories. Clearly non-business markers are excluded below.
const BUSINESS = ['plumb', 'hvac', 'electric', 'roof', 'landscap', 'garage door', 'pest', 'excav',
  'paint', 'concrete', 'fence', 'tree service', 'chimney', 'solar', 'handyman', 'drain',
  'heating', 'cooling', 'air conditioning', 'septic', 'well service', 'insulation', 'masonry',
  'gutter', 'flooring', 'remodel', 'contractor', 'builder', 'renovat',
  'restaurant', 'cafe', 'coffee', 'bakery', 'diner', 'pizza', 'taco', 'grill', 'eatery',
  'food truck', 'catering', 'brewery', 'distillery', 'winery', 'taproom', 'pub', 'bar ',
  'salon', 'barber', 'spa ', 'nail', 'tattoo', 'boutique', 'shop', 'store', 'market',
  'grocery', 'deli', 'florist', 'jewel', 'pet ', 'groom', 'vet ', 'daycare', 'laundry',
  'dry clean', 'auto', 'mechanic', 'detail', 'tire', 'car wash', 'gym', 'fitness', 'yoga',
  'crossfit', 'pilates', 'photograph', 'venue', 'wedding', 'rental', 'storage', 'moving',
  'cleaning', 'lawn', 'pool', 'appliance', 'locksmith', 'generator', 'fireplace', 'stove',
  'sprinkler', 'turf', 'nursery', 'farm', 'ranch', 'orchard', 'hotel', 'motel', 'inn ',
  'lodge', 'campground', 'realtor', 'realty', 'real estate', 'insurance', 'accounting',
  'bookkeep', 'dental', 'dentist', 'chiro', 'clinic', 'optical', 'bank', 'notary',
  'printing', 'marketing', 'web design', 'computer', 'phone repair', 'music',
  'gallery', 'antique', 'thrift', 'furniture', 'mattress', 'hardware', 'kennel',
  'boarding', 'outfitter', 'rafting', 'ski', 'bike', 'sporting', 'dispensary', 'liquor',
  'dealership', 'motors', 'propane', 'weld', 'fabricat', 'embroidery', 'dj ', 'bowling',
  'theater', 'cinema', 'museum', 'tutor', 'academy', 'preschool', 'montessori', 'dance',
  'martial', 'gymnastic', 'swim', 'tennis', 'golf', 'escape room', 'trampoline',
  'butcher', 'seafood', 'sushi', 'steakhouse', 'brunch', 'ice cream', 'donut', 'smoothie',
  'sandwich', 'bbq', 'smokehouse', 'cidery', 'lounge', 'karaoke', 'arcade', 'mini golf',
  'driving range', 'pickleball', 'boxing', 'mma ', 'karate', 'taekwondo', 'music school',
  'art studio', 'dance studio', 'photo studio', 'cowork', 'event space', 'wedding venue',
  'party rental', 'bounce house', 'balloon', 'magician', 'private chef',
  'meal prep', 'maid', 'janitorial', 'pressure wash', 'window clean', 'gutter clean',
  'chimney sweep', 'duct clean', 'carpet clean', 'upholstery', 'restoration', 'mold',
  'water damage', '24/7', '24 hour', 'licensed', 'insured', 'bonded', 'family owned',
  'locally owned', 'small business', 'llc', 'inc', 'corp', 'co.', 'company', 'services',
  'service', 'pros', 'experts', 'est.', 'since '];
const LOC = ['grand junction', 'grand jct', ' fruita', 'palisade', 'clifton', 'redlands', 'montrose',
  'delta', 'gunnison', 'durango', 'cortez', 'mancos', 'bayfield', 'pagosa', 'telluride', 'ouray',
  'ridgway', 'rifle', 'glenwood', 'carbondale', 'basalt', 'aspen', 'steamboat', 'craig', 'meeker',
  'paonia', 'cedaredge', 'hotchkiss', 'olathe', 'colorado', 'western slope', 'western co',
  'southwest colorado', 'sw colorado', '970'];
// Clearly non-business markers. Personal profiles never engage (business accounts only).
const NONBIZ = ['personal blog', 'fan account', 'parody account', 'meme page', 'fan page',
  'church', 'nonprofit', 'non-profit', 'magazine', 'tourism', 'visitor bureau'];
const FRANCHISE = ['benjamin franklin', 'one hour', 'mr rooter', 'mr. rooter', 'roto-rooter',
  'servpro', 'renewal by andersen'];
const PROMO = /giveaway|now hiring|we're hiring|we are hiring|job opening|hiring now|apply today/i;

const hasAny = (t, arr) => arr.some(k => t.includes(k));

// Observation-status vocabulary lives in ig-observation.js (pure, shared with
// tests and the local follow-up runner). Scp'd alongside this file by
// run_ig_discover.sh.
const { OBS_STATUS, nearMiss, reasonToStatus } = require('./ig-observation.js');

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

async function openSearchPanel(page) {
  try {
    await page.locator('[aria-label="Search"]').first().click({ timeout: 15000 });
  } catch (e) {
    return false;
  }
  await sleep(2500);
  const input = await page.evaluate(() => {
    const vis = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'))
      .filter(i => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    return vis.length ? true : false;
  });
  return input;
}

async function typeaheadHandles(page, query, skip) {
  if (!(await openSearchPanel(page))) return { ok: false, handles: [] };
  const focused = await page.evaluate(() => {
    const vis = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'))
      .filter(i => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (!vis[0]) return false;
    vis[0].focus();
    return true;
  });
  if (!focused) return { ok: false, handles: [] };
  await page.keyboard.press('ControlOrMeta+a');
  await sleep(400);
  await page.keyboard.type(query, { delay: rand(60, 130) });
  await sleep(4500);
  const collect = () => page.evaluate(() => {
    const out = [];
    for (const a of document.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href') || '';
      if (/^\/[a-z0-9._]{1,30}\/$/i.test(h)) out.push(h.slice(1, -1));
    }
    return [...new Set(out)];
  });
  const found = new Set();
  const absorb = hs => { for (const h of hs) { if (!skip.has(h.toLowerCase())) found.add(h); } };
  absorb(await collect());
  // Scroll the results panel to surface more accounts.
  await page.evaluate(() => {
    const inp = Array.from(document.querySelectorAll('input')).find(i => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    let node = inp, scroller = null;
    for (let d = 0; d < 8 && node; d++) {
      node = node.parentElement;
      if (node && node.scrollHeight - node.clientHeight > 60) { scroller = node; break; }
    }
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
    window.__igScroller = scroller || null;
  });
  for (let s = 0; s < 3; s++) {
    await sleep(2500);
    absorb(await collect());
    await page.evaluate(() => { const sc = window.__igScroller; if (sc) sc.scrollTop = sc.scrollHeight; });
  }
  // Close the search panel for the next query.
  await page.keyboard.press('Escape');
  await sleep(800);
  return { ok: true, handles: [...found] };
}

async function vetProfile(page, handle) {
  await page.goto('https://www.instagram.com/' + handle + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(4500, 6500));
  const body = await page.evaluate(() => document.body.innerText.slice(0, 20000)).catch(() => '');
  if (BAD.test(body.slice(0, 5000))) return { error: 'restriction_pattern' };
  const info = await page.evaluate(() => {
    const text = (document.body.innerText || '').toLowerCase();
    const headerEl = document.querySelector('header section');
    const header = headerEl ? (headerEl.innerText || '').toLowerCase() : text.slice(0, 3000);
    const isPrivate = /this account is private/.test(text);
    const postM = text.match(/([\d,]+)\s+posts/);
    // SURFACE-DRIFT NOTE 2026-09-21: the profile post grid no longer renders
    // /p/ or /reel/ anchors in this CDP session (0 links even after scrolling
    // on profiles with thousands of posts). firstPost is usually null now;
    // the worker follows up via instagram-cli `posts --username` for post URLs.
    const firstPost = Array.from(document.querySelectorAll('a[href^="/p/"], a[href^="/reel/"]'))
      .map(a => a.getAttribute('href'))[0] || null;
    let firstAlt = null;
    const firstImg = document.querySelector('main article a img, main a img');
    if (firstImg) firstAlt = firstImg.getAttribute('alt');
    return { header, body: text.slice(0, 20000), isPrivate, posts: postM ? parseInt(postM[1].replace(/,/g, ''), 10) : null, firstPost, firstAlt };
  });
  return info;
}

async function vetPost(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(4500, 6500));
  const body = await page.evaluate(() => document.body.innerText.slice(0, 5000)).catch(() => '');
  if (BAD.test(body)) return { error: 'restriction_pattern' };
  return page.evaluate(() => {
    const t = document.querySelector('time');
    const og = document.querySelector('meta[property="og:description"]');
    const art = document.querySelector('article');
    const artText = art ? (art.innerText || '').slice(0, 4000) : '';
    let comments = 0;
    const m = (document.body.innerText || '').match(/View all ([\d,]+) comments/);
    if (m) comments = parseInt(m[1].replace(/,/g, ''), 10);
    else if (art) comments = Math.max(0, art.querySelectorAll('ul li').length - 1);
    const likeEl = Array.from(document.querySelectorAll('[aria-label]'))
      .map(e => e.getAttribute('aria-label') || '').find(s => /likes?$/.test(s));
    return {
      datetime: t ? t.getAttribute('datetime') : null,
      caption: og ? og.getAttribute('content') : artText.slice(0, 500),
      comments,
      likes: likeEl || null,
      isReel: location.pathname.startsWith('/reel/'),
    };
  });
}

// Export the pure classification surface for tests (ig-observation.test.js)
// and the local follow-up runner. The Pig entrypoint below only runs when
// this file is executed directly.
//
// FALSE-GREEN FIX 2026-09-25 (Nolan): ok is derived from evidence, never
// assumed. A genuine empty (every query answered, zero candidates) is
// ok:true. A broken surface (every query search_failed, or no queries ran
// at all) is ok:false with a machine-readable note.
function deriveOk(out) {
  const anomalies = out.anomalies || [];
  const queriesRun = out.queries_run || 0;
  const searchFailed = anomalies.filter(a => a.indexOf('search_failed:') === 0).length;
  if (queriesRun > 0 && searchFailed >= queriesRun) return { ok: false, note: 'all_queries_search_failed' };
  if (queriesRun === 0) return { ok: false, note: 'no_queries_run' };
  return { ok: true, note: undefined };
}

module.exports = { OBS_STATUS, nearMiss, reasonToStatus, hasAny, BUSINESS, LOC, NONBIZ, FRANCHISE, HANDLE_RE, deriveOk };

if (require.main !== module) return;
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');
(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node ig-discover.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const skip = new Set((job.skip || []).map(h => h.replace(/^@/, '').toLowerCase()));
  const maxProfiles = job.maxProfiles || 16;
  const out = { ok: false, logged_in: false, account: null, anomalies: [], candidates: [], near_misses: [], queries_run: 0 };
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
    }
    skip.add('nolanpigi');
    if (out.account) skip.add(out.account.toLowerCase());

    // Phase 1: typeahead collection.
    const found = [];
    for (const q of job.queries || []) {
      out.queries_run++;
      const r = await typeaheadHandles(page, q, skip).catch(() => ({ ok: false, handles: [] }));
      if (!r.ok) { out.anomalies.push('search_failed:' + q); continue; }
      for (const h of r.handles) {
        const key = h.toLowerCase();
        if (!skip.has(key) && !found.some(x => x.toLowerCase() === key)) found.push(h);
      }
      if (found.length >= maxProfiles * 2) break;
      await sleep(rand(2500, 4500));
    }

    // Phase 2: vet profiles (bounded).
    const cutoff = Date.now() - 120 * 24 * 3600 * 1000;
    for (const handle of found.slice(0, maxProfiles)) {
      try {
        const p = await vetProfile(page, handle);
        if (p.error) { out.anomalies.push(p.error + ':profile:' + handle); break; }
        if (p.isPrivate) { out.near_misses.push(nearMiss(handle, 'private', reasonToStatus('private'))); continue; }
        if (p.posts === 0) { out.near_misses.push(nearMiss(handle, 'no posts', reasonToStatus('no posts'))); continue; }
        // SURFACE-DRIFT FIX 2026-09-21: `header section` innerText is EMPTY in the
        // current IG DOM, so header-only keyword checks false-negative real
        // businesses. Haystack = handle + header + full body text when the
        // header came back short. (Precision gate moves to instagram-cli
        // user-profile country/account-type verification in the worker.)
        const hraw = p.header || '';
        const htxt = ((hraw.length > 100 ? hraw : hraw + ' ' + (p.body || '')) + ' ' + handle + ' ' + (p.firstAlt || '')).toLowerCase();
        if (hasAny(htxt, FRANCHISE)) { out.near_misses.push(nearMiss(handle, 'franchise', reasonToStatus('franchise'))); continue; }
        if (hasAny(htxt, NONBIZ)) { out.near_misses.push(nearMiss(handle, 'non-business category', reasonToStatus('non-business category'))); continue; }
        if (!hasAny(htxt, BUSINESS)) { out.near_misses.push(nearMiss(handle, 'no business keywords in profile', reasonToStatus('no business keywords in profile'))); continue; }
        if (!hasAny(htxt, LOC)) { out.near_misses.push(nearMiss(handle, 'location not Western CO', reasonToStatus('location not Western CO'))); continue; }
        // P0 FIX 2026-09-24: missing /p/ or /reel/ anchors is EXTRACTION
        // failure, not an empty feed. Emits FOLLOWUP_REQUIRED; the local
        // follow-up (ig-nearmiss-followup.js, instagram-cli user-profile +
        // posts) must run before any durable skip decision.
        if (!p.firstPost) { out.near_misses.push(nearMiss(handle, 'no post link found', reasonToStatus('no post link found'))); continue; }
        const postUrl = 'https://www.instagram.com' + p.firstPost;
        const v = await vetPost(page, postUrl);
        if (v.error) { out.anomalies.push(v.error + ':post:' + handle); break; }
        if (v.datetime && new Date(v.datetime).getTime() < cutoff) {
          out.near_misses.push(nearMiss(handle, 'stale feed (newest post ' + v.datetime.slice(0, 10) + ')', OBS_STATUS.OBSERVED_EXCLUDE));
          continue;
        }
        if (v.isReel && v.comments === 0) { out.near_misses.push(nearMiss(handle, 'reel without visible comments', reasonToStatus('reel without visible comments'))); continue; }
        const cap = (v.caption || '') + ' ' + (p.firstAlt || '');
        if (PROMO.test(cap)) { out.near_misses.push(nearMiss(handle, 'promo/hiring post', reasonToStatus('promo/hiring post'))); continue; }
        out.candidates.push({
          account: '@' + handle,
          url: postUrl.replace(/\/$/, '/'),
          post_type: v.isReel ? 'reel' : 'post',
          post_date: v.datetime ? v.datetime.slice(0, 10) : null,
          caption: (v.caption || '').slice(0, 300),
          why: 'biz=' + BUSINESS.find(k => htxt.includes(k)),
        });
        if (out.candidates.length >= 30) break;
      } catch (e) {
        out.anomalies.push('vet_exception:' + handle + ':' + String(e.message || e).slice(0, 120));
      }
      await sleep(rand(3000, 6000));
    }
    await page.close();
  } catch (e) {
    out.note = 'worker exception: ' + String(e.message || e).slice(0, 300);
    fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 2));
    console.log('RESULT worker_error'); process.exit(5);
  }
  const verdict = deriveOk(out);
  out.ok = verdict.ok;
  if (verdict.note) out.note = verdict.note;
  fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 2));
  console.log(`RESULT ${out.ok ? 'ok' : 'unhealthy'} candidates=${out.candidates.length} near_misses=${out.near_misses.length} queries=${out.queries_run}`);
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(6); });
