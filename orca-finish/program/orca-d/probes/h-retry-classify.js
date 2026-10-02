#!/usr/bin/env node
'use strict';
/**
 * ORCA-D mission 6: retry classification adversarial probe.
 * Drives the REAL vendor classifyRetry() (branch ae55b77ff) with every
 * documented failure kind plus adversarial/unknown kinds, at every attempt
 * position. Question: does the classifier ever retry the non-retryable,
 * or drop the retryable?
 */
const policy = require('./vendor-policy_orca_policy.js');

const MAX = 2;
const documented = ['worker-failed', 'timeout', 'validation-failed', 'auth-denied', 'emit-rejected'];
const adversarial = [
  'dispatch-lost', 'DISPATCH_LOST', 'unknown', 'UNKNOWN', '', ' ', 'TIMEOUT',
  'timeout ', ' timeout', 'worker_failed', 'Timeout', 'transport-failure',
  'protocol-failure', null, undefined, 0, 42, {}, [],
];
const attempts = [0, 1, 2, 3, -1];

const EXPECT = {
  // kind -> { retryable: bool } per contract: validation-failed non-retryable;
  // auth-denied / emit-rejected are authority decisions (non-retryable as the same request);
  // worker-failed / timeout retryable within budget.
  'worker-failed': true, 'timeout': true,
  'validation-failed': false, 'auth-denied': false, 'emit-rejected': false,
};

let rows = [];
for (const kind of [...documented, ...adversarial]) {
  for (const attempt of attempts) {
    let d;
    try { d = policy.classifyRetry({ attempt, maxAttempts: MAX, failureKind: kind }); }
    catch (e) { rows.push({ kind: String(kind), attempt, error: String(e && e.message || e) }); continue; }
    const action = d.decisionClass === 'AUTO_EXECUTE' ? 'RETRY' : 'ESCALATE';
    rows.push({ kind: String(kind), attempt, decision: d.decisionClass, action, retryProhibited: !!d.retryProhibited });
  }
}

// Grade documented kinds.
let failures = [];
for (const kind of documented) {
  for (const attempt of [1, 2]) {
    const r = rows.find(x => x.kind === kind && x.attempt === attempt);
    const within = attempt < MAX;
    const wantRetry = EXPECT[kind] && within;
    const gotRetry = r.action === 'RETRY';
    if (wantRetry !== gotRetry) failures.push(`MISMATCH kind=${kind} attempt=${attempt}: want retry=${wantRetry}, got ${r.action} (${r.decision})`);
  }
}
// Attempt>=maxAttempts must never retry regardless of kind.
for (const r of rows) {
  if (r.attempt >= MAX && r.action === 'RETRY') failures.push(`BUDGET VIOLATION: retry granted at attempt=${r.attempt} kind=${r.kind}`);
}
// Unknown kinds: the classifier should fail closed (escalate), not default to retry.
const unknownRetried = rows.filter(r => !documented.includes(r.kind) && r.action === 'RETRY' && !r.error);

console.log('=== classifyRetry adversarial matrix ===');
for (const r of rows) {
  if (r.error) console.log(`kind=${JSON.stringify(r.kind)} attempt=${r.attempt} ERROR ${r.error}`);
  else console.log(`kind=${JSON.stringify(r.kind)} attempt=${r.attempt} -> ${r.decision} (${r.action})${r.retryProhibited ? ' retryProhibited' : ''}`);
}
console.log('\n=== documented-kind grading ===');
console.log(failures.length ? failures.join('\n') : 'all documented kinds classified per contract at attempts 1..2; budget respected');
console.log('\n=== unknown-kind default ===');
console.log(`unknown/adversarial kinds defaulting to RETRY: ${unknownRetried.length}`);
for (const r of unknownRetried.slice(0, 12)) console.log(`  kind=${JSON.stringify(r.kind)} attempt=${r.attempt} -> RETRY`);
console.log(unknownRetried.length
  ? '\nVERDICT: UNSOUND default — unrecognized failure kinds are treated as retryable (fail-open). escalateUndecidable() exists in this module but is not consulted.'
  : '\nVERDICT: sound — unknown kinds escalate.');
