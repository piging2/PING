#!/usr/bin/env node
// th-permalink-probe.js -- READ-ONLY Threads permalink enumeration probe.
// Investigates the profile-URL vs Following-feed enumeration boundary (THREADS-001)
// by loading each candidate post permalink and reporting whether the post page
// renders with an identifiable like control, WITHOUT clicking anything.
// Contract: READS ONLY. Navigates only. Never clicks, likes, comments, follows,
// reposts, or touches any engagement control. Never attempts a login.
// Usage: node th-permalink-probe.js <job.json>
// job.json: { "posts": [{"account":"@x","url":"https://www.threads.com/..."}], "resultFile": "C:/.../probe.json" }
// Writes JSON to resultFile and prints one summary line. Exit codes:
// 0 ok, 2 usage, 3 CDP unavailable, 4 logged out (login gate), 5 worker error.
const fs = require('fs');
const { chromium } = require('C:/Users/nolan/.local/share/pigi/fb-engage/node_modules/playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const CDP = 'http://localhost:9226';
const BAD = /checkpoint|verify your identity|action blocked|temporarily blocked|we suspect automated|suspicious activity|try again later|something went wrong/i;

async function threadsLoggedIn(page) {
  await page.goto('https://www.threads.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);
  const st = await page.evaluate(() => {
    const html = document.documentElement.innerHTML.slice(0, 4000);
    return {
      hasLoginForm: /name="username"|Log in to Threads/i.test(html),
      hasNav: !!document.querySelector('a[aria-label="Home"], [aria-label="Search"]'),
      handle: (() => { const m = document.documentElement.innerHTML.match(/@([a-z0-9._]{1,30})/); return m ? m[1] : null; })(),
      bad: html.slice(0, 4000)
    };
  });
  if (BAD.test(await page.content())) return { ok: false, reason: 'bad_page' };
  const loggedIn = !st.hasLoginForm && st.hasNav;
  return { ok: loggedIn, reason: loggedIn ? 'nav_present' : 'login_gate_failed' };
}

(async () => {
  const jobPath = process.argv[2];
  if (!jobPath) { console.log('usage: th-permalink-probe.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  const posts = job.posts || [];
  const out = { ok: true, logged_in: false, signed_in_as: null, probes: [], note: '' };

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP, { timeout: 20000 });
  } catch (e) {
    out.ok = false; out.note = 'cdp_unavailable: ' + String(e.message || e).slice(0, 160);
    fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
    console.log(JSON.stringify({ ok: false, note: out.note }));
    process.exit(3);
  }
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  try {
    const gate = await threadsLoggedIn(page);
    out.logged_in = gate.ok;
    if (!gate.ok) {
      out.ok = false; out.note = 'login_gate_failed: ' + gate.reason;
      fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
      console.log(JSON.stringify({ ok: false, note: out.note }));
      await page.close();
      process.exit(4);
    }
    out.signed_in_as = gate.reason === 'nav_present' ? '@nolanpigi' : null;

    for (const p of posts) {
      const probe = { account: p.account, url: p.url, loaded: false, post_detected: false, like_control: 'not_found', like_detail: '' };
      try {
        await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(rand(3500, 6000));
        probe.loaded = true;
        const r = await page.evaluate((acct) => {
          const body = document.documentElement.innerText || '';
          const acctName = (acct || '').replace(/^@/, '').toLowerCase();
          const postDetected = acctName.length > 0 && body.toLowerCase().includes(acctName);
          const hearts = [];
          for (const el of document.querySelectorAll('button, div[role="button"]')) {
            const al = (el.getAttribute('aria-label') || '').toLowerCase();
            if (/^like$/.test(al) || /^unlike$/.test(al)) {
              hearts.push({ label: el.getAttribute('aria-label'), pressed: el.getAttribute('aria-pressed') });
            }
          }
          const svgHearts = Array.from(document.querySelectorAll('svg')).filter(s =>
            /like|heart/i.test(s.getAttribute('aria-label') || '')).length;
          return { postDetected, hearts, svgHearts, bodyLen: body.length,
                   bad: /checkpoint|verify your identity|action blocked|temporarily blocked|something went wrong/i.test(body) };
        }, p.account);
        probe.post_detected = r.postDetected;
        if (r.hearts.length > 0) { probe.like_control = 'found_button'; probe.like_detail = JSON.stringify(r.hearts.slice(0, 3)); }
        else if (r.svgHearts > 0) { probe.like_control = 'found_svg_only'; probe.like_detail = r.svgHearts + ' svg heart nodes'; }
        probe.body_len = r.bodyLen;
        if (r.bad) probe.like_detail += ' | PAGE_BAD_FLAG';
      } catch (e) {
        probe.like_detail = 'goto_error: ' + String(e.message || e).slice(0, 160);
      }
      out.probes.push(probe);
      await sleep(rand(4000, 8000)); // human pacing between read-only loads
    }
    const found = out.probes.filter(p => p.like_control === 'found_button').length;
    out.note = `probed ${out.probes.length} permalinks; like control found as button on ${found}; read-only, zero engagement actions.`;
    fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1));
    console.log(JSON.stringify({ ok: true, probed: out.probes.length, like_buttons_found: found }));
    await page.close();
    process.exit(0);
  } catch (e) {
    out.ok = false; out.note = 'worker_error: ' + String(e.message || e).slice(0, 200);
    try { fs.writeFileSync(job.resultFile, JSON.stringify(out, null, 1)); } catch (_) {}
    console.log(JSON.stringify({ ok: false, note: out.note }));
    try { await page.close(); } catch (_) {}
    process.exit(5);
  }
})();
