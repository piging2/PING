'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBroker } from '../src/broker.js';
import { loadStore, markAuthorized, createIdentity } from '../src/identity-state.js';
import { applyQuotaSnapshot } from '../src/quota-model.js';
import { creditCeiling } from '../src/cost-model.js';
import { assertNoTokenMaterial } from '../src/credential-boundary.js';

const FUTURE_RESET = '2026-10-01T00:00:00.000Z';
const NOW = new Date('2026-09-17T12:00:00.000Z');

function brokerWith(calls, resultFactory) {
  const dir = mkdtempSync(join(tmpdir(), 'broker-test-'));
  const store = loadStore(join(dir, 'identities.json'));
  const id = markAuthorized(createIdentity('identity_1'));
  applyQuotaSnapshot(id, { remaining: 5000, resetAt: FUTURE_RESET });
  store.put(id);
  const runner = async (opts) => {
    calls.push(opts);
    return resultFactory(opts);
  };
  const broker = createBroker({ store, runner, clock: () => NOW });
  return { broker, store };
}

function okResult(opts) {
  return {
    classification: 'SUCCESS',
    requested_credit_ceiling: opts.maxAiCredits,
    actual_reported_usage: { total: 11 },
    result_text: 'done',
    model: null,
    timed_out: false,
    started_at: NOW.toISOString(),
    completed_at: NOW.toISOString(),
    stderr_tail: null,
    event_summary: { terminal_signals: [], transient_signals: [], saw_result: true },
  };
}

test('T0/T1 never invoke the runner (no Copilot, no quota)', () => {
  const calls = [];
  const { broker } = brokerWith(calls, okResult);
  return Promise.all([
    broker.dispatch({ tier: 'T0', description: 'format files', prompt: 'x', workdir: '/tmp' }),
    broker.dispatch({ tier: 'T1', description: 'scripted refactor', prompt: 'x', workdir: '/tmp' }),
  ]).then(([r0, r1]) => {
    assert.equal(r0.route, 'local');
    assert.equal(r1.route, 'local');
    assert.equal(r0.invoked_copilot, false);
    assert.equal(r1.invoked_copilot, false);
    assert.equal(calls.length, 0, 'runner must not be called for T0/T1');
  });
});

test('T2 eligible: runner called with soft ceiling; evidence separates ceiling from usage', async () => {
  const calls = [];
  const { broker, store } = brokerWith(calls, okResult);
  const out = await broker.dispatch({ tier: 'T2', prompt: 'do the thing', workdir: '/tmp' });
  assert.equal(out.route, 'copilot');
  assert.equal(out.invoked_copilot, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].maxAiCredits, creditCeiling('T2'));
  assert.equal(out.requested_credit_ceiling, creditCeiling('T2'));
  assert.deepEqual(out.actual_reported_usage, { total: 11 });
  assert.equal(out.identity_id, 'identity_1');
  assert.equal(store.get('identity_1').task_count, 1);
  assert.ok(assertNoTokenMaterial(out, 'evidence'));
});

test('T2 blocked when quota insufficient: runner never called', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'broker-test-'));
  const store = loadStore(join(dir, 'identities.json'));
  const id = markAuthorized(createIdentity('identity_1'));
  applyQuotaSnapshot(id, { remaining: 10, resetAt: FUTURE_RESET });
  store.put(id);
  const calls = [];
  const broker = createBroker({ store, runner: async (o) => { calls.push(o); return okResult(o); }, clock: () => NOW });
  const out = await broker.dispatch({ tier: 'T4', prompt: 'huge task', workdir: '/tmp' });
  assert.equal(out.route, 'blocked');
  assert.equal(out.invoked_copilot, false);
  assert.equal(calls.length, 0);
  assert.match(out.reason, /quota_remaining/);
});

test('EXHAUSTED result moves identity to EXHAUSTED with zero remaining', async () => {
  const calls = [];
  const { broker, store } = brokerWith(calls, (o) => ({ ...okResult(o), classification: 'EXHAUSTED' }));
  const out = await broker.dispatch({ tier: 'T2', prompt: 'x', workdir: '/tmp' });
  assert.equal(out.classification, 'EXHAUSTED');
  const id = store.get('identity_1');
  assert.equal(id.status, 'EXHAUSTED');
  assert.equal(id.quota_remaining, 0);
});

test('identity record in store never contains token material', async () => {
  const calls = [];
  const { broker, store } = brokerWith(calls, okResult);
  await broker.dispatch({ tier: 'T3', prompt: 'x', workdir: '/tmp' });
  assert.ok(assertNoTokenMaterial(store.get('identity_1'), 'identity record'));
});

// Execution-authorization containment (identity_5..10 gap):
// OWNERSHIP IS NOT EXECUTION AUTHORIZATION. The test harness dispatches as
// identity_1, which is explicitly inside AUTHORIZED_IDENTITY_IDS (mirroring
// AGENT_PROFILES 1..4); the harness is therefore a registered caller, not a
// special case.

test('dispatch as identity_5 (ACTIVE, funded, but unregistered) is denied with zero spend', async () => {
  const calls = [];
  const { broker, store } = brokerWith(calls, okResult);
  // Simulate the live gap: identity_5 exists in the state file, ACTIVE with
  // quota, exactly as observed on the Pig (task_count 0, never spent).
  const id5 = markAuthorized(createIdentity('identity_5'));
  applyQuotaSnapshot(id5, { remaining: 200, resetAt: FUTURE_RESET });
  store.put(id5);
  const out = await broker.dispatch({ tier: 'T2', identity_id: 'identity_5', prompt: 'x', workdir: '/tmp' });
  assert.equal(out.route, 'blocked');
  assert.equal(out.invoked_copilot, false);
  assert.equal(calls.length, 0, 'runner must not be called for unregistered identity');
  assert.match(out.reason, /not registered\/authorized/);
  assert.equal(store.get('identity_5').task_count, 0, 'no spend recorded against identity_5');
});

test('dispatch as unknown identity_99 is denied and never materializes a store row', async () => {
  const calls = [];
  const { broker, store } = brokerWith(calls, okResult);
  const out = await broker.dispatch({ tier: 'T2', identity_id: 'identity_99', prompt: 'x', workdir: '/tmp' });
  assert.equal(out.route, 'blocked');
  assert.equal(out.invoked_copilot, false);
  assert.equal(calls.length, 0);
  assert.equal(store.get('identity_99'), null, 'unregistered id must not materialize a row');
});

test('dispatch as identity_1 (registered) still spends normally', async () => {
  const calls = [];
  const { broker } = brokerWith(calls, okResult);
  const out = await broker.dispatch({ tier: 'T2', identity_id: 'identity_1', prompt: 'x', workdir: '/tmp' });
  assert.equal(out.route, 'copilot');
  assert.equal(out.invoked_copilot, true);
  assert.equal(calls.length, 1);
});

// Lane F step 0: event.tenant_id threads through broker.dispatch(task) into
// the evidence record. The broker is a pass-through here — it does not
// validate tenants (owned by the scheduler / orca-adapter).

test('tenant_id threads into copilot evidence', async () => {
  const calls = [];
  const { broker } = brokerWith(calls, okResult);
  const out = await broker.dispatch({ tier: 'T2', identity_id: 'identity_1', tenant_id: 'happy-place', prompt: 'x', workdir: '/tmp' });
  assert.equal(out.route, 'copilot');
  assert.equal(out.tenant_id, 'happy-place');
  assert.ok(assertNoTokenMaterial(out, 'evidence'));
});

test('tenant_id absent -> null (core execution)', async () => {
  const calls = [];
  const { broker } = brokerWith(calls, okResult);
  const out = await broker.dispatch({ tier: 'T2', identity_id: 'identity_1', prompt: 'x', workdir: '/tmp' });
  assert.equal(out.route, 'copilot');
  assert.equal(out.tenant_id, null);
});

test('tenant_id threads into the local (T0/T1) route record', async () => {
  const calls = [];
  const { broker } = brokerWith(calls, okResult);
  const out = await broker.dispatch({ tier: 'T0', identity_id: 'identity_1', tenant_id: 'coppersmith-plumbing', prompt: 'x', workdir: '/tmp' });
  assert.equal(out.route, 'local');
  assert.equal(out.tenant_id, 'coppersmith-plumbing');
  assert.equal(calls.length, 0);
});

test('tenant_id threads into the quota-blocked record', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'broker-test-'));
  const store = loadStore(join(dir, 'identities.json'));
  const id = markAuthorized(createIdentity('identity_1'));
  applyQuotaSnapshot(id, { remaining: 10, resetAt: FUTURE_RESET });
  store.put(id);
  const calls = [];
  const broker = createBroker({ store, runner: async (o) => { calls.push(o); return okResult(o); }, clock: () => NOW });
  const out = await broker.dispatch({ tier: 'T4', identity_id: 'identity_1', tenant_id: 'happy-place', prompt: 'x', workdir: '/tmp' });
  assert.equal(out.route, 'blocked');
  assert.equal(out.tenant_id, 'happy-place');
  assert.equal(calls.length, 0);
});

test('denied identity_5 still carries tenant_id with zero spend', async () => {
  const calls = [];
  const { broker, store } = brokerWith(calls, okResult);
  const id5 = markAuthorized(createIdentity('identity_5'));
  applyQuotaSnapshot(id5, { remaining: 200, resetAt: FUTURE_RESET });
  store.put(id5);
  const out = await broker.dispatch({ tier: 'T2', identity_id: 'identity_5', tenant_id: 'happy-place', prompt: 'x', workdir: '/tmp' });
  assert.equal(out.route, 'blocked');
  assert.equal(out.tenant_id, 'happy-place');
  assert.equal(out.invoked_copilot, false);
  assert.equal(calls.length, 0);
  assert.equal(store.get('identity_5').task_count, 0);
});
