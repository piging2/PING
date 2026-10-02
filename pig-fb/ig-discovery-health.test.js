// ig-discovery-health.test.js -- regression invariant for the false-green repair.
// Rule under test (Nolan 2026-09-25): a green discovery status may never be
// independent of the evidence that defines green. ok is derived from the
// query/anomaly evidence, and the positive-control health marker owns the
// discovery gate: UNHEALTHY pauses discovery until a control-only
// revalidation passes.
// Run: node ig-discovery-health.test.js   (exit 0 = all pass)
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { deriveOk } = require('./ig-discover.js');
const followup = require('./ig-nearmiss-followup.js');

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('PASS ' + name); }
  catch (e) { console.error('FAIL ' + name + ' :: ' + e.message); process.exitCode = 1; }
}

const FIXTURE = '/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes/ig125-discover-bizlocal-20260925-0501.result.json';
const RECON_FIXTURE = '/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes/ig125-discover-bizlocal-20260925-0501.reconciliation.json';

// 1. The ig125 false green: 5/5 queries search_failed, 0 candidates.
//    The old code wrote ok:true unconditionally; the new derivation must say false.
check('ig125 fixture derives ok=false with all_queries_search_failed', () => {
  const out = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.strictEqual(out.ok, true, 'fixture must still carry the original false green');
  const v = deriveOk(out);
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.note, 'all_queries_search_failed');
});

// 2. Genuine empty (queries answered, zero candidates) stays ok:true.
check('genuine empty derives ok=true', () => {
  const v = deriveOk({ queries_run: 5, anomalies: [], candidates: [], near_misses: [] });
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.note, undefined);
});

// 3. Partial failure (some queries answered) stays ok:true; anomalies are evidence, not a veto.
check('partial query failure derives ok=true', () => {
  const v = deriveOk({ queries_run: 5, anomalies: ['search_failed:q1', 'search_failed:q2'], candidates: [], near_misses: [] });
  assert.strictEqual(v.ok, true);
});

// 4. No queries ran at all: no evidence the surface works -> ok:false.
check('zero queries derives ok=false with no_queries_run', () => {
  const v = deriveOk({ queries_run: 0, anomalies: [], candidates: [], near_misses: [] });
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.note, 'no_queries_run');
});

// 5. Non-search anomalies (vet exceptions) do not by themselves fail the surface.
check('vet-only anomalies derive ok=true', () => {
  const v = deriveOk({ queries_run: 4, anomalies: ['vet_exception:biz:timeout'], candidates: [{ account: '@x' }], near_misses: [] });
  assert.strictEqual(v.ok, true);
});

// 6. Health marker round-trip: UNHEALTHY written from the ig125 reconciliation.
check('--mark-from-recon writes UNHEALTHY for the ig125 reconciliation', () => {
  const marker = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ighealth-')), 'health.json');
  execFileSync('node', [path.join(__dirname, 'ig-nearmiss-followup.js'), '--mark-from-recon', RECON_FIXTURE, marker], { encoding: 'utf8' });
  const m = JSON.parse(fs.readFileSync(marker, 'utf8'));
  assert.strictEqual(m.status, 'UNHEALTHY');
  assert.strictEqual(m.evidence.controls_passed, false);
  assert.strictEqual(m.evidence.controls_rediscovered, 0);
  assert.strictEqual(m.evidence.controls_total, 5);
  assert.ok(m.updated_at);
  assert.ok(/positive controls failed/.test(m.reason));
});

// 7. A passing reconciliation clears back to HEALTHY.
check('--mark-from-recon writes HEALTHY when controls pass', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ighealth-'));
  const recon = path.join(dir, 'recon.json');
  const marker = path.join(dir, 'health.json');
  fs.writeFileSync(marker, JSON.stringify({ status: 'UNHEALTHY', updated_at: 'x', reason: 'old', evidence: {} }));
  fs.writeFileSync(recon, JSON.stringify({ source_result: 's', positive_controls: {
    passed: true, skipped: false,
    controls: [{ handle: '@a', rediscovered: true, post_count: 31 }],
  }}));
  execFileSync('node', [path.join(__dirname, 'ig-nearmiss-followup.js'), '--mark-from-recon', recon, marker], { encoding: 'utf8' });
  const m = JSON.parse(fs.readFileSync(marker, 'utf8'));
  assert.strictEqual(m.status, 'HEALTHY');
  assert.strictEqual(m.evidence.controls_passed, true);
});

// 8. Skipped controls leave the marker untouched: a control-less run cannot
//    clear (or establish) health.
check('--mark-from-recon leaves the marker as-is when controls were skipped', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ighealth-'));
  const recon = path.join(dir, 'recon.json');
  const marker = path.join(dir, 'health.json');
  fs.writeFileSync(marker, JSON.stringify({ status: 'UNHEALTHY', updated_at: 'x', reason: 'old', evidence: {} }));
  fs.writeFileSync(recon, JSON.stringify({ source_result: 's', positive_controls: { passed: true, skipped: true, controls: [] } }));
  const out = execFileSync('node', [path.join(__dirname, 'ig-nearmiss-followup.js'), '--mark-from-recon', recon, marker], { encoding: 'utf8' });
  assert.ok(/unchanged/.test(out));
  const m = JSON.parse(fs.readFileSync(marker, 'utf8'));
  assert.strictEqual(m.status, 'UNHEALTHY');
});

// 9. writeHealthMarker is exported and writes the documented schema.
check('writeHealthMarker writes status/updated_at/reason/evidence', () => {
  const marker = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ighealth-')), 'health.json');
  followup.writeHealthMarker(marker, 'HEALTHY', 'test reason', followup.controlEvidence({ passed: true, skipped: false, controls: [{ rediscovered: true }] }, {}));
  const m = JSON.parse(fs.readFileSync(marker, 'utf8'));
  assert.deepStrictEqual(Object.keys(m).sort(), ['evidence', 'reason', 'status', 'updated_at']);
  assert.strictEqual(m.status, 'HEALTHY');
  assert.strictEqual(m.evidence.controls_rediscovered, 1);
});

console.log(`\n${passed} checks passed`);
