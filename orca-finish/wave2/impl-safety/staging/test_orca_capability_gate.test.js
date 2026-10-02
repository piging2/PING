/**
 * Tests for orca_capability_gate.js — per-call lease checks around the
 * EXISTING authority (called, never reimplemented). Default deny; ambiguous
 * denial. Run: node --test lib/orca/test/
 *
 * NOTE: local test credential is a dummy 'tk-*' value, never a real secret.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const cg = require('../orca_capability_gate.js');

const BRANCH_ADAPTER = '/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js';

function tryRequire(p) {
  try { return require(p); } catch { return null; }
}

function stubAuthority({ granted = true, reason = null, failAt = Infinity } = {}) {
  let calls = 0;
  return {
    calls: () => calls,
    check(call) {
      calls += 1;
      if (calls >= failAt) return { granted: false, reason: 'revoked-between-checks' };
      return { granted, reason };
    },
  };
}

function leaseStore(leases = {}, revoked = new Set()) {
  return {
    getLease: (id) => leases[id] || null,
    isRevoked: (id) => revoked.has(id),
  };
}

function setup(authOpts) {
  const authority = stubAuthority(authOpts);
  const tk = 'tk-001-dummy';
  const lease = cg.mintLease({
    leaseId: 'lease-1', principal: 'orca-dispatcher', capabilityId: 'text.summarize',
    scope: 'core::owner', role: 'executor', bearerToken: tk, expiresAt: '2030-01-01T00:00:00Z',
  });
  const gate = cg.createGate({ authority, leaseStore: leaseStore({ 'lease-1': lease }) });
  const call = {
    principal: 'orca-dispatcher', capabilityId: 'text.summarize', scope: 'core::owner',
    role: 'executor', agentId: 'hermes', namespace: 'core::owner',
    constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true },
  };
  return { gate, authority, tk, lease, call };
}

test('happy path: lease + authority grant -> ALLOW with grant epoch', () => {
  const { gate, tk, call, authority } = setup();
  const r = gate.authorizeCall({ leaseId: 'lease-1', bearerToken: tk, call });
  assert.equal(r.decision, 'allow');
  assert.ok(r.grantEpoch, 'grant epoch returned for audit');
  assert.equal(authority.calls(), 2, 'authority resolved at discovery AND re-resolved at execution');
});

test('unknown capability -> DENY (forbidden indistinguishable from absent)', () => {
  const { gate, tk, call } = setup({ granted: false, reason: 'not registered' });
  const r = gate.authorizeCall({ leaseId: 'lease-1', bearerToken: tk, call });
  assert.equal(r.decision, 'deny');
  assert.equal(r.reason, 'authority_denied');
});

test('authority throws -> DENY ambiguous (never throws through, never allows)', () => {
  const { tk, call } = setup();
  const exploding = { check() { throw new Error('db down'); } };
  const lease = cg.mintLease({
    leaseId: 'l', principal: 'p', capabilityId: 'c', scope: 's', bearerToken: tk,
  });
  const gate = cg.createGate({ authority: exploding, leaseStore: leaseStore({ l: lease }) });
  const r = gate.authorizeCall({ leaseId: 'l', bearerToken: tk, call: { principal: 'p', capabilityId: 'c', scope: 's' } });
  assert.equal(r.decision, 'deny');
  assert.equal(r.reason, 'ambiguous');
});

test('no lease -> DENY (default deny)', () => {
  const { gate, tk, call } = setup();
  const r = gate.authorizeCall({ leaseId: 'nope', bearerToken: tk, call });
  assert.equal(r.decision, 'deny');
  assert.equal(r.reason, 'unknown_lease');
});

test('wrong credential -> DENY', () => {
  const { gate, call } = setup();
  const r = gate.authorizeCall({ leaseId: 'lease-1', bearerToken: 'wrong-tk-999', call });
  assert.equal(r.decision, 'deny');
  assert.equal(r.reason, 'bad_token');
});

test('expired lease -> DENY', () => {
  const authority = stubAuthority();
  const tk = 'tk-exp';
  const lease = cg.mintLease({
    leaseId: 'l', principal: 'p', capabilityId: 'c', scope: 's',
    bearerToken: tk, expiresAt: '2020-01-01T00:00:00Z',
  });
  const gate = cg.createGate({ authority, leaseStore: leaseStore({ l: lease }) });
  const r = gate.authorizeCall({ leaseId: 'l', bearerToken: tk, call: { principal: 'p', capabilityId: 'c', scope: 's' } });
  assert.equal(r.decision, 'deny');
  assert.equal(r.reason, 'expired');
});

test('revoked lease fails at execution even though it passed issuance', () => {
  const authority = stubAuthority();
  const tk = 'tk-rev';
  const lease = cg.mintLease({ leaseId: 'l', principal: 'p', capabilityId: 'c', scope: 's', bearerToken: tk });
  const revoked = new Set(['l']);
  const gate = cg.createGate({ authority, leaseStore: leaseStore({ l: lease }, revoked) });
  const r = gate.authorizeCall({ leaseId: 'l', bearerToken: tk, call: { principal: 'p', capabilityId: 'c', scope: 's' } });
  assert.equal(r.decision, 'deny');
  assert.equal(r.reason, 'revoked');
});

test('capability / scope / principal mismatch -> DENY', () => {
  const { gate, tk, call } = setup();
  assert.equal(gate.authorizeCall({ leaseId: 'lease-1', bearerToken: tk, call: { ...call, capabilityId: 'email.send' } }).reason, 'capability_mismatch');
  assert.equal(gate.authorizeCall({ leaseId: 'lease-1', bearerToken: tk, call: { ...call, scope: 'tenant::other' } }).reason, 'scope_mismatch');
  assert.equal(gate.authorizeCall({ leaseId: 'lease-1', bearerToken: tk, call: { ...call, principal: 'mallory' } }).reason, 'principal_mismatch');
});

test('MCP-M26: re-resolution failure between discovery and execution denies', () => {
  const { gate, tk, call } = setup({ failAt: 2 });
  const r = gate.authorizeCall({ leaseId: 'lease-1', bearerToken: tk, call });
  assert.equal(r.decision, 'deny');
  assert.equal(r.reason, 'authority_denied');
});

test('reverifyCall re-runs the full check (long-handler re-verification)', () => {
  const { gate, tk, call } = setup();
  const r = gate.reverifyCall({ leaseId: 'lease-1', bearerToken: tk, call });
  assert.equal(r.decision, 'allow');
});

test('malformed call -> DENY ambiguous, never throws', () => {
  const { gate, tk } = setup();
  const r = gate.authorizeCall({ leaseId: 'lease-1', bearerToken: tk, call: null });
  assert.equal(r.decision, 'deny');
  assert.equal(r.reason, 'ambiguous');
});

// --- Branch integration: the gate calls the branch adapter, never reimplements it ---

const branchAdapter = tryRequire(BRANCH_ADAPTER);

test('branch: gate allows a branch-authorized work order via adaptBranchAdapter',
  { skip: !branchAdapter ? 'branch worktree absent' : false }, () => {
    const authority = cg.adaptBranchAdapter(branchAdapter);
    const tk = 'tk-branch';
    const lease = cg.mintLease({
      leaseId: 'l', principal: 'orca-dispatcher', capabilityId: 'text.summarize',
      scope: 'core::owner', bearerToken: tk,
    });
    const gate = cg.createGate({ authority, leaseStore: leaseStore({ l: lease }) });
    const r = gate.authorizeCall({
      leaseId: 'l', bearerToken: tk,
      call: {
        principal: 'orca-dispatcher', capabilityId: 'text.summarize', scope: 'core::owner',
        agentId: 'hermes', namespace: 'core::owner',
        constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true },
      },
    });
    assert.equal(r.decision, 'allow');
  });

test('branch: gate denies what the branch denies (unknown agent)',
  { skip: !branchAdapter ? 'branch worktree absent' : false }, () => {
    const authority = cg.adaptBranchAdapter(branchAdapter);
    const tk = 'tk-branch2';
    const lease = cg.mintLease({
      leaseId: 'l', principal: 'orca-dispatcher', capabilityId: 'text.summarize',
      scope: 'core::owner', bearerToken: tk,
    });
    const gate = cg.createGate({ authority, leaseStore: leaseStore({ l: lease }) });
    const r = gate.authorizeCall({
      leaseId: 'l', bearerToken: tk,
      call: {
        principal: 'orca-dispatcher', capabilityId: 'text.summarize', scope: 'core::owner',
        agentId: 'no-such-agent', namespace: 'core::owner', constraints: {},
      },
    });
    assert.equal(r.decision, 'deny');
  });
