#!/usr/bin/env node
// ig-following-diag.js -- READ-ONLY deep diagnostic for the IG Following-list
// empty-render failure (2026-09-19). Attaches to the ig-profile headed Chrome
// (:9226), opens the Following dialog, and snapshots DOM/ARIA state at
// multiple points: fresh open, timed waits, scroll-triggered hydration,
// sustained observation, close/reopen, and alternate navigation (direct URL
// vs header-link click). Writes an evidence JSON file.
//
// STRICTLY READ-ONLY: never clicks Follow/Following/Unfollow, never clicks a
// suggested account, never mutates anything. Closes its own page on exit.
// Usage: node ig-following-diag.js <out.json>
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CDP = 'http://localhost:9226';
const PROFILE_URL = 'https://www.instagram.com/nolanpigi/';
const LIST_URL = 'https://www.instagram.com/nolanpigi/following/';
const NON_PROFILE = /^(explore|reels|direct|accounts|stories|p|reel|tv|nolanpigi)$/i;

function snapshotDialog(nonProfileSrc) {
  const NON_PROFILE = new RegExp(nonProfileSrc);
  return {
    dialogCount: document.querySelectorAll('div[role="dialog"]').length,
    dialogs: Array.from(document.querySelectorAll('div[role="dialog"]')).map(dlg => {
      const scroller = Array.from(dlg.querySelectorAll('div'))
        .find(d => d.scrollHeight > d.clientHeight + 40) || null;
      const links = Array.from(dlg.querySelectorAll('a[href]'));
      const profileLinks = [];
      const seen = new Set();
      for (const a of links) {
        const m = (a.getAttribute('href') || '').match(/^\/([A-Za-z0-9._]+)\/?$/);
        if (!m || NON_PROFILE.test(m[1]) || seen.has(m[1])) continue;
        seen.add(m[1]);
        profileLinks.push(m[1]);
      }
      const btns = Array.from(dlg.querySelectorAll('div[role="button"], button'));
      const btnTexts = {};
      const rowSamples = [];
      for (const b of btns) {
        const t = (b.innerText || '').trim();
        if (!t) continue;
        btnTexts[t] = (btnTexts[t] || 0) + 1;
      }
      // sample up to 8 rows: username + its button text
      for (const u of profileLinks.slice(0, 8)) {
        let found = null;
        for (const b of btns) {
          let el = b, row = null;
          for (let d = 0; d < 8 && el && el !== dlg; d++) {
            el = el.parentElement;
            if (el && (el.innerText || '').includes(u)) { row = el; break; }
          }
          if (row) { found = (b.innerText || '').trim(); break; }
        }
        rowSamples.push({ username: u, buttonText: found });
      }
      const text = dlg.innerText || '';
      return {
        profileLinkCount: profileLinks.length,
        btnTexts,
        rowSamples,
        scroller: scroller ? {
          scrollHeight: scroller.scrollHeight,
          clientHeight: scroller.clientHeight,
          scrollTop: scroller.scrollTop,
        } : null,
        hasEmptyStateText: /once you follow people/i.test(text),
        hasSuggestedHeading: /suggested for you/i.test(text),
        dialogTextLen: text.length,
        dialogTextHead: text.slice(0, 400).replace(/\n/g, ' | '),
      };
    }),
  };
}

function scrollOnce() {
  const dlg = document.querySelector('div[role="dialog"]');
  if (!dlg) return -1;
  const scroller = Array.from(dlg.querySelectorAll('div'))
    .find(d => d.scrollHeight > d.clientHeight + 40);
  if (!scroller) return -1;
  scroller.scrollTo(0, scroller.scrollHeight);
  return scroller.scrollHeight;
}

function headerFollowingCount() {
  const links = Array.from(document.querySelectorAll('a[href]'));
  for (const a of links) {
    const m = /^\s*([\d,]+)\s+following\s*$/i.exec(a.innerText || '');
    if (m) return m[1];
  }
  return null;
}

(async () => {
  const outPath = process.argv[2] || 'ig-following-diag.result.json';
  const ev = { startedAt: new Date().toISOString(), phases: [], net: { ok: 0, fail: 0, failedUrls: [] } };
  const write = (o) => fs.writeFileSync(outPath, JSON.stringify(o, null, 2));
  const phase = (name, data) => ev.phases.push({ name, at: new Date().toISOString(), ...data });
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP, { timeout: 30000 });
  } catch (e) {
    write({ ok: false, infra: 'cdp_unavailable', note: String(e.message || e).slice(0, 150) });
    console.log('RESULT diag_cdp_unavailable');
    process.exit(3);
  }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    const page = await ctx.newPage();
    page.on('response', r => {
      const url = r.url();
      if (/instagram\.com\/(graphql|api\/v1)/.test(url)) {
        if (r.ok()) ev.net.ok++;
        else { ev.net.fail++; if (ev.net.failedUrls.length < 10) ev.net.failedUrls.push(r.status() + ' ' + url.slice(0, 120)); }
      }
    });

    // Phase 1: profile load, header count.
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);
    phase('profile_header', {
      headerFollowing: await page.evaluate(headerFollowingCount).catch(() => null),
      loginOk: await page.evaluate(() => !!document.querySelector('[aria-label="Home"]')).catch(() => false),
    });

    // Phase 2: alternate navigation -- direct /following/ URL.
    await page.goto(LIST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(8000);
    phase('direct_url_nav', await page.evaluate(snapshotDialog, NON_PROFILE.source).catch(e => ({ evalError: String(e).slice(0, 120) })));

    // Phase 3: header-link click path (same as worker fallback).
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(6000);
    const clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[role="link"], a[href]'));
      const t = links.find(a => /^\s*[\d,]+\s+following\s*$/i.test((a.innerText || '')));
      if (t) { t.click(); return true; }
      return false;
    }).catch(() => false);
    await sleep(2500);
    phase('click_open_t2s', { clicked, ...(await page.evaluate(snapshotDialog, NON_PROFILE.source).catch(e => ({ evalError: String(e).slice(0, 120) }))) });
    await sleep(6000);
    phase('click_open_t8s', await page.evaluate(snapshotDialog, NON_PROFILE.source).catch(e => ({ evalError: String(e).slice(0, 120) })));

    // Phase 4: scroll-triggered hydration with progressive snapshots.
    const scrollSnaps = [];
    for (let i = 0; i < 12; i++) {
      const h = await page.evaluate(scrollOnce).catch(() => -1);
      await sleep(2200);
      if (i % 3 === 2 || i === 11) {
        scrollSnaps.push({ scroll: i + 1, scrollHeight: h, ...(await page.evaluate(snapshotDialog, NON_PROFILE.source).catch(e => ({ evalError: 'e' }))) });
      }
      if (h < 0) break;
    }
    phase('scroll_hydration', { scrollSnaps: scrollSnaps.map(s => ({ scroll: s.scroll, scrollHeight: s.scrollHeight, profileLinkCount: ((s.dialogs && s.dialogs[0]) || {}).profileLinkCount ?? null, btnTexts: ((s.dialogs && s.dialogs[0]) || {}).btnTexts || null })) });

    // Phase 5: sustained observation -- does it hydrate late?
    await sleep(20000);
    phase('sustained_t20s', await page.evaluate(snapshotDialog, NON_PROFILE.source).catch(e => ({ evalError: String(e).slice(0, 120) })));

    // Phase 6: close/reopen cycle.
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(3000);
    const reopened = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[role="link"], a[href]'));
      const t = links.find(a => /^\s*[\d,]+\s+following\s*$/i.test((a.innerText || '')));
      if (t) { t.click(); return true; }
      return false;
    }).catch(() => false);
    await sleep(8000);
    phase('close_reopen', { reopened, ...(await page.evaluate(snapshotDialog, NON_PROFILE.source).catch(e => ({ evalError: String(e).slice(0, 120) }))) });

    ev.netSummary = { graphqlOk: ev.net.ok, graphqlFail: ev.net.fail, failedUrls: ev.net.failedUrls };
    delete ev.net;
    write({ ok: true, ...ev });
    const last = ev.phases[ev.phases.length - 1];
    const d0 = (last.dialogs && last.dialogs[0]) || {};
    console.log('RESULT diag_ok header=' + (ev.phases[0] || {}).headerFollowing + ' finalLinks=' + (d0.profileLinkCount ?? '?') + ' btns=' + JSON.stringify(d0.btnTexts || {}));
    await page.close().catch(() => {});
    process.exit(0);
  } catch (e) {
    write({ ok: false, note: 'diag exception: ' + String(e.message || e).slice(0, 300), phases: ev.phases });
    console.log('RESULT diag_exception');
    process.exit(5);
  }
})();
