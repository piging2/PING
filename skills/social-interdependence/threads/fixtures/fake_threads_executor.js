#!/usr/bin/env node
// fake_threads_executor.js -- ADAPTER-BOUNDARY FIXTURE ONLY.
// Implements the same closed JSON protocol as the live Pig worker
// (th-engage.js): reads <job.json>, writes <job.json>.result.json, prints
// one JSON result line. Maintains a fake external-state file so
// read-after-write verification has something honest to read.
//
// Live behavior mirrored: liking an already-liked post reports 'already'
// and does NOT toggle the like off. Comments append to the post's comment
// list with the supplied text (plus a marker for verification).
//
// Adversarial modes (env vars, tests only):
//   FAKE_TIMEOUT_AFTER_SUCCESS=1  apply the mutation, then exit with no
//                                 output (timeout-after-success)
//   FAKE_LIE=1                    report executed WITHOUT applying anything
//   FAKE_OUTAGE=1                 ok:false, infra=platform_outage
//   FAKE_AUTH_EXPIRED=1           ok:false, infra=logged_out
//   FAKE_FLAG=<name>              one action outcome=blocked, platform flag
//   FAKE_EMPTY=1                  ok:true with zero actions
// State file: FAKE_THREADS_STATE (default <fixtures>/fake-external-state.json)
const fs = require('fs');
const path = require('path');

const jobPath = process.argv[2];
if (!jobPath) { process.stderr.write('usage: fake_threads_executor.js <job.json>\n'); process.exit(2); }
const statePath = process.env.FAKE_THREADS_STATE ||
  path.join(__dirname, 'fake-external-state.json');

function loadState() {
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); }
  catch (_) { return { likes: {}, comments: {}, mutation_count: 0 }; }
}
function saveState(s) { fs.writeFileSync(statePath, JSON.stringify(s, null, 1)); }

const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
const st = loadState();
const actions = job.actions || [];
const out = [];
const flag = process.env.FAKE_FLAG || null;
const lie = process.env.FAKE_LIE === '1';
const timeoutAfter = process.env.FAKE_TIMEOUT_AFTER_SUCCESS === '1';

if (process.env.FAKE_OUTAGE === '1') {
  const r = { ok: false, infra: 'platform_outage', job_id: jobPath, actions: [] };
  fs.writeFileSync(jobPath + '.result.json', JSON.stringify(r));
  console.log(JSON.stringify(r));
  process.exit(0);
}
if (process.env.FAKE_AUTH_EXPIRED === '1') {
  const r = { ok: false, infra: 'logged_out', job_id: jobPath, actions: [] };
  fs.writeFileSync(jobPath + '.result.json', JSON.stringify(r));
  console.log(JSON.stringify(r));
  process.exit(0);
}
if (process.env.FAKE_EMPTY === '1') {
  const r = { ok: true, infra: null, job_id: jobPath, actions: [], completed_at: new Date().toISOString() };
  fs.writeFileSync(jobPath + '.result.json', JSON.stringify(r));
  console.log(JSON.stringify(r));
  process.exit(0);
}

actions.forEach((a, i) => {
  const ref = (a.url.match(/\/post\/([A-Za-z0-9_-]+)/) || [])[1] || a.marker || ('idx' + i);
  if (flag) {
    out.push({ action_index: i, url: a.url, outcome: 'blocked', external_effect: 'none_observed',
               note: 'platform flag: ' + flag, flag });
    return;
  }
  if (a.type === 'like') {
    if (st.likes[ref]) {
      out.push({ action_index: i, url: a.url, outcome: 'already', external_effect: 'already_present',
                 note: 'already liked by account; no click performed' });
    } else {
      if (!lie) { st.likes[ref] = true; st.mutation_count += 1; }
      out.push({ action_index: i, url: a.url, outcome: 'executed',
                 external_effect: lie ? 'none_observed' : 'applied',
                 note: lie ? 'claimed executed (fixture lie mode)' : 'like applied' });
    }
  } else if (a.type === 'comment') {
    const marker = a.marker || ref;
    const present = (st.comments[ref] || []).some(c => c.includes(marker));
    if (!lie) {
      st.comments[ref] = st.comments[ref] || [];
      if (!present) { st.comments[ref].push((a.text || '') + ' [' + marker + ']'); st.mutation_count += 1; }
    }
    out.push({ action_index: i, url: a.url, outcome: 'executed',
               external_effect: lie ? 'none_observed' : 'applied',
               note: lie ? 'claimed executed (fixture lie mode)' : 'comment published' });
  } else {
    out.push({ action_index: i, url: a.url, outcome: 'failed', external_effect: 'none_observed',
               note: 'unsupported action type in fixture' });
  }
});
saveState(st);

if (timeoutAfter) {
  // Mutation applied above; now simulate the timeout: no output at all.
  process.exit(0);
}
const result = { ok: true, infra: null, job_id: jobPath, actions: out,
                 completed_at: new Date().toISOString(),
                 worker_window: { opened: true, closed: true } };
fs.writeFileSync(jobPath + '.result.json', JSON.stringify(result));
console.log(JSON.stringify(result));
