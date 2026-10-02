'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createIdentity,
  recordOutcome,
  markAuthorized,
  loadStore,
  IDENTITY_STATES,
} from '../src/identity-state.js';

function freshStore() {
  const dir = mkdtempSync(join(tmpdir(), 'broker-test-'));
  return loadStore(join(dir, 'identities.json'));
}

test('identity states are the exact required set', () => {
  assert.deepEqual([...IDENTITY_STATES].sort(), [
    'ACTIVE', 'AUTH_FAILED', 'COOLDOWN', 'DEGRADED',
    'DISABLED', 'EXHAUSTED', 'QUARANTINED', 'RATE_LIMITED',
  ].sort());
});

test('new identity starts DISABLED with full field set', () => {
  const id = createIdentity('identity_1');
  assert.equal(id.status, 'DISABLED');
  assert.equal(id.quota_state, 'UNKNOWN');
  assert.equal(id.quota_remaining, null);
  assert.equal(id.quota_reset_at, null);
  assert.equal(id.task_count, 0);
  assert.ok('last_quota_observed_at' in id);
  assert.ok('last_success_at' in id);
  assert.ok('last_failure_at' in id);
});

test('state transitions per classification', () => {
  const id = markAuthorized(createIdentity('identity_1'));
  assert.equal(id.status, 'ACTIVE');

  recordOutcome(id, 'SUCCESS');
  assert.equal(id.status, 'ACTIVE');
  assert.equal(id.task_count, 1);
  assert.ok(id.last_success_at);

  recordOutcome(id, 'RATE_LIMITED');
  assert.equal(id.status, 'RATE_LIMITED');

  recordOutcome(id, 'SUCCESS');
  recordOutcome(id, 'EXHAUSTED');
  assert.equal(id.status, 'EXHAUSTED');
  assert.equal(id.quota_remaining, 0);

  recordOutcome(id, 'SUCCESS');
  recordOutcome(id, 'AUTH_FAILED');
  assert.equal(id.status, 'AUTH_FAILED');

  recordOutcome(id, 'SUCCESS');
  recordOutcome(id, 'TEMPORARY_FAILURE');
  assert.equal(id.status, 'COOLDOWN');

  recordOutcome(id, 'SUCCESS');
  const before = id.status;
  recordOutcome(id, 'POLICY_BLOCKED');
  assert.equal(id.status, before, 'policy block must not change identity health');
  assert.ok(id.last_failure_at);
});

test('repeated unknown failures quarantine the identity', () => {
  const id = markAuthorized(createIdentity('identity_1'));
  recordOutcome(id, 'UNKNOWN');
  assert.equal(id.status, 'DEGRADED');
  recordOutcome(id, 'TOOL_FAILURE');
  assert.equal(id.status, 'DEGRADED');
  recordOutcome(id, 'UNKNOWN');
  assert.equal(id.status, 'QUARANTINED');
  // success recovers
  recordOutcome(id, 'SUCCESS');
  assert.equal(id.status, 'ACTIVE');
});

test('store persists and reloads', () => {
  const dir = mkdtempSync(join(tmpdir(), 'broker-test-'));
  const p = join(dir, 'identities.json');
  const s1 = loadStore(p);
  const id = markAuthorized(createIdentity('identity_1'));
  id.quota_remaining = 1500;
  s1.put(id);
  const s2 = loadStore(p);
  const back = s2.get('identity_1');
  assert.equal(back.status, 'ACTIVE');
  assert.equal(back.quota_remaining, 1500);
  assert.equal(s2.get('nope'), null);
});

test('freshStore helper works', () => {
  const s = freshStore();
  assert.deepEqual(s.list(), []);
});
