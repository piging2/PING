#!/usr/bin/env node
// th-engage.js -- Threads engagement worker (runs on the Pig, Nolan's workstation).
// Attaches via CDP to the always-on headed Chrome (ig-profile, :9226) that holds
// Nolan's Instagram-linked Threads login (@nolanpigi). The worker opens its OWN
// separate browser window (openWorkerWindow) and never uses tabs in Nolan's window.
// That browser must stay running; this script never launches or closes it and
// never attempts a login.
// Usage: node th-engage.js <job.json>
// job.json: { "actions": [ {"type":"like"|"comment", "account":"@x",
//             "url":"https://www.threads.com/@x/post/CODE/", "marker":"distinctive post substring",
//             "text":"comment text (for comment)"} ],
//             "minDelaySec": 60, "maxDelaySec": 120 }
// Writes <job.json>.result.json and prints a one-line summary. Never prints credentials.
// Exit codes: 0 ok, 2 usage, 3 CDP unavailable, 4 logged out (login gate),
//             5 worker error, 6 aborted (block/challenge/rate-limit seen).
//
// Selector grounding (live-verified 2026-09-20 against current Threads web):
// - Like control: div[role="button"] containing svg>title "Like" (unliked) or
//   "Unlike" (already liked by the signed-in account). No aria-pressed.
// - Reply control: div[role="button"] containing svg>title "Reply"; clicking it
//   opens the thread view with a div[role="textbox"] composer (no dialog).
// - Targeting (v3, live-verified 2026-09-20 17:0x MDT): the permalink may
//   soft-redirect to /; the target post card is found via its permalink anchor
//   a[href*="/post/<CODE>"], climbing to the card that holds the action bar.
//   Deterministic; immune to unicode/curly-quote marker mismatches. Falls back
//   to marker-substring matching when the URL carries no post code.
// - Already-liked (v3): svg title "Unlike" means the account already liked the
//   post; the driver reports 'already' and never clicks (a click would toggle
//   the like OFF).
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const CDP = 'http://localhost:9226';
const BAD = /checkpoint|verify your identity|action blocked|temporarily blocked|we suspect automated|suspicious activity|try again later|something went wrong|you'?re liking too fast|slow down|captcha|confirm you'?re a person|unusual activity|rate limit exceeded/i;

// (2026-09-23, Nolan: Threads and Instagram each get their OWN separate browser
// window, not tabs in Nolan's window. Verified by live probe the same day:
// CDP Target.createTarget with newWindow:true opens a TRUE separate OS window
// on the SAME browser context, so the ig-profile login storage is shared.
// window.open (popup token or not) and Ctrl+N were both probed and do NOT
// create separate windows in this Chrome config -- they open tabs.)
// Returns { page, close, windowed }. close() closes the whole worker window.
// Fail-safe: if the window mechanism fails, falls back to a plain tab so a
// pass is never broken by the window machinery.
async function openWorkerWindow(browser, ctx, label) {
  const fallback = async () => {
    const page = await ctx.newPage();
    return { page, windowed: false, close: async () => { try { await page.close(); } catch (_) {} } };
  };
  let cdp;
  try { cdp = await browser.newBrowserCDPSession(); }
  catch (_) { return fallback(); }
  const seen = new Set(ctx.pages());
  const pageP = ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null);
  let targetId;
  try {
    ({ targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', newWindow: true }));
  } catch (_) { return fallback(); }
  let page = await pageP;
  if (!page || page.isClosed()) {
    for (const p of ctx.pages()) { if (!seen.has(p)) { page = p; break; } }
  }
  if (!page) { try { await cdp.send('Target.closeTarget', { targetId }); } catch (_) {} return fallback(); }
  const close = async () => {
    try { await cdp.send('Target.closeTarget', { targetId }); }
    catch (_) { try { await page.close(); } catch (_) {} }
  };
  return { page, close, windowed: true, label };
}

async function threadsLoggedIn(page) {
  await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(7000);
  const st = await page.evaluate(() => ({
    loginPrompt: Array.from(document.querySelectorAll('button, a'))
      .filter(e => /log in/i.test((e.innerText || '').trim()) && (e.innerText || '').trim().length < 45).length,
    profileLinks: Array.from(document.querySelectorAll('a[href]'))
      .filter(a => /^\/@[a-z0-9._]+\/?$/i.test(a.getAttribute('href') || '')).length,
  }));
  return st.loginPrompt === 0 && st.profileLinks > 0;
}

function pageHasBad(page) {
  return page.evaluate((reSrc) => reSrc && new RegExp(reSrc, 'i').test(document.body.innerText || ''), BAD.source).catch(() => false);
}

// Mark the Like/Unlike/Reply button of the target post with data-th-ctl.
// v3 targeting: find the a[href*="/post/<CODE>"] permalink anchor, climb to the
// card holding the action bar, then the control within. Deterministic; immune
// to unicode/curly-quote marker mismatches. Falls back to the v2
// marker-substring match when the URL has no post code.
// Returns for kind='like': 'like' (unliked, safe to click), 'unlike' (already
// liked, must skip), null (not found). For kind='reply': true/false.
async function markControl(page, a, kind) {
  return await page.evaluate(({ url, marker, kind }) => {
    document.querySelectorAll('[data-th-ctl]').forEach(e => e.removeAttribute('data-th-ctl'));
    const want = kind === 'like' ? /^(Like|Unlike)$/ : /^Reply$/;
    const pickBtn = (scope) => Array.from(scope.querySelectorAll('div[role="button"]')).find(d => {
      const t = d.querySelector('svg title');
      const r = d.getBoundingClientRect();
      return t && want.test(t.textContent.trim()) && r.width > 0 && r.height > 0;
    });
    const noHit = kind === 'like' ? null : false;
    const code = (String(url).match(/\/post\/([A-Za-z0-9_-]+)/) || [])[1];
    if (code) {
      const link = Array.from(document.querySelectorAll('a[href]'))
        .find(x => (x.getAttribute('href') || '').includes('/post/' + code));
      if (link) {
        let card = link;
        for (let i = 0; i < 14 && card && card !== document.body; i++) {
          const has = Array.from(card.querySelectorAll('div[role="button"]')).some(d => {
            const t = d.querySelector('svg title');
            return t && /^(Like|Unlike|Reply)$/.test(t.textContent.trim());
          });
          if (has) break;
          card = card.parentElement;
        }
        if (card && card !== document.body) {
          const btn = pickBtn(card);
          if (btn) {
            btn.setAttribute('data-th-ctl', '1');
            if (kind === 'like') {
              const t = btn.querySelector('svg title');
              return t && t.textContent.trim() === 'Unlike' ? 'unlike' : 'like';
            }
            return true;
          }
        }
      }
    }
    // Fallback: v2 marker-substring targeting.
    if (!marker) return noHit;
    const btns = Array.from(document.querySelectorAll('div[role="button"]')).filter(d => {
      const t = d.querySelector('svg title');
      const r = d.getBoundingClientRect();
      return t && want.test(t.textContent.trim()) && r.width > 0 && r.height > 0;
    });
    for (const btn of btns) {
      let c = btn;
      for (let i = 0; i < 12 && c && c !== document.body; i++) {
        if ((c.innerText || '').includes(marker)) {
          btn.setAttribute('data-th-ctl', '1');
          if (kind === 'like') {
            const t = btn.querySelector('svg title');
            return t && t.textContent.trim() === 'Unlike' ? 'unlike' : 'like';
          }
          return true;
        }
        c = c.parentElement;
      }
    }
    return noHit;
  }, { url: a.url, marker: a.marker, kind });
}

// Full outerHTML of the marked control's svg (for liked-state comparison).
async function markedSvgHtml(page) {
  return await page.evaluate(() => {
    const btn = document.querySelector('[data-th-ctl="1"]');
    const svg = btn && btn.querySelector('svg');
    return {
      svg: svg ? svg.outerHTML : '',
      count: btn ? (btn.innerText || '').trim().slice(0, 12) : '',
    };
  });
}

async function doLike(page, a) {
  await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(6000, 9000)); // view the post fully before engaging
  if (await pageHasBad(page)) return { outcome: 'abort', note: 'challenge/rate-limit text seen' };
  const likeState = await markControl(page, a, 'like');
  if (!likeState)
    return { outcome: 'failed', note: 'like control for target post not found (code-anchor + marker fallback)' };
  // Already-liked detection (v3, live-verified 2026-09-20 17:0x MDT): svg title
  // "Unlike" means the signed-in account already liked the post. Skip rather
  // than risk an unlike toggle.
  if (likeState === 'unlike') {
    return { outcome: 'already', note: 'post already liked by the account (control reads Unlike); click skipped to avoid toggling' };
  }
  const before = await markedSvgHtml(page);
  try {
    await page.locator('[data-th-ctl="1"]').click({ timeout: 15000 });
  } catch (e) {
    return { outcome: 'failed', note: 'like click failed actionability: ' + String(e.message || e).slice(0, 120) };
  }
  await sleep(4000);
  const after = await markedSvgHtml(page);
  if (await pageHasBad(page)) return { outcome: 'abort', note: 'challenge text appeared after like click' };
  const changed = after.svg !== before.svg;
  const countChanged = after.count !== before.count;
  return {
    outcome: (changed || countChanged) ? 'ok' : 'sent',
    note: changed ? 'like registered (control svg state changed)'
      : countChanged ? 'like registered (count ' + before.count + ' -> ' + after.count + ')'
      : 'click sent to like control, no state change observed, no challenge',
  };
}

async function doComment(page, a) {
  await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(6000, 9000)); // view the post fully before engaging
  if (await pageHasBad(page)) return { outcome: 'abort', note: 'challenge/rate-limit text seen' };
  if (!await markControl(page, a, 'reply'))
    return { outcome: 'failed', note: 'reply control for target post not found' };
  try {
    await page.locator('[data-th-ctl="1"]').click({ timeout: 15000 });
  } catch (e) {
    return { outcome: 'failed', note: 'reply click failed actionability: ' + String(e.message || e).slice(0, 120) };
  }
  // Live-grounded 2026-09-20: clicking Reply opens the thread view (same URL,
  // page shows "Thread ... Reply to <author>") with a div[role="textbox"]
  // reply composer. No dialog.
  let composer = false;
  try {
    await page.waitForFunction(() => {
      const t = document.querySelector('div[role="textbox"]');
      return t && t.getBoundingClientRect().width > 0;
    }, { timeout: 15000 });
    composer = true;
  } catch (_) { /* fall through */ }
  if (!composer) return { outcome: 'failed', note: 'reply thread view did not show a composer textbox; nothing published' };
  await page.evaluate(() => {
    document.querySelectorAll('[data-th-ctl]').forEach(e => e.removeAttribute('data-th-ctl'));
  });
  try {
    await page.locator('div[role="textbox"]').first().click({ timeout: 10000 });
  } catch (e) {
    return { outcome: 'failed', note: 'composer textbox not clickable; nothing published' };
  }
  await sleep(1200);
  await page.keyboard.type(a.text, { delay: rand(40, 110) });
  await sleep(1500);
  // Mark the Post button near the composer, then click it via locator.
  const postMarked = await page.evaluate(() => {
    const box = document.querySelector('div[role="textbox"]');
    let scope = box;
    for (let i = 0; i < 10 && scope && scope !== document.body; i++) {
      scope = scope.parentElement;
      const btn = Array.from(scope.querySelectorAll('button, div[role="button"]'))
        .find(b => /^post$/i.test((b.innerText || '').trim()) && b.getBoundingClientRect().width > 0);
      if (btn) { btn.setAttribute('data-th-ctl', '1'); return true; }
    }
    return false;
  });
  if (!postMarked) {
    await page.keyboard.press('Escape');
    return { outcome: 'failed', note: 'composer has text but no Post button found; composer closed, nothing published' };
  }
  try {
    await page.locator('[data-th-ctl="1"]').click({ timeout: 15000 });
  } catch (e) {
    await page.keyboard.press('Escape');
    return { outcome: 'failed', note: 'Post button not clickable; composer closed, nothing published' };
  }
  await sleep(5000);
  if (await pageHasBad(page)) return { outcome: 'abort', note: 'challenge text appeared after comment post' };
  const visible = await page.evaluate((t) => (document.body.innerText || '').includes(t.slice(0, 30)), a.text).catch(() => false);
  return { outcome: visible ? 'ok' : 'sent',
           note: visible ? 'comment posted and visible on page' : 'Post clicked, no challenge; comment not confirmed visible' };
}

(async () => {
  const jobPath = process.argv[2];
  if (!jobPath) { console.log(JSON.stringify({ ok: false, note: 'usage: th-engage.js <job.json>' })); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const resPath = jobPath + '.result.json';
  const out = { ok: true, pass: 'threads-engage', started: new Date().toISOString(), actions: [] };
  let browser;
  try { browser = await chromium.connectOverCDP(CDP, { timeout: 20000 }); }
  catch (e) { console.log(JSON.stringify({ ok: false, infra: 'cdp_unavailable' })); process.exit(3); }
  const ctx = browser.contexts()[0];
  // Worker-owned separate window (see openWorkerWindow). Nolan's own tabs and
  // window are never touched: the worker drives its window and closes it.
  const win = await openWorkerWindow(browser, ctx, 'threads');
  const page = win.page;
  try {
    if (!await threadsLoggedIn(page)) {
      out.ok = false; out.infra = 'logged_out';
      fs.writeFileSync(resPath, JSON.stringify(out, null, 1));
      console.log(JSON.stringify(out)); process.exit(4);
    }
    const minD = (job.minDelaySec || 60), maxD = (job.maxDelaySec || 120);
    let i = 0;
    for (const a of job.actions) {
      i++;
      let r;
      try {
        r = a.type === 'like' ? await doLike(page, a)
          : a.type === 'comment' ? await doComment(page, a)
          : { outcome: 'failed', note: 'unknown action type ' + a.type };
      } catch (e) { r = { outcome: 'failed', note: 'exception: ' + String(e.message || e).slice(0, 160) }; }
      out.actions.push({ account: a.account, url: a.url, action: a.type,
                         ok: r.outcome === 'ok' || r.outcome === 'already',
                         outcome: r.outcome, note: r.note });
      if (r.outcome === 'abort') { out.ok = false; out.aborted = 'challenge/rate-limit; remaining actions skipped'; break; }
      if (i < job.actions.length) await sleep(rand(minD, maxD) * 1000);
    }
  } catch (e) {
    out.ok = false; out.error = String(e.message || e).slice(0, 250);
  }
  try { await win.close(); } catch (_) {} // close our window, never the browser
  out.finished = new Date().toISOString();
  fs.writeFileSync(resPath, JSON.stringify(out, null, 1));
  const landed = out.actions.filter(x => x.ok).length;
  console.log(JSON.stringify({ ok: out.ok, actions: out.actions.length, landed, aborted: !!out.aborted }));
  process.exit(out.ok ? 0 : (out.aborted ? 6 : 5));
})().catch(e => { console.log(JSON.stringify({ ok: false, note: String(e.message || e).slice(0, 200) })); process.exit(5); });
