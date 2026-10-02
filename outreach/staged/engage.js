#!/usr/bin/env node
// Pigi Facebook engagement worker (runs on the Pig, Nolan's workstation).
// Attaches via CDP to the always-on headed Chrome (remote-debugging-port 9223)
// that holds Nolan's Facebook login. That browser must stay running; the
// session does not survive restarts, so this script never launches or closes it.
// Usage: node engage.js <job.json>
// job.json: { "actions": [ {type:"like"|"comment", url, text?} ], "minDelaySec": 60, "maxDelaySec": 120 }
// Writes <job.json>.result.json and prints a one-line summary. Never prints credentials.
const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('playwright-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

// Eligibility envelope verification (staged 2026-10-01, engagement
// eligibility P0; NOT YET DEPLOYED to the Pig). Every action must carry an
// `eligibility` envelope stamped by the plan-time curate gate. The worker
// verifies the envelope BEFORE the external effect and refuses the action
// when the envelope is missing, tampered, stale, or not ELIGIBLE.
// This is the last of three enforcement points:
//   1. plan time:  engagement-guard.py curate stamps the envelope
//   2. dispatch:   engagement-guard.py filter re-evaluates the full reason
//                  set live + evidence-check verifies envelope freshness
//   3. worker:     this function, per action, before the click
// The worker cannot re-evaluate the full reason set (no registry access on
// the Pig); it verifies envelope integrity and freshness only. A registry
// change between dispatch and the click is NOT visible here; the dispatch-
// side evidence-check's data_sha256 comparison is the control for that.
const ELIGIBILITY_TTL_MS = 6 * 3600 * 1000;

function canonicalStringify(v) {
  // Must byte-match Python's json.dumps(v, sort_keys=True,
  // separators=(",", ":")) with ensure_ascii=True.
  if (v === null) return 'null';
  if (typeof v === 'number') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') {
    let out = '"';
    for (const ch of v) {
      const cp = ch.codePointAt(0);
      if (ch === '"') out += '\\"';
      else if (ch === '\\') out += '\\\\';
      else if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else if (cp < 0x20) out += '\\u' + cp.toString(16).padStart(4, '0');
      else if (cp <= 0x7e) out += ch;
      else if (cp <= 0xffff) out += '\\u' + cp.toString(16).padStart(4, '0');
      else {
        // Astral: Python ensure_ascii emits UTF-16 surrogate pairs.
        const v2 = cp - 0x10000;
        out += '\\u' + (0xd800 + (v2 >> 10)).toString(16).padStart(4, '0')
             + '\\u' + (0xdc00 + (v2 & 0x3ff)).toString(16).padStart(4, '0');
      }
    }
    return out + '"';
  }
  if (Array.isArray(v)) return '[' + v.map(canonicalStringify).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map(k => canonicalStringify(k) + ':' + canonicalStringify(v[k])).join(',') + '}';
}

function verifyEligibilityEnvelope(a) {
  const env = a && a.eligibility;
  if (!env || typeof env !== 'object')
    return { ok: false, note: 'missing eligibility envelope' };
  const body = { decision: env.decision, reasons: env.reasons,
                 evidence: env.evidence, function: env.function,
                 ttl_sec: env.ttl_sec, data_sha256: env.data_sha256 };
  let want;
  try {
    want = crypto.createHash('sha256')
      .update(Buffer.from(canonicalStringify(body), 'utf8')).digest('hex');
  } catch (e) {
    return { ok: false, note: 'envelope hash computation failed' };
  }
  if (env.evidence_hash !== want)
    return { ok: false, note: 'evidence_hash mismatch: envelope tampered or rebuilt' };
  if (env.decision !== 'ELIGIBLE')
    return { ok: false, note: 'envelope decision is ' + env.decision + ', not ELIGIBLE' };
  const checked = Date.parse(env.checked_at);
  if (!checked)
    return { ok: false, note: 'envelope checked_at unreadable' };
  const age = Date.now() - checked;
  if (age < 0 || age > ELIGIBILITY_TTL_MS)
    return { ok: false, note: 'eligibility evidence stale (age ' + Math.round(age / 1000) + 's)' };
  return { ok: true };
}

async function loginState(page) {
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);
  const html = await page.content();
  return !(/name="email"|id="email"/.test(html) && !/role="feed"|aria-label="Home"/.test(html));
}

async function doLike(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(4000, 7000));
  // Group permalink pages render the post action bar outside any article and can
  // stack suggested posts below; the main post's Like is the topmost visible one.
  const already = await page.$('[aria-label="Unlike"]');
  if (already) return { ok: true, note: 'already liked' };
  const target = await page.evaluate(() => {
    const vis = Array.from(document.querySelectorAll('[aria-label="Like"]'))
      .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    if (!vis.length) return null;
    vis[0].scrollIntoView({ block: 'center' });
    return { count: vis.length };
  });
  if (!target) return { ok: false, note: 'like button not found' };
  await sleep(1200);
  const before = await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label]'))
    .map(e => e.getAttribute('aria-label')).filter(l => /^Like: /.test(l)));
  await page.evaluate(() => {
    const vis = Array.from(document.querySelectorAll('[aria-label="Like"]'))
      .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    if (vis[0]) vis[0].click();
  });
  await sleep(4000);
  const after = await page.evaluate(() => ({
    likeBtns: Array.from(document.querySelectorAll('[aria-label="Like"]'))
      .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length,
    unlike: document.querySelectorAll('[aria-label="Unlike"]').length,
    counts: Array.from(document.querySelectorAll('[aria-label]'))
      .map(e => e.getAttribute('aria-label')).filter(l => /^Like: /.test(l)),
  }));
  const changed = after.unlike > 0 || after.likeBtns < target.count ||
    after.counts.some(c => !before.includes(c));
  return { ok: changed, note: changed ? 'like registered (button state changed)' : 'click sent, no state change observed' };
}

async function doComment(page, url, text) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(rand(4000, 7000));
  const article = await page.$('div[role="article"]');
  if (!article) return { ok: false, note: 'no article found' };
  await article.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(1500);
  const commentLink = await article.$('[aria-label="Comment"], [aria-label="Write a comment"]');
  if (commentLink) { await commentLink.click({ timeout: 15000 }).catch(() => {}); await sleep(2000); }
  let editor = await page.$('div[contenteditable="true"][data-lexical-editor="true"]');
  if (!editor) editor = await page.$('div[contenteditable="true"][role="textbox"]');
  if (!editor) return { ok: false, note: 'comment editor not found' };
  await editor.click({ timeout: 15000 });
  await sleep(1000);
  await page.keyboard.type(text, { delay: rand(40, 90) });
  await sleep(1500);
  await page.keyboard.press('Enter');
  await sleep(4000);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200000)).catch(() => '');
  const posted = bodyText.includes(text.slice(0, 30));
  return { ok: posted, note: posted ? 'comment text visible' : 'comment text not found after submit' };
}

(async () => {
  const jobFile = process.argv[2];
  if (!jobFile) { console.error('usage: node engage.js <job.json>'); process.exit(2); }
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const results = [];
  // Durable per-action observations (2026-09-24, orphan model): one fsync'd
  // JSONL line per completed action, appended to <job>.progress.jsonl
  // immediately after the action finishes. If this worker is killed, the
  // local collector still records an OBSERVATION for every action that
  // completed, instead of leaving them all UNKNOWN_EXECUTION.
  const progressFile = jobFile + '.progress.jsonl';
  let seq = 0;
  function progressLog(type, url, result) {
    seq += 1;
    const line = JSON.stringify({
      pass_id: job.pass_id || null, seq, type, url,
      ok: !!result.ok, note: result.note || null,
      ts: new Date().toISOString(),
    }) + '\n';
    const fd = fs.openSync(progressFile, 'a');
    try {
      fs.writeSync(fd, line);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9223', { timeout: 20000 });
  } catch (e) {
    const out = { ok: false, note: 'CDP attach failed; is the always-on Chrome running? ' + String(e.message || e).slice(0, 150), results: [] };
    fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
    console.log('RESULT cdp_unavailable');
    process.exit(3);
  }
  try {
    const contexts = browser.contexts();
    const ctx = contexts.find(c => c.pages().length) || contexts[0];
    let page = await ctx.newPage();
    // (2026-09-21, FL-20260921-016: the Pig entering/exiting Modern Standby
    // mid-pass can destroy our CDP page target while the browser lives on.
    // Recreate the page and continue instead of failing every remaining
    // action against a dead target.)
    async function ensurePage() {
      if (!page.isClosed()) return page;
      page = await ctx.newPage();
      return page;
    }
    if (!(await loginState(page))) {
      const out = { ok: false, logged_in: false, note: 'Facebook session logged out in the always-on browser; Nolan must log in again in that window', results: [] };
      fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
      console.log('RESULT logged_out');
      await page.close();
      process.exit(4);
    }
    const minD = (job.minDelaySec || 60) * 1000, maxD = (job.maxDelaySec || 120) * 1000;
    for (let i = 0; i < job.actions.length; i++) {
      const a = job.actions[i];
      if (i > 0) await sleep(rand(minD, maxD));
      // Per-action eligibility envelope verification: no envelope, no effect.
      const ev = verifyEligibilityEnvelope(a);
      if (!ev.ok) {
        const refused = { type: a.type, url: a.url, ok: false,
                          note: 'eligibility refused: ' + ev.note };
        results.push(refused);
        progressLog(a.type, a.url, refused);
        continue;
      }
      try {
        page = await ensurePage();
        const r = a.type === 'like' ? await doLike(page, a.url)
                : a.type === 'comment' ? await doComment(page, a.url, a.text)
                : { ok: false, note: 'unknown action type' };
        results.push({ type: a.type, url: a.url, ...r });
      } catch (e) {
        results.push({ type: a.type, url: a.url, ok: false, note: 'exception: ' + String(e.message || e).slice(0, 200) });
      }
      progressLog(a.type, a.url, results[results.length - 1]);
      const body = await page.evaluate(() => document.body.innerText.slice(0, 5000)).catch(() => '');
      if (/checkpoint|verify your identity|action blocked|temporarily blocked|we suspect automated/i.test(body)) {
        const abort = { type: 'abort', ok: false, note: 'possible checkpoint or block detected; stopping pass' };
        results.push(abort);
        progressLog('abort', null, abort);
        break;
      }
    }
    await page.close(); // close only our tab, never the browser
  } catch (e) {
    const out = { ok: false, note: 'worker exception: ' + String(e.message || e).slice(0, 300), results };
    fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
    console.log('RESULT worker_error');
    process.exit(5);
  }
  const out = { ok: results.every(r => r.ok || r.type === 'abort'), logged_in: true,
                pass_id: job.pass_id || null, results };
  fs.writeFileSync(jobFile + '.result.json', JSON.stringify(out, null, 2));
  const done = results.filter(r => r.ok).length;
  console.log(`RESULT ok=${out.ok} actions=${results.length} succeeded=${done}`);
  process.exit(0);
})().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(6); });
