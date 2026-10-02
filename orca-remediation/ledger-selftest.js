#!/usr/bin/env node
// Ledger edge self-test: replays every statusLedger transition sequence the
// remediated loop uses, against the real OrcaStatusLedger. Any illegal edge
// throws, failing the test.
'use strict';
const { OrcaStatusLedger } = require('/home/nolan/worktrees/orca-autonomy/orca/control-loop/policy/orca_status_model.js');

function seq(name, steps) {
  const L = new OrcaStatusLedger();
  L.setDir('/tmp/ledger-selftest');
  for (const to of steps) L.transition('t', to, {});
  console.log('OK  ', name);
}

// normal success path
seq('success', ['PLANNED', 'AUTHORIZED', 'QUEUED', 'RUNNING', 'EVIDENCE_PENDING', 'VERIFIED', 'CLOSED']);
// worker failed, retry granted, second attempt succeeds
seq('retry-success', ['PLANNED', 'AUTHORIZED', 'QUEUED', 'RUNNING', 'EVIDENCE_PENDING', 'FAILED',
  'PLANNED', 'AUTHORIZED', 'QUEUED', 'RUNNING', 'EVIDENCE_PENDING', 'VERIFIED', 'CLOSED']);
// worker failed, no retry
seq('failed-no-retry', ['PLANNED', 'AUTHORIZED', 'QUEUED', 'RUNNING', 'EVIDENCE_PENDING', 'FAILED']);
// transport failure replanned (remediation path)
seq('transport-replan', ['PLANNED', 'AUTHORIZED', 'QUEUED', 'BLOCKED', 'PLANNED', 'AUTHORIZED', 'QUEUED',
  'RUNNING', 'EVIDENCE_PENDING', 'VERIFIED']);
// protocol failure
seq('protocol-failure', ['PLANNED', 'AUTHORIZED', 'QUEUED', 'RUNNING', 'EVIDENCE_PENDING', 'VERIFICATION_FAILED']);
// verification failed
seq('verification-failed', ['PLANNED', 'AUTHORIZED', 'QUEUED', 'RUNNING', 'EVIDENCE_PENDING', 'VERIFICATION_FAILED']);
// policy deny
seq('policy-deny', ['PLANNED', 'BLOCKED']);
// prohibition reject at boundary
seq('prohibition', ['PLANNED', 'BLOCKED']);
// reconcile: fresh run, terminal states from null
for (const s of ['VERIFIED', 'FAILED', 'VERIFICATION_FAILED', 'AUTHORIZED']) {
  seq('reconcile-from-null-' + s, [s]);
}
// reconcile lost attempt re-authorized (fresh run, from null)
seq('reconcile-reauth', ['AUTHORIZED']);
// main() escalation catch: PLANNED -> BLOCKED
seq('escalate-from-planned', ['PLANNED', 'BLOCKED']);
// main() escalation catch: RUNNING -> BLOCKED
seq('escalate-from-running', ['RUNNING', 'BLOCKED']);
console.log('ALL_LEDGER_EDGE_TESTS_PASS');
