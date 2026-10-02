/**
 * Tests for orca_approval.js — approval binds to the EXACT proposal.
 * Covers the red-team hardening acceptance criteria:
 *   1. argument smuggling via cached grants impossible
 *   2. self-approval impossible
 *   3. revocation checked at execution, not just grant time
 * Run: node --test lib/orca/test/
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const ap = require('../orca_approval.js');

function grantArgs(over = {}) {
  return {
    requester: 'orca-dispatcher', approver: 'nolan-human', tier: ap.TIERS.ARGUMENT,
    invocationType: 'tool', toolLookupKey: 'email.send', role: 'executor',
    tenant: 'core::owner', policyVersion: 3,
    proposal: { to: 'shop@example.com', subject: 'hello', body: 'x' },
    expiresAt: '2030-01-01T00:00:00Z',
    findings: [{ file: 'review.md', note: 'recipient verified' }],
    ...over,
  };
}

function callFor(grant, over = {}) {
  return {
    requester: grant.requester, tenant: grant.scope.tenant,
    invocationType: grant.scope.invocationType, toolLookupKey: grant.scope.toolLookupKey,
    role: grant.scope.role,
    proposal: { to: 'shop@example.com', subject: 'hello', body: 'x' },
    ...over,
  };
}

const execCtx = (grant, over = {}) => ({
  grant, currentPolicyVersion: grant.scope.policyVersion,
  revocationRegistry: { isRevoked: () => false }, now: '2026-09-23T20:00:00Z', ...over,
});

test('happy path: exact proposal authorizes', () => {
  const grant = ap.issueGrant(grantArgs());
  const r = ap.authorizeExecution({ ...execCtx(grant), call: callFor(grant) });
  assert.equal(r.authorized, true);
  assert.equal(r.grantId, grant.grantId);
  assert.equal(r.grantEpoch, 3);
});

test('ACCEPTANCE 1: argument smuggling via cached grant is impossible', () => {
  const grant = ap.issueGrant(grantArgs());
  // Attack: reuse the cached grant with a different recipient and exfiltrated body.
  const smuggled = callFor(grant, { proposal: { to: 'attacker@evil.com', subject: 'hello', body: 'exfiltrated customer list' } });
  assert.throws(() => ap.authorizeExecution({ ...execCtx(grant), call: smuggled }), ap.ErrStaleApproval);
});

test('changed tool target invalidates the grant', () => {
  const grant = ap.issueGrant(grantArgs());
  const swapped = callFor(grant, { toolLookupKey: 'sms.send' });
  assert.throws(() => ap.authorizeExecution({ ...execCtx(grant), call: swapped }), ap.ErrScopeMismatch);
});

test('policy bump invalidates cached grants (revocation-bypass closed)', () => {
  const grant = ap.issueGrant(grantArgs());
  assert.throws(
    () => ap.authorizeExecution({ ...execCtx(grant, { currentPolicyVersion: 4 }), call: callFor(grant) }),
    ap.ErrStalePolicy
  );
});

test('ACCEPTANCE 3: revocation is checked at execution, not just grant time', () => {
  const grant = ap.issueGrant(grantArgs());
  const revoked = { isRevoked: (id) => id === grant.grantId };
  // Grant was valid at issue; revoked afterwards; execution must fail.
  assert.throws(
    () => ap.authorizeExecution({ ...execCtx(grant, { revocationRegistry: revoked }), call: callFor(grant) }),
    (e) => { assert.ok(e instanceof ap.ErrRevoked); return true; }
  );
});

test('expired grant fails closed', () => {
  const grant = ap.issueGrant(grantArgs({ expiresAt: '2020-01-01T00:00:00Z' }));
  assert.throws(() => ap.authorizeExecution({ ...execCtx(grant), call: callFor(grant) }), ap.ErrExpired);
});

test('ACCEPTANCE 2: self-approval impossible at grant time', () => {
  assert.throws(() => ap.issueGrant(grantArgs({ approver: 'orca-dispatcher' })), ap.ErrSelfApproval);
});

test('ACCEPTANCE 2: self-approval impossible at execution time (defense in depth)', () => {
  const grant = ap.issueGrant(grantArgs());
  const selfCall = callFor(grant, { requester: grant.approver });
  assert.throws(() => ap.authorizeExecution({ ...execCtx(grant), call: selfCall }), ap.ErrSelfApproval);
});

test('acceptance without recorded findings is refused (ORCA-07 audit gate)', () => {
  assert.throws(() => ap.issueGrant(grantArgs({ findings: [] })), ap.ErrNoFindings);
  assert.throws(() => ap.issueGrant(grantArgs({ findings: '' })), ap.ErrNoFindings);
});

test('tenant mismatch fails closed (cross-tenant grant sharing closed)', () => {
  const grant = ap.issueGrant(grantArgs());
  const other = callFor(grant, { tenant: 'tenant::other' });
  assert.throws(() => ap.authorizeExecution({ ...execCtx(grant), call: other }), ap.ErrScopeMismatch);
});

test('scope tier binds tool target but not arguments (two-tier documented)', () => {
  const grant = ap.issueGrant(grantArgs({ tier: ap.TIERS.SCOPE, proposal: undefined }));
  assert.equal(grant.proposalDigest, null);
  const varied = callFor(grant, { proposal: { anything: 'goes' } });
  const r = ap.authorizeExecution({ ...execCtx(grant), call: varied });
  assert.equal(r.authorized, true);
});

test('argument constraints allowlist is enforced', () => {
  const grant = ap.issueGrant(grantArgs({
    proposal: { to: 'shop@example.com', template: 'followup' },
    argConstraints: { 'to': ['shop@example.com'] },
  }));
  const okCall = callFor(grant, { proposal: { to: 'shop@example.com', template: 'followup' } });
  assert.equal(ap.authorizeExecution({ ...execCtx(grant), call: okCall }).authorized, true);
  const badCall = callFor(grant, { proposal: { to: 'other@example.com', template: 'followup' } });
  assert.throws(() => ap.authorizeExecution({ ...execCtx(grant), call: badCall }), ap.ErrStaleApproval);
});

test('proposal digest is canonical: key order irrelevant, content decisive', () => {
  const a = ap.proposalDigest({ x: 1, y: { b: 2, a: 1 } });
  const b = ap.proposalDigest({ y: { a: 1, b: 2 }, x: 1 });
  assert.equal(a, b);
  assert.notEqual(a, ap.proposalDigest({ x: 1, y: { b: 2, a: 2 } }));
});

test('bindIssuedWorkOrder closes the authorize->issue seam', () => {
  const workOrder = {
    work_order_id: 'woid1', context_pack_id: 'ctx1', agent_id: 'hermes',
    capability: 'email.send', namespace: 'core::owner', deadline: '2030-01-01T00:00:00Z', attempt: 1,
  };
  const input = { to: 'shop@example.com', body: 'hi' };
  const constraints = { read_only: true };
  const proposal = ap.proposalFromWorkOrder({ workOrder, input, constraints });
  const grant = ap.issueGrant(grantArgs({
    toolLookupKey: 'email.send',
    proposal,
  }));
  const bound = ap.bindIssuedWorkOrder(grant, workOrder, { input, constraints });
  assert.equal(bound.bound, true);
  // Smuggled input after authorization: bind fails.
  assert.throws(
    () => ap.bindIssuedWorkOrder(grant, workOrder, { input: { to: 'attacker@evil.com', body: 'hi' }, constraints }),
    ap.ErrStaleApproval
  );
});

test('interrupt resume: single-writer CAS', () => {
  const intr = ap.openInterrupt({ interruptId: 'int-1', runId: 'r1', requester: 'orca-dispatcher', eligibleResponders: ['nolan-human'] });
  const resumed = ap.resumeInterrupt({ interrupt: intr, writerToken: intr.writerToken, responder: 'nolan-human', decision: 'approved', findings: 'ok' });
  assert.equal(resumed.status, 'resumed');
  assert.equal(resumed.answerEvent.responder, 'nolan-human');
  // Old token cannot resume twice: token rotated.
  assert.throws(
    () => ap.resumeInterrupt({ interrupt: resumed, writerToken: intr.writerToken, responder: 'nolan-human', decision: 'approved' }),
    (e) => { assert.ok(e instanceof ap.ErrWriterConflict || /no open interrupt/.test(e.message)); return true; }
  );
});

test('interrupt resume: wrong writer token refused (checkpoint fork cannot double-execute)', () => {
  const intr = ap.openInterrupt({ interruptId: 'int-2', requester: 'orca-dispatcher' });
  assert.throws(
    () => ap.resumeInterrupt({ interrupt: intr, writerToken: 'wt_wrong', responder: 'nolan-human', decision: 'approved' }),
    ap.ErrWriterConflict
  );
});

test('interrupt resume: requester cannot approve own interrupt (self-approval)', () => {
  const intr = ap.openInterrupt({ interruptId: 'int-3', requester: 'orca-dispatcher' });
  assert.throws(
    () => ap.resumeInterrupt({ interrupt: intr, writerToken: intr.writerToken, responder: 'orca-dispatcher', decision: 'approved' }),
    ap.ErrSelfApproval
  );
});

test('interrupt resume: ineligible responder refused', () => {
  const intr = ap.openInterrupt({ interruptId: 'int-4', requester: 'orca-dispatcher', eligibleResponders: ['nolan-human'] });
  assert.throws(
    () => ap.resumeInterrupt({ interrupt: intr, writerToken: intr.writerToken, responder: 'mallory', decision: 'approved' }),
    /not eligible/
  );
});
