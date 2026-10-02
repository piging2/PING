'use strict';
/**
 * HOLD static proof — source-level guarantees (P0 HOLD/REAPER lane).
 *
 * These assertions run against the implementation SOURCE, not a database:
 * they prove structurally that no code path returns an unresolved HOLD to
 * `created` except the evidence-backed SAFE_TO_RETRY reconciliation, that
 * HOLD is non-dispatchable by construction, and that _failMission admits only
 * proven failures. If a future edit reopens a path, this suite fails first.
 *
 * Run: node --test mission_hold_static.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const runtimeSrc = fs.readFileSync(path.join(DIR, 'mission_runtime.js'), 'utf8');
const schedSrc = fs.readFileSync(path.join(DIR, 'mission_scheduler.js'), 'utf8');

// Extract a method body: from `async name(` to the next method/class close.
function methodBody(src, name) {
  const start = src.indexOf(`async ${name}(`);
  assert.ok(start >= 0, `method ${name} not found`);
  const rest = src.slice(start);
  // Next sibling method or end of class: a line starting with exactly two
  // spaces followed by `async ` or `}` closing the class.
  const m = rest.slice(1).search(/\n  (?:async |get |static )/);
  const classEnd = rest.slice(1).search(/\n\}/);
  const end = m >= 0 ? m + 1 : classEnd + 1;
  return rest.slice(0, end);
}

// All SQL template literals inside a body that SET a status.
function statusSets(body) {
  const out = [];
  const re = /SET status = '(\w+)'([\s\S]*?)(?:`|;)/g;
  let m;
  while ((m = re.exec(body))) out.push({ to: m[1], tail: m[2] });
  return out;
}

test('only three paths SET status = created; only one of them may source from hold', () => {
  const owners = [];
  for (const name of ['reapExpiredLeases', 'reclaimRetryPending', 'reconcileHold', 'parkHold',
                      'assign', 'start', 'complete', 'fail', 'failWithRetry',
                      'create', 'getPending', 'renewLease', 'findOrphanedRunning']) {
    const body = methodBody(runtimeSrc, name);
    for (const s of statusSets(body)) {
      if (s.to === 'created') owners.push({ method: name, tail: s.tail });
    }
  }
  assert.deepEqual(
    owners.map(o => o.method).sort(),
    ['reapExpiredLeases', 'reclaimRetryPending', 'reconcileHold'].sort(),
    'the only created-producers must be reaper, retry-reclaim, and reconcileHold'
  );
  for (const o of owners) {
    const where = o.tail;
    if (o.method === 'reconcileHold') {
      assert.match(where, /status = 'hold'/, 'reconcileHold->created sources ONLY from hold');
      assert.match(where, /retry_eligibility = TRUE/, 'safe_to_retry restores dispatch eligibility structurally');
    } else {
      assert.doesNotMatch(where, /status = 'hold'/, `${o.method} must never source from hold`);
    }
  }
  // The two automatic paths source from known-safe states only.
  const reaper = owners.find(o => o.method === 'reapExpiredLeases');
  assert.match(reaper.tail, /status = 'assigned'/);
  assert.match(reaper.tail, /started_at IS NULL/, 'reaper: abandoned never-started only');
  const reclaim = owners.find(o => o.method === 'reclaimRetryPending');
  assert.match(reclaim.tail, /status = 'retry_pending'/);
});

test('HOLD is non-dispatchable by construction: every claim/read path gates on retry_eligibility', () => {
  const assign = methodBody(runtimeSrc, 'assign');
  assert.match(assign, /status = 'created' AND retry_eligibility = TRUE/s,
    'the conditional claim requires created AND retry-eligible');
  const pending = methodBody(runtimeSrc, 'getPending');
  assert.match(pending, /status = 'created' AND retry_eligibility = TRUE/s,
    'getPending requires created AND retry-eligible');
  // fail() and complete() can never touch a HOLD row.
  for (const name of ['fail', 'complete']) {
    const body = methodBody(runtimeSrc, name);
    assert.doesNotMatch(body, /'hold'/, `${name}() WHERE must never include hold`);
  }
});

test('parkHold publishes the full HOLD observable state atomically', () => {
  const body = methodBody(runtimeSrc, 'parkHold');
  for (const frag of [
    /SET status = 'hold'/,
    /outcome = 'UNKNOWN'/,
    /retry_eligibility = FALSE/,
    /reconciliation_required = TRUE/,
    /lease_until = NULL/,
    /status IN \('running', 'assigned'\)/,
  ]) {
    assert.match(body, frag, `parkHold must carry ${frag}`);
  }
});

test('reconcileHold: exactly four decisions; evidence required for the three terminal ones', () => {
  const body = methodBody(runtimeSrc, 'reconcileHold');
  for (const d of [`decision === 'succeeded'`, `decision === 'failed'`,
                   `decision === 'safe_to_retry'`, `decision === 'hold'`]) {
    assert.ok(body.includes(d), `reconcileHold handles ${d}`);
  }
  assert.ok(!body.includes(`decision === 'retry'`), 'no retry synonym');
  assert.match(body, /unknown decision/, 'unknown decisions throw');
  const evidenceGates = (body.match(/requires evidence/g) || []).length;
  assert.ok(evidenceGates >= 3, `evidence required for succeeded/failed/safe_to_retry (found ${evidenceGates})`);
  // Proven non-occurrence corrects the conservative effect count.
  assert.match(body, /effect_count = 0/, 'safe_to_retry with proven absence corrects effect_count');
  // safe_to_retry preserves logical identity: no remint, no new row.
  assert.doesNotMatch(body, /logical_operation_id =/, 'reconcileHold never remints the logical operation id');
});

test('scheduler: _failMission admits ONLY proven failures', () => {
  const body = methodBody(schedSrc, '_failMission');
  assert.ok(body.includes(`dispatchOutcome !== 'worker_failed'`) &&
            body.includes(`dispatchOutcome !== 'no_worker'`),
    '_failMission allow-lists exactly worker_failed and no_worker');
  assert.match(body, /throw new TypeError\([\s\S]*?not a proven failure/,
    'ambiguous/unknown outcomes throw, never become FAILED');
});

test('scheduler: dispatch throw with ambiguous effects routes to HOLD, not _failMission', () => {
  const body = methodBody(schedSrc, '_dispatch');
  const catchIdx = body.indexOf('} catch (err) {');
  assert.ok(catchIdx >= 0, '_dispatch has a catch block');
  const catchBody = body.slice(catchIdx);
  assert.ok(catchBody.includes('_reconcileUnknown'), 'catch routes to the HOLD reconciler');
  assert.ok(!catchBody.includes('_failMission('), 'catch never calls _failMission');
  // The dispatch boundary records the attempt before the worker is invoked.
  assert.ok(body.indexOf('recordDispatchAttempt') < body.indexOf('_dispatchWithTimeout(event)'),
    'effect_count is incremented at the dispatch boundary, before worker invocation');
});

test('scheduler: only one reconcileHold authority exists', () => {
  const defs = (schedSrc.match(/async reconcileHold\(/g) || []).length;
  assert.equal(defs, 1, 'exactly one scheduler reconcileHold (no duplicate authority)');
  const rtDefs = (runtimeSrc.match(/async reconcileHold\(/g) || []).length;
  assert.equal(rtDefs, 1, 'exactly one runtime reconcileHold');
});
