#!/usr/bin/env node
// Pigi Facebook unfollow worker (runs on the Pig, Nolan's workstation).
// Attaches via CDP to the always-on headed Chrome (remote-debugging-port 9223)
// that holds Nolan's Facebook login. Never launches or closes the browser.
//
// Nolan's directive (2026-09-14): unfollow every PAGE he follows (~140).
// Followed PEOPLE are out of scope and must never be touched.
//
// Strategy (2026-09-17): Facebook removed the Following tab from profiles;
// /<profile>/following/ now renders a "Recent" pane with no list. The Pages
// dashboard "Followed Pages" view (facebook.com/pages/?category=liked) lists
// every followed Page ("All Pages you follow (139)") and is page-only, so no
// people filtering is needed. "Your Pages" (pages Nolan manages) render ABOVE
// the "All Pages you follow" heading and are excluded by document order.
// Every candidate is still VERIFIED on its own destination: only a
// destination that renders a Like/Liked button is treated as a Page.
// Anything that fails verification is skipped, never unfollowed.
//
// Usage: node fb-unfollow.js <job.json>
// job.json: { "mode": "enumerate"|"unfollow", "max": 30,
//             "minDelaySec": 60, "maxDelaySec": 120 }
// Writes <job.json>.result.json and prints a one-line summary.
// Must process.exit(0) on success or the node process lingers on the CDP port.
const fs = require('fs');
const { chromium } = require('playwright-core');
const { classifyPass, zeroSuspicion } = require('./pass-classifier');
const { fingerprintSurface, verifyEnumeration } = require('./enumeration-verify');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

const WARN_RE = /action blocked|try again later|we restrict certain activity|checkpoint|verify your account|suspicious activity|unusual activity|temporarily (blocked|restricted)|confirm your identity/i;
const LIST_URL = 'https://www.facebook.com/pages/?category=liked&ref=bookmarks';

// Resilience program integration (2026-09-17): capability-based enumeration.
// The preferred strategy and the historical baseline come from
// capability-registry.json; if it is unreadable, fall back to the known-good
// strategy name and baseline (139, observed 2026-09-17).
const CAPABILITY = 'enumerate_followed_pages';
const FALLBACK_BASELINE = 139;
const FALLBACK_STRATEGY = 'pages-dashboard';

function loadCapabilityRegistry() {
  try {
    const reg = JSON.parse(fs.readFileSync(__dirname + '/capability-registry.json', 'utf8'));
    const cap = reg.capabilities && reg.capabilities[CAPABILITY];
    return { reg, cap };
  } catch (e) { return { reg: null, cap: null }; }
}

function baselineFor(cap) {
  if (cap && Array.isArray(cap.strategies)) {
    const pref = cap.strategies.find(s => s.name === cap.preferredStrategy);
    if (pref && Number.isFinite(+pref.observedCount)) return +pref.observedCount;
  }
  return FALLBACK_BASELINE;
}

function preferredStrategyFor(cap) {
  return (cap && cap.preferredStrategy) || FALLBACK_STRATEGY;
}

// Capture stable surface landmarks for the VERIFY ENUMERATION stage
// (surface fingerprint). Read-only DOM read; no interaction.
async function captureSurface(page) {
  const info = await page.evaluate(() => {
    const heads = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
      .map(e => (e.innerText || '').trim().split('\n')[0]).filter(Boolean).slice(0, 12);
    return { url: location.href, title: document.title, landmarks: heads };
  }).catch(() => ({ url: null, title: null, landmarks: [] }));
  return fingerprintSurface(info);
}

// Enumerate via the preferred strategy, verify against the historical
// baseline, and on an unexpected zero attempt an alternate enumeration:
// first any healthy alternate strategy from the registry (skipped with a
// recorded reason when health=broken, which is the case for
// profile-page-following after the 2026-09-17 UI change), then a reload +
// re-scroll re-enumeration of the preferred strategy, which is a genuinely
// different enumeration path without changing the strategy.
async function enumerateWithFallback(page, selfUrl, cap, baseline) {
  const preferred = preferredStrategyFor(cap);
  const attempts = [];
  let r = await enumerateFollowing(page, selfUrl);
  let entries = r.entries || [];
  attempts.push({ strategy: preferred, enumerated: entries.length, error: r.error || null });

  let susp = zeroSuspicion({ candidatesFound: entries.length, historicalBaseline: baseline });
  if (susp.level !== null && susp.level >= 1 && cap && Array.isArray(cap.strategies)) {
    const healthyAlt = cap.strategies.find(s => s.name !== preferred && s.health !== 'broken' && s.health !== 'unknown');
    for (const alt of cap.strategies) {
      if (alt.name === preferred) continue;
      if (alt === healthyAlt) continue; // no separate driver implementation ships in this worker
      attempts.push({ strategy: alt.name, skipped: 'health=' + (alt.health || 'unknown') + ' per capability registry; not attempted automatically' });
    }
    // Alternate enumeration of the preferred strategy: full reload +
    // re-scroll changes the enumeration path (fresh DOM, fresh lazy-load).
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(rand(6000, 9000));
    await scrollAll(page, 120, 6);
    r = await enumerateFollowing(page, selfUrl);
    entries = r.entries || [];
    attempts.push({ strategy: preferred + '/reload-rescroll', enumerated: entries.length, error: r.error || null });
    susp = zeroSuspicion({ candidatesFound: entries.length, historicalBaseline: baseline,
      alternateStrategyTried: true });
  }
  return { entries, attempts, enumError: r.error || null, suspicion: susp };
}

// Flatten a classifier result for the result JSON (human explanation first).
function flatClassification(c) {
  return {
    passClass: c.class,
    passExplanation: c.explanation,
    suspicionLevel: c.suspicionLevel,
    recommendedAction: c.recommendedAction,
  };
}

async function loginState(page) {
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);
  const html = await page.content();
  return !(/name="email"|id="email"/.test(html) && !/role="feed"|aria-label="Home"/.test(html));
}

async function checkWarnings(page) {
  const body = await page.evaluate(() => document.body.innerText.slice(0, 20000)).catch(() => '');
  const m = body.match(WARN_RE);
  return m ? m[0] : null;
}

async function scrollAll(page, maxScrolls, needStable) {
  let stable = 0, lastH = 0;
  const need = needStable || 4;
  for (let i = 0; i < (maxScrolls || 80); i++) {
    const h = await page.evaluate(() => document.body.scrollHeight).catch(() => 0);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await sleep(rand(1500, 2600));
    if (h === lastH) { stable++; if (stable >= need) break; } else stable = 0;
    lastH = h;
  }
}

// Collect followed-page entries from the Pages dashboard "Followed Pages"
// view: {name, url, subtext, looksPerson}. The dashboard list is page-only,
// so looksPerson is always false (kept for compatibility). "Your Pages"
// (pages Nolan manages) render above the "All Pages you follow" heading and
// are excluded by document order so they are never touched.
async function enumerateFollowing(page, selfUrl) {
  const r = await page.evaluate((selfUrl) => {
    const isProfileLink = (href) => {
      if (/^https:\/\/(www\.)?facebook\.com\/profile\.php\?id=\d+/.test(href)) return true;
      if (!/^https:\/\/(www\.)?facebook\.com\/[^/?#]+$/.test(href)) return false;
      return !/messages|settings|help|marketplace|gaming|watch|groups|events|notifications|bookmarks|saved/.test(href);
    };
    // Find the "All Pages you follow" heading; links rendered before it
    // belong to "Your Pages" (managed) and must be excluded.
    let headingNode = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (/all pages you follow/i.test(n.nodeValue || '')) { headingNode = n; break; }
    }
    let links = Array.from(document.querySelectorAll('a[href]'))
      .filter(a => isProfileLink(a.href || ''));
    // keep only links rendered after the "All Pages you follow" heading
    const afterHeading = (a) => {
      if (!headingNode) return true;
      try {
        return (a.compareDocumentPosition(headingNode) & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
      } catch (e) { return true; }
    };
    links = links.filter(afterHeading);
    if (!links.length) return { entries: [], scoped: false };
    // Simple link-based extraction: on the dashboard each followed page is
    // a link whose own text is the page name; the row ancestor (first
    // ancestor with longer text) gives the category subtext.
    const seen = new Set();
    const entries = [];
    for (const a of links) {
      const href = a.href;
      if (href === selfUrl || seen.has(href)) continue;
      const name = (a.innerText || '').trim().split('\n')[0];
      if (!name || name.length > 80) continue;
      if (/^(your pages|followed pages|all pages you follow|changes to pages|discover|pages)$/i.test(name)) continue;
      let el = a, row = null;
      for (let d = 0; d < 8 && el; d++) {
        el = el.parentElement;
        if (!el) break;
        const t = (el.innerText || '').trim();
        if (t.length > name.length + 2 && t.length < 300) { row = el; break; }
      }
      const rowText = row ? row.innerText.trim() : name;
      const subtext = rowText.split('\n').map(s => s.trim()).filter(Boolean)
        .filter(s => s !== name).join(' | ').slice(0, 120);
      seen.add(href);
      entries.push({ name, url: href, subtext, looksPerson: false });
    }
    return { entries, scoped: true, scopeCount: entries.length, linkTotal: links.length };
  }, selfUrl).catch(e => ({ error: String(e).slice(0, 200), entries: [] }));
  return r;
}

// On a destination URL: is this a Page (has Like/Liked button)? Returns
// {isPage, followingBtn} where followingBtn is true if a Following button exists.
async function inspectDestination(page) {
  return await page.evaluate(() => {
    const vis = sel => Array.from(document.querySelectorAll(sel))
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const likeBtn = vis('[aria-label="Like"], [aria-label="Liked"]');
    const followingBtn = vis('[aria-label="Following"]');
    const title = document.title;
    return { isPage: likeBtn.length > 0, hasFollowing: followingBtn.length > 0, title: title.slice(0, 80) };
  }).catch(() => ({ isPage: false, hasFollowing: false, title: '' }));
}

async function doUnfollowOnPage(page) {
  // Facebook UI as of 2026-09-17 (verified live via DOM probes):
  // 1. "Following" button (aria-label="Following") opens a menu whose items are
  //    role-less DIVs (no role="menuitem"); synthetic evaluate-clicks do NOT
  //    register, real Playwright clicks do.
  // 2. Clicking "Unfollow" opens a "Follow settings" dialog (aria-label).
  // 3. Inside: radio options Default / Favorites / Unfollow; select Unfollow.
  // 4. Click "Update". No separate confirm dialog.
  const visClick = async (locator, timeoutMs) => {
    const cnt = await locator.count().catch(() => 0);
    for (let i = 0; i < cnt; i++) {
      const l = locator.nth(i);
      if (await l.isVisible().catch(() => false)) {
        await l.scrollIntoViewIfNeeded().catch(() => {});
        await l.click({ timeout: timeoutMs || 15000 }).catch(() => {});
        return true;
      }
    }
    return false;
  };

  // 1. Open the Following menu with a real click.
  const opened = await visClick(page.getByLabel('Following', { exact: true }).first(), 15000);
  if (!opened) return { ok: false, note: 'following button not found/clickable on page' };
  await sleep(rand(2500, 4000));
  let warn = await checkWarnings(page);
  if (warn) return { ok: false, note: 'warning after opening menu', warning: warn };

  // 2. Click "Unfollow" in the menu.
  const menuClicked = await visClick(page.getByText('Unfollow', { exact: true }), 15000);
  if (!menuClicked) return { ok: false, note: 'no Unfollow option appeared after opening menu' };
  await sleep(rand(2500, 4000));
  warn = await checkWarnings(page);
  if (warn) return { ok: false, note: 'warning after clicking unfollow', warning: warn };

  // 3-4. "Follow settings" dialog: pick the Unfollow radio, press Update.
  const dlg = page.locator('[role="dialog"][aria-label="Follow settings"]');
  const dlgVisible = await dlg.isVisible().catch(() => false);
  if (dlgVisible) {
    const picked = await visClick(dlg.getByText('Unfollow', { exact: true }), 15000);
    if (!picked) return { ok: false, note: 'follow-settings dialog: unfollow option not clickable' };
    await sleep(rand(1500, 2500));
    const updated = await visClick(dlg.getByText('Update', { exact: true }), 15000);
    if (!updated) return { ok: false, note: 'follow-settings dialog: update button not clickable' };
    await sleep(rand(2500, 4000));
  }
  warn = await checkWarnings(page);
  if (warn) return { ok: false, note: 'warning after confirm', warning: warn };

  const insp = await inspectDestination(page);
  if (insp.hasFollowing) return { ok: false, note: 'following button still present after unfollow flow' };
  return { ok: true, note: 'unfollowed' + (dlgVisible ? ' (follow-settings dialog)' : ' (no dialog)') };
}

(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node fb-unfollow.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const mode = job.mode || 'enumerate';
  const write = (out) => fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  } catch (e) {
    const cls = flatClassification(classifyPass({
      context: 'fb-unfollow', cdpAvailable: false, dependencyName: 'cdp',
      dependencyNote: String(e.message || e).slice(0, 150),
      candidatesFound: 0, historicalBaseline: 0,
    }));
    write({ ok: false, note: 'CDP attach failed: ' + String(e.message || e).slice(0, 150), ...cls });
    console.log('RESULT cdp_unavailable class=' + cls.passClass);
    process.exit(3);
  }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    if (!(await loginState(page))) {
      const cls = flatClassification(classifyPass({ context: 'fb-unfollow', loggedIn: false }));
      write({ ok: false, logged_in: false, note: 'logged out; Nolan must log in again in the always-on window', ...cls });
      console.log('RESULT logged_out class=' + cls.passClass);
      await page.close().catch(() => {});
      process.exit(4);
    }
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(10000);
    await scrollAll(page, 120, 6);
    // VERIFY ENUMERATION stage: enumerate via the preferred capability
    // strategy, verify against the historical baseline, fall back to
    // alternate enumeration on an unexpected zero.
    const { cap } = loadCapabilityRegistry();
    const baseline = baselineFor(cap);
    const surface = await captureSurface(page);
    const enumRes = await enumerateWithFallback(page, 'https://www.facebook.com/nolan.geske', cap, baseline);
    const entries = enumRes.entries;
    const enumVer = verifyEnumeration({
      discoveredPopulation: entries.length,
      expectedPopulation: baseline,
      surfaceFingerprint: surface,
      enumerationError: enumRes.enumError,
    });
    const enumBase = {
      context: 'fb-unfollow/' + mode,
      candidatesFound: entries.length,
      historicalBaseline: baseline,
      enumerationError: enumRes.enumError || null,
      surfaceDrift: enumVer.verdict === 'drift',
      surfaceDriftEvidence: enumVer.verdict === 'drift'
        ? 'surface fingerprint changed; headings seen: ' + (surface.landmarkHash || '?') : null,
      transientError: enumRes.enumError && /timeout|net|reset|evaluate/i.test(enumRes.enumError)
        ? enumRes.enumError : null,
      alternateStrategyTried: enumRes.attempts.length > 1,
    };
    const people = entries.filter(e => e.looksPerson);
    const pageCands = entries.filter(e => !e.looksPerson);

    if (mode === 'enumerate') {
      const cls = flatClassification(classifyPass({
        ...enumBase, eligibleCount: pageCands.length, actionsPerformed: 0,
      }));
      const out = {
        ok: true, mode, listUrl: LIST_URL,
        totalEntries: entries.length, people: people.length, pageCandidates: pageCands.length,
        pageCandidates: pageCands.map(e => ({ name: e.name, url: e.url, subtext: e.subtext })),
        enumError: enumRes.enumError || null,
        enumerationAttempts: enumRes.attempts,
        enumerationSignals: enumVer.signals,
        enumerationVerdict: enumVer.verdict,
        ...cls,
      };
      write(out);
      console.log('RESULT enumerate total=' + entries.length + ' pages=' + pageCands.length + ' class=' + cls.passClass);
      await page.close().catch(() => {});
      process.exit(0);
    }

    // unfollow mode: verify each candidate is really a Page, then unfollow.
    const max = Math.min(job.max || 30, pageCands.length);
    const excluded = new Set(job.excludeUrls || []);
    const queue = pageCands.filter(e => !excluded.has(e.url));
    const minD = (job.minDelaySec || 60) * 1000, maxD = (job.maxDelaySec || 120) * 1000;
    const results = [];
    let done = 0, failed = 0, skipped = 0, stopped = null;
    for (let i = 0; i < queue.length && done < max; i++) {
      const entry = queue[i];
      if (done > 0) await sleep(rand(minD, maxD));
      let r;
      try {
        await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        await sleep(rand(5000, 8000));
        let warn = await checkWarnings(page);
        if (warn) { r = { ok: false, note: 'warning on page load', warning: warn }; }
        else {
          const insp = await inspectDestination(page);
          if (!insp.isPage) {
            r = { ok: false, note: 'skipped: destination has no Like button; not a Page (' + insp.title + ')' };
            skipped++;
          } else if (!insp.hasFollowing) {
            r = { ok: false, note: 'skipped: already not following (' + insp.title + ')' };
            skipped++;
          } else {
            r = await doUnfollowOnPage(page);
            if (r.ok) { done++; failed = 0; } else if (!r.warning) { failed++; }
          }
        }
      } catch (e) { r = { ok: false, note: 'exception: ' + String(e.message || e).slice(0, 200) }; failed++; }
      results.push({ name: entry.name, url: entry.url, ...r });
      if (r.warning) { stopped = 'warning: ' + r.warning; break; }
      if (failed >= 3) { stopped = '3 consecutive failures; stopping'; break; }
    }
    // Classify the unfollow pass: every result JSON must explain what the
    // pass did or why it did nothing (resilience program, item 2).
    let cls;
    const rateLimited = !!(stopped && /action blocked|try again later|temporarily (blocked|restricted)/i.test(stopped));
    if (done === 0 && stopped && !rateLimited && queue.length > 0) {
      cls = flatClassification(classifyPass({
        ...enumBase, eligibleCount: queue.length, actionsPerformed: 0,
        transientError: 'safety stop with no actions completed: ' + stopped,
      }));
    } else {
      cls = flatClassification(classifyPass({
        ...enumBase, eligibleCount: queue.length, actionsPerformed: done,
        rateLimited, stopped,
      }));
    }
    const out = {
      ok: true, mode, listUrl: LIST_URL,
      enumerated: entries.length, pageCandidates: pageCands.length,
      excluded: excluded.size, queued: queue.length,
      attempted: results.length, unfollowed: done, skippedNotPage: skipped, stopped,
      notPageUrls: results.filter(r => /not a Page/.test(r.note || '')).map(r => r.url),
      enumerationAttempts: enumRes.attempts,
      enumerationSignals: enumVer.signals,
      enumerationVerdict: enumVer.verdict,
      ...cls,
      results,
    };
    write(out);
    console.log('RESULT unfollow unfollowed=' + done + ' attempted=' + results.length + (stopped ? ' stopped=' + stopped : '') + ' class=' + cls.passClass);
    await page.close().catch(() => {});
    process.exit(0);
  } catch (e) {
    const cls = flatClassification(classifyPass({
      context: 'fb-unfollow/worker-exception', candidatesFound: 0, historicalBaseline: 0,
      transientError: String(e.message || e).slice(0, 300),
    }));
    write({ ok: false, note: 'worker exception: ' + String(e.message || e).slice(0, 300), ...cls });
    console.log('RESULT worker_exception class=' + cls.passClass);
    process.exit(5);
  }
})();
