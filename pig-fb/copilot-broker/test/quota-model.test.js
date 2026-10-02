'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIdentity, markAuthorized } from '../src/identity-state.js';
import {
  applyQuotaSnapshot,
  isEligible,
  isQuotaStale,
  refreshQuotaState,
} from '../src/quota-model.js';

function authorizedWithQuota(remaining, resetAt) {
  const id = markAuthorized(createIdentity('identity_1'));
  applyQuotaSnapshot(id, { remaining, resetAt });
  return id;
}

const FUTURE_RESET = '2026-10-01T00:00:00.000Z';
const NOW = new Date('2026-09-17T12:00:00.000Z');

test('quota snapshot populates authoritative fields', () => {
  const id = authorizedWithQuota(1500, FUTURE_RESET);
  assert.equal(id.quota_remaining, 1500);
  assert.equal(id.quota_reset_at, FUTURE_RESET);
  assert.ok(id.last_quota_observed_at);
  assert.equal(id.quota_state, 'OK');
});

test('predictive eligibility: remaining >= cost + reserve', () => {
  const id = authorizedWithQuota(1000, FUTURE_RESET);
  assert.ok(isEligible(id, 100, 50, NOW).eligible);
  const no = isEligible(id, 960, 50, NOW);
  assert.ok(!no.eligible);
  assert.match(no.reason, /quota_remaining/);
});

test('unknown quota fails closed', () => {
  const id = markAuthorized(createIdentity('identity_1'));
  const r = isEligible(id, 10, 50, NOW);
  assert.ok(!r.eligible);
  assert.match(r.reason, /unknown/);
});

test('stale quota (past reset_at) fails closed until refresh', () => {
  const id = authorizedWithQuota(1000, '2026-09-01T00:00:00.000Z');
  assert.ok(isQuotaStale(id, NOW));
  const r = isEligible(id, 10, 50, NOW);
  assert.ok(!r.eligible);
  assert.match(r.reason, /re-query|stale/i);
  assert.equal(id.quota_state, 'STALE');
  // refresh with a new server snapshot restores eligibility
  applyQuotaSnapshot(id, { remaining: 1900, resetAt: FUTURE_RESET });
  assert.ok(isEligible(id, 10, 50, NOW).eligible);
});

test('non-spendable statuses are ineligible', () => {
  for (const status of ['DISABLED', 'EXHAUSTED', 'AUTH_FAILED', 'QUARANTINED', 'RATE_LIMITED', 'COOLDOWN']) {
    const id = authorizedWithQuota(10000, FUTURE_RESET);
    id.status = status;
    assert.ok(!isEligible(id, 10, 50, NOW).eligible, status);
  }
  const degraded = authorizedWithQuota(10000, FUTURE_RESET);
  degraded.status = 'DEGRADED';
  assert.ok(isEligible(degraded, 10, 50, NOW).eligible, 'DEGRADED stays spendable');
});

test('refreshQuotaState marks STALE without inventing numbers', () => {
  const id = authorizedWithQuota(500, '2026-09-01T00:00:00.000Z');
  refreshQuotaState(id, NOW);
  assert.equal(id.quota_state, 'STALE');
  assert.equal(id.quota_remaining, 500, 'stale does not zero the last known value');
});
