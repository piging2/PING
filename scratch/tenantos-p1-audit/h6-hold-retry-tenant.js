/**
 * HOSTILE TEST H6: HOLD retry cannot change tenant context or credentials
 * (directive A, Test 6 — this lane's explicit responsibility).
 *
 * Target: orca/port/effect_adapters/adapter_core.js (in the
 * feat/orca-unknown-outcome-port diff). The A6 op lifecycle is
 * dispatch -> probe -> evaluatePredicate -> escalateHold -> (reconciler sweep)
 * -> retry dispatch -> recordOutcome. The directive requires the
 * reconciliation attempt, original operation, capability, credentials, and
 * resulting evidence to ALL belong to the SAME tenant context: a retry path
 * must never execute using another tenant's credential, a global fallback,
 * an operator credential, or a stale credential from another run.
 *
 * Pre-fix break: the adapter carries NO tenant field at all. Tenant context
 * handed to escalateHold/recordOutcome is silently dropped (LOST), and a
 * later lifecycle call presenting a DIFFERENT tenant is accepted without a
 * murmur (SUBSTITUTED) — the sweep groups by op_key only, so a cross-tenant
 * retry is indistinguishable from a legitimate one.
 *
 * Post-fix: tenant_id is a first-class op-context field (threaded through
 * basePayload/escalateHold/recordOutcome, emitted in the A6 snake_case
 * payload next to mission_id); the op's tenant is pinned on first
 * tenant-bearing lifecycle call and any mid-op change — or mid-op drop —
 * throws TenantBoundaryError (CROSS_TENANT_REFERENCE / TENANT_CONTEXT_MISSING).
 * Ops that never carried a tenant are unaffected (backward compatible).
 *
 * Run: node --test h6-hold-retry-tenant.js
 * (from ~/workspace/scratch/tenantos-p1-audit/)
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const ADAPTER = '/home/hatch/workspace/orca/port/effect_adapters/adapter_core.js';

/** Minimal fake A6 foundation satisfying the pinned export contract, so the
 *  REAL-path payload schema (the one the reconciler sweep reads) is exercised. */
function fakeFoundation() {
  const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  return {
    EffectLedger: class {},
    EffectReconciler: class {},
    EffectExecutor: class {},
    UnknownOutcomeError: class extends Error {},
    deriveOpKey: ({ missionId, effect, input }) =>
      sha(`op:v1:${missionId}:${effect}:${JSON.stringify(input)}`),
    canonicalJson: (o) => JSON.stringify(o),
    describeState: () => 'fake',
    EFFECT_TYPES: new Set([
      'EFFECT_DISPATCHED', 'EFFECT_SUCCEEDED', 'EFFECT_FAILED',
      'EFFECT_UNKNOWN', 'EFFECT_RECONCILED', 'EFFECT_HELD',
    ]),
  };
}

function makeCore(captured) {
  delete require.cache[require.resolve(ADAPTER)];
  const createCore = require(ADAPTER);
  return createCore({
    foundation: fakeFoundation(),
    emit: (type, payload) => { captured.push({ type, payload }); },
  });
}

function opArgs(core, overrides = {}) {
  const opKey = core.deriveOpKey({ missionId: 'm-acme-1', effectName: 'send_email', input: { to: 'a@x.io' } });
  const attemptKey = core.deriveAttemptKey(opKey, 0);
  return {
    opKey, effectName: 'send_email', effectClass: '08', attemptKey,
    attempt: 0, consequence: 'high', missionId: 'm-acme-1',
    holdReason: 'probe timeout: no evidence either way',
    evidence: {}, ...overrides,
  };
}

test('H6 (tenant carried): escalateHold emits tenant_id in the A6 payload', () => {
  const captured = [];
  const core = makeCore(captured);
  const rec = core.escalateHold(opArgs(core, { tenantId: 'acme' }));
  assert.equal(rec.tenantId, 'acme');
  const unknown = captured.find((e) => e.type === 'EFFECT_UNKNOWN');
  assert.ok(unknown, 'EFFECT_UNKNOWN emitted');
  assert.equal(unknown.payload.tenant_id, 'acme');
  const held = captured.find((e) => e.type === 'EFFECT_HELD');
  assert.equal(held.payload.tenant_id, 'acme');
  console.log('HOLDS H6: op lifecycle carries tenant_id=acme through EFFECT_UNKNOWN + EFFECT_HELD.');
});

test('H6 (substitution refused): retry/outcome under tenant B after HOLD under tenant A throws', () => {
  const captured = [];
  const core = makeCore(captured);
  core.escalateHold(opArgs(core, { tenantId: 'acme' })); // HOLD under A
  // Reconciliation attempt arrives carrying tenant B's context (stale/other credential set).
  assert.throws(
    () => core.recordOutcome(opArgs(core, {
      tenantId: 'victim-b', decision: core.DECISIONS.RECOVER_SUCCEEDED,
      evidence: { result: 'delivered' },
    })),
    (err) => err.name === 'TenantBoundaryError' && err.code === 'CROSS_TENANT_REFERENCE'
  );
  console.log('HOLDS H6: mid-op tenant substitution (acme -> victim-b) REFUSED with CROSS_TENANT_REFERENCE.');
});

test('H6 (drop refused): retry that silently drops tenant context throws', () => {
  const captured = [];
  const core = makeCore(captured);
  core.escalateHold(opArgs(core, { tenantId: 'acme' })); // HOLD under A
  // Retry re-dispatches with NO tenant (global fallback / operator credential path).
  assert.throws(
    () => core.recordOutcome(opArgs(core, {
      decision: core.DECISIONS.SAFE_TO_RETRY, evidence: {},
    })),
    (err) => err.name === 'TenantBoundaryError' && err.code === 'TENANT_CONTEXT_MISSING'
  );
  console.log('HOLDS H6: mid-op tenant drop (acme -> none) REFUSED with TENANT_CONTEXT_MISSING.');
});

test('H6 (compatible): ops that never carried a tenant keep working (no behavior change)', () => {
  const captured = [];
  const core = makeCore(captured);
  const rec = core.escalateHold(opArgs(core)); // no tenantId at all
  assert.equal(rec.tenantId, null);
  const out = core.recordOutcome(opArgs(core, { decision: core.DECISIONS.RECOVER_FAILED, error: 'nope' }));
  assert.equal(out.decision, core.DECISIONS.RECOVER_FAILED);
  const unknown = captured.find((e) => e.type === 'EFFECT_UNKNOWN');
  assert.equal(unknown.payload.tenant_id, null);
  console.log('HOLDS H6: tenant-less ops unaffected (payload tenant_id null, lifecycle completes).');
});

test('H6 (same tenant retry): legitimate same-tenant retry proceeds', () => {
  const captured = [];
  const core = makeCore(captured);
  core.escalateHold(opArgs(core, { tenantId: 'acme' }));
  const out = core.recordOutcome(opArgs(core, {
    tenantId: 'acme', decision: core.DECISIONS.RECOVER_SUCCEEDED,
    evidence: { result: 'delivered' },
  }));
  assert.equal(out.decision, core.DECISIONS.RECOVER_SUCCEEDED);
  const ok = captured.find((e) => e.type === 'EFFECT_SUCCEEDED');
  assert.equal(ok.payload.tenant_id, 'acme');
  assert.equal(ok.payload.result, 'delivered');
  console.log('HOLDS H6: same-tenant (acme -> acme) retry/reconcile proceeds, evidence bound to tenant.');
});
