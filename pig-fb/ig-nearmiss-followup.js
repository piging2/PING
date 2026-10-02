#!/usr/bin/env node
// ig-nearmiss-followup.js -- the documented near-miss follow-up, now wired in.
// Reads an ig-discover result JSON, runs instagram-cli user-profile + posts for
// near-misses whose observation_status is FOLLOWUP_REQUIRED or OBSERVED_EMPTY,
// and applies ig-disposition.decide() to each. Writes a reconciliation JSON.
// Only CONFIRMED_EXCLUDE / CONFIRMED_EMPTY are skip-eligible; everything else
// stays out of the durable skip list.
//
// BOUNDED (Nolan 2026-09-24): --max-handles N (default 12) and
// --time-budget-secs S (default 600) cap the follow-up per pass. CLI failures
// fail closed to STILL_UNKNOWN. The follow-up never hangs a pass: remaining
// handles are deferred to the next pass as DEFERRED, never skipped.
//
// POSITIVE CONTROLS (Nolan 2026-09-24): known-good handles from
// ig-positive-controls.json are verified on every run. If the controls cannot
// be rediscovered, the CLI path is deemed untrustworthy and every EMPTY
// conclusion in this run is downgraded to STILL_UNKNOWN: a pass that cannot
// rediscover its controls may not conclude GENUINE_EMPTY.
//
// Usage: node ig-nearmiss-followup.js <result.json> <out.json> [--max-handles N] [--time-budget-secs S]
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { OBS_STATUS } = require('./ig-observation.js');
const { decide, skipEligible, gateDisposition, DISPOSITION } = require('./ig-disposition.js');

// Pure bound decision: defer once the per-pass cap or time budget is hit.
function shouldDefer(processed, maxHandles, deadlineMs) {
  return processed >= maxHandles || Date.now() >= deadlineMs;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function cli(args, timeoutMs) {
  try {
    const out = execFileSync('instagram-cli', args, { encoding: 'utf8', timeout: timeoutMs || 45000 });
    return JSON.parse(out);
  } catch (e) {
    return { _cli_error: String(e.message || e).slice(0, 200) };
  }
}

function accountId() {
  const d = cli(['accounts']);
  const accts = d.accounts || [];
  if (!accts.length) throw new Error('no instagram account linked');
  return accts[0].user_fbid;
}

function firstFeedPost(postsJson) {
  const posts = (postsJson && postsJson.posts) || [];
  for (const p of posts) {
    const u = p.url || '';
    if (u.includes('/p/') || u.includes('/reel/')) return { url: u, created_at: p.created_at };
  }
  return null;
}

function profileEvidence(acct, handle) {
  const up = cli(['user-profile', '--account-id', acct, '--username', handle]);
  if (up._cli_error) return { failed: true, error: up._cli_error };
  const profs = up.profiles || [];
  if (!profs.length) return { profile: null, profileNotFound: true, newestPost: null, postsFailed: false };
  const p = profs[0];
  const pr = cli(['posts', '--account-id', acct, '--username', handle, '--limit', '1']);
  return {
    profile: {
      name: p.name, bio: p.bio, account_type: p.account_type, country: p.country,
      post_count: p.post_count, is_private: p.is_private, is_verified: p.is_verified,
    },
    profileNotFound: false,
    newestPost: pr._cli_error ? null : firstFeedPost(pr),
    postsFailed: !!pr._cli_error,
  };
}

// Positive controls: known-good handles that MUST be rediscoverable. Returns
// { passed: bool, controls: [...] }.
function runControls(acct, controlHandles) {
  const controls = [];
  for (const handle of controlHandles) {
    let ev;
    try { ev = profileEvidence(acct, handle); }
    catch (e) { ev = { failed: true, error: String(e.message || e).slice(0, 200) }; }
    const ok = !!(ev && ev.profile && ev.profile.post_count > 0 && ev.newestPost);
    controls.push({ handle: '@' + handle, rediscovered: ok, post_count: ev && ev.profile ? ev.profile.post_count : null });
  }
  return { passed: controls.length > 0 && controls.every(c => c.rediscovered), controls };
}

// Shared positive-control runner: { passed, controls, skipped[, error] }.
// skipped=true only when the controls file is absent (no evidence either way).
// Pass acct when the caller already resolved it; otherwise it is resolved
// here and a resolution failure fails the controls closed (passed:false).
function readControls(acctOpt) {
  let controls = { passed: true, controls: [], skipped: true };
  try {
    const ctrlPath = path.join(__dirname, 'ig-positive-controls.json');
    if (fs.existsSync(ctrlPath)) {
      const acct = acctOpt || accountId();
      const ctrlHandles = JSON.parse(fs.readFileSync(ctrlPath, 'utf8')).handles || [];
      controls = { ...runControls(acct, ctrlHandles), skipped: false };
    }
  } catch (e) { controls = { passed: false, controls: [], skipped: false, error: String(e.message || e).slice(0, 120) }; }
  return controls;
}

// Machine-readable evidence summary for the health marker.
function controlEvidence(controls, extra) {
  const list = controls.controls || [];
  return Object.assign({
    controls_passed: controls.passed,
    controls_rediscovered: list.filter(c => c.rediscovered).length,
    controls_total: list.length,
    controls_skipped: !!controls.skipped,
  }, extra || {});
}

// Writes the discovery health marker atomically (temp file + rename).
// status is HEALTHY or UNHEALTHY. The marker never auto-clears on time alone:
// only a passing control check (same run or --controls-only revalidation)
// may write HEALTHY.
function writeHealthMarker(markerPath, status, reason, evidence) {
  const marker = {
    status,
    updated_at: new Date().toISOString(),
    reason,
    evidence: evidence || {},
  };
  const tmp = markerPath + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(marker, null, 2));
  fs.renameSync(tmp, markerPath);
}

async function main() {
  const argv = process.argv.slice(2);
  const resultPath = argv[0], outPath = argv[1];
  if (!resultPath || !outPath) { console.error('usage: node ig-nearmiss-followup.js <result.json> <out.json> [--max-handles N] [--time-budget-secs S]'); process.exit(2); }
  const mi = argv.indexOf('--max-handles');
  const ti = argv.indexOf('--time-budget-secs');
  const maxHandles = mi >= 0 ? parseInt(argv[mi + 1], 10) : 12;
  const timeBudgetSecs = ti >= 0 ? parseInt(argv[ti + 1], 10) : 600;
  const deadline = Date.now() + timeBudgetSecs * 1000;

  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  const near = result.near_misses || [];
  const todo = near.filter(n => n.observation_status === OBS_STATUS.FOLLOWUP_REQUIRED ||
                                n.observation_status === OBS_STATUS.OBSERVED_EMPTY);
  const acct = accountId();

  // Positive controls first: if they fail, no GENUINE_EMPTY this run.
  const controls = readControls(acct);
  if (!controls.passed) process.stderr.write('CONTROLS FAILED: downgrading EMPTY conclusions to STILL_UNKNOWN\n');

  const reconciled = [];
  let n = 0;
  for (const nm of todo) {
    if (n >= maxHandles || Date.now() >= deadline) {
      // Bounded: defer, never skip, never hang the pass.
      reconciled.push({
        account: nm.account, dom_reason: nm.reason, observation_status: nm.observation_status,
        disposition: 'DEFERRED', disposition_reason: 'follow-up budget exhausted; next pass',
        skip_eligible: false, followed_up_at: new Date().toISOString(),
      });
      continue;
    }
    n++;
    const handle = (nm.account || '').replace(/^@/, '');
    let evidence;
    try { evidence = profileEvidence(acct, handle); }
    catch (e) { evidence = { failed: true, error: String(e.message || e).slice(0, 200) }; }
    const d = decide(nm, evidence);
    // Positive-control gate: GENUINE_EMPTY requires trustworthy observation.
    const gated = gateDisposition(d.disposition, controls.passed, d.reason);
    const disp = gated.disposition, dReason = gated.reason;
    reconciled.push({
      account: nm.account,
      dom_reason: nm.reason,
      observation_status: nm.observation_status,
      disposition: disp,
      disposition_reason: dReason,
      evidence: d.evidence || undefined,
      skip_eligible: skipEligible({ disposition: disp }),
      followed_up_at: new Date().toISOString(),
    });
    process.stderr.write(`[${n}/${Math.min(todo.length, maxHandles)}] ${nm.account} -> ${disp}\n`);
    await sleep(2500); // pacing between handles
  }
  const summary = {};
  for (const r of reconciled) summary[r.disposition] = (summary[r.disposition] || 0) + 1;
  const out = {
    source_result: resultPath,
    ran_at: new Date().toISOString(),
    bounds: { max_handles: maxHandles, time_budget_secs: timeBudgetSecs },
    positive_controls: controls,
    near_misses_seen: near.length,
    followed_up: n,
    deferred: reconciled.filter(r => r.disposition === 'DEFERRED').length,
    summary,
    reconciled,
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: true, followed_up: n, controls_passed: controls.passed, summary }));
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  // HEALTH GATE (Nolan 2026-09-25): positive-control evidence owns the
  // discovery health marker. --controls-only runs a lightweight control-only
  // revalidation (instagram-cli, no Pig browser): passed controls clear
  // UNHEALTHY back to HEALTHY; failed controls keep/establish UNHEALTHY.
  // The marker never auto-clears on time alone. --mark-from-recon folds one
  // run's reconciliation positive_controls into the marker (no-op when the
  // controls were skipped, so a control-less run cannot clear UNHEALTHY).
  if (argv[0] === '--controls-only' && argv[1]) {
    // Resolves the account inside readControls; a resolution failure fails
    // closed to UNHEALTHY rather than crashing the revalidation.
    const controls = readControls();
    const ok = controls.passed === true;
    writeHealthMarker(argv[1], ok ? 'HEALTHY' : 'UNHEALTHY',
      ok ? 'control-only revalidation passed' : 'control-only revalidation failed',
      controlEvidence(controls, { revalidation: true }));
    console.log(JSON.stringify({ status: ok ? 'HEALTHY' : 'UNHEALTHY', controls_passed: controls.passed }));
    process.exit(ok ? 0 : 1);
  }
  if (argv[0] === '--mark-from-recon' && argv[1] && argv[2]) {
    let recon;
    try { recon = JSON.parse(fs.readFileSync(argv[1], 'utf8')); }
    catch (e) { console.error('cannot read reconciliation: ' + String(e.message || e).slice(0, 120)); process.exit(2); }
    const controls = recon.positive_controls || {};
    if (controls.skipped) {
      console.log(JSON.stringify({ status: 'unchanged', reason: 'controls skipped; marker left as-is' }));
      process.exit(0);
    }
    const ok = controls.passed === true;
    writeHealthMarker(argv[2], ok ? 'HEALTHY' : 'UNHEALTHY',
      ok ? 'positive controls passed' : 'positive controls failed: zero control rediscovery',
      controlEvidence(controls, { reconciliation_file: argv[1], source_result: recon.source_result }));
    console.log(JSON.stringify({ status: ok ? 'HEALTHY' : 'UNHEALTHY', controls_passed: controls.passed }));
    process.exit(0);
  }
  main().catch(e => { console.error('FATAL ' + String(e.message || e).slice(0, 300)); process.exit(1); });
}

module.exports = { shouldDefer, readControls, writeHealthMarker, controlEvidence };
