/**
 * Tests for orca_fanout_guardrails.js — controller-enforced delegation bounds.
 * Run: node --test lib/orca/test/
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const g = require('../orca_fanout_guardrails.js');

const BRANCH_POLICY = '/home/nolan/worktrees/orca-autonomy/orca/control-loop/policy/orca_policy.js';
const BRANCH_ADAPTER = '/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js';

function tryRequire(p) {
  try { return require(p); } catch { return null; }
}

function ctrl() {
  return g.createController({ maxDepth: 2, maxConcurrency: 2, maxChildrenPerRun: 4, allowedAgents: ['hermes', 'ollama'] });
}

function baseReq(over = {}) {
  return {
    runId: 'run1', parentId: 'p0', parentDepth: 0, childAgent: 'hermes',
    runningChildren: 0, totalChildren: 0, delegationId: 'del-1', ...over,
  };
}

test('spawn within caps', () => {
  const d = g.requestDelegation(ctrl(), baseReq());
  assert.equal(d.action, 'spawn');
  assert.equal(d.childDepth, 1);
});

test('depth cap exceeded requeues (never drops, never spawns)', () => {
  const d = g.requestDelegation(ctrl(), baseReq({ parentDepth: 2 }));
  assert.equal(d.action, 'requeue');
  assert.equal(d.reason, 'depth_cap');
  assert.equal(d.delegationId, 'del-1');
});

test('concurrency cap exceeded requeues', () => {
  const d = g.requestDelegation(ctrl(), baseReq({ runningChildren: 2 }));
  assert.equal(d.action, 'requeue');
  assert.equal(d.reason, 'concurrency_cap');
});

test('per-run budget exceeded requeues', () => {
  const d = g.requestDelegation(ctrl(), baseReq({ totalChildren: 4 }));
  assert.equal(d.action, 'requeue');
  assert.equal(d.reason, 'budget_cap');
});

test('agent outside the allowed set is denied, not requeued', () => {
  const d = g.requestDelegation(ctrl(), baseReq({ childAgent: 'rogue-agent' }));
  assert.equal(d.action, 'deny');
  assert.equal(d.reason, 'agent_not_allowed');
});

test('invalid request is denied', () => {
  const d = g.requestDelegation(ctrl(), { bogus: true });
  assert.equal(d.action, 'deny');
  assert.equal(d.reason, 'invalid_request');
});

test('recordChild lists children on the parent record, immutably', () => {
  const parent = { runId: 'run1' };
  const p2 = g.recordChild(parent, { delegationId: 'del-1', childAgent: 'hermes', childDepth: 1, action: 'spawn' });
  assert.equal(p2.childTasks.length, 1);
  assert.equal(p2.childTasks[0].delegationId, 'del-1');
  assert.ok(!('childTasks' in parent), 'original parent untouched');
  const p3 = g.recordChild(p2, { delegationId: 'del-2', childAgent: 'ollama', childDepth: 1, action: 'requeue' });
  assert.equal(p3.childTasks.length, 2);
});

test('guardedDelegation: policy denial short-circuits the controller', () => {
  const stubPolicy = {
    classifyDelegation: () => ({ decisionClass: 'REQUIRES_HUMAN_APPROVAL', reason: 'nope' }),
  };
  const d = g.guardedDelegation({
    policyModule: stubPolicy, controller: ctrl(), classifyArgs: {}, delegation: baseReq(),
  });
  assert.equal(d.action, 'deny');
  assert.match(d.reason, /policy_requires_human_approval/);
});

test('guardedDelegation: AUTO_EXECUTE enters the controller', () => {
  const stubPolicy = { classifyDelegation: () => ({ decisionClass: 'AUTO_EXECUTE' }) };
  const ok = g.guardedDelegation({
    policyModule: stubPolicy, controller: ctrl(), classifyArgs: {}, delegation: baseReq(),
  });
  assert.equal(ok.action, 'spawn');
  const capped = g.guardedDelegation({
    policyModule: stubPolicy, controller: ctrl(), classifyArgs: {},
    delegation: baseReq({ runningChildren: 5 }),
  });
  assert.equal(capped.action, 'requeue');
  assert.equal(capped.reason, 'concurrency_cap');
});

// --- Branch integration (real orca_policy.js + real adapter; skip if branch absent) ---

const branchPolicy = tryRequire(BRANCH_POLICY);
const branchAdapter = tryRequire(BRANCH_ADAPTER);

function branchClassifyArgs(agentId) {
  return {
    adapter: branchAdapter,
    agentId, capability: 'text.summarize', namespace: 'core::test',
    constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true },
    workOrdersUsed: 0,
    runBounds: { maxWorkOrders: 2 },
  };
}

test('branch: real classifyDelegation AUTO_EXECUTE flows into controller spawn',
  { skip: !branchPolicy || !branchAdapter ? 'branch worktree absent' : false }, () => {
    const d = g.guardedDelegation({
      policyModule: branchPolicy, controller: ctrl(),
      classifyArgs: branchClassifyArgs('hermes'),
      delegation: baseReq({ childAgent: 'hermes' }),
    });
    assert.equal(d.policyDecision.decisionClass, 'AUTO_EXECUTE');
    assert.equal(d.action, 'spawn');
  });

test('branch: unknown agent denied by policy, never reaches controller',
  { skip: !branchPolicy || !branchAdapter ? 'branch worktree absent' : false }, () => {
    const d = g.guardedDelegation({
      policyModule: branchPolicy, controller: ctrl(),
      classifyArgs: branchClassifyArgs('no-such-agent'),
      delegation: baseReq({ childAgent: 'no-such-agent' }),
    });
    assert.equal(d.action, 'deny');
    assert.match(d.reason, /policy_requires_human_approval/);
  });

test('branch: work-order budget exhaustion escalates via policy (not requeue)',
  { skip: !branchPolicy || !branchAdapter ? 'branch worktree absent' : false }, () => {
    const args = branchClassifyArgs('hermes');
    args.workOrdersUsed = 2;
    const d = g.guardedDelegation({
      policyModule: branchPolicy, controller: ctrl(), classifyArgs: args, delegation: baseReq(),
    });
    assert.equal(d.action, 'deny');
    assert.match(d.policyDecision.reason, /budget exhausted/);
  });
