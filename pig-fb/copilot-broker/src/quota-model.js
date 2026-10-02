'use strict';
//
// Quota model. GitHub is the authority: entitlement state is populated ONLY
// from actual quota information (account.getQuota snapshots / CLI quota events).
// The old 31-day-cooldown assumption is permanently rejected. Included AI-credit
// allowances reset at 00:00 UTC on the first of each calendar month, but the
// broker always prefers the server-returned reset timestamp over arithmetic.
//
// Predictive eligibility: quota_remaining >= estimated_task_cost + safety_reserve.
// Unknown or stale quota fails CLOSED: the task waits for a refresh.

export const QUOTA_STATES = Object.freeze([
  'UNKNOWN', // never observed
  'OK',
  'LOW', // below the safety reserve; spendable only with explicit override
  'EXHAUSTED',
  'STALE', // past quota_reset_at without a refresh; must re-query before spending
]);

// snapshot: { remaining: number|null, resetAt: ISO string|null, observedAt?: ISO string }
export function applyQuotaSnapshot(identity, snapshot) {
  const observedAt = snapshot.observedAt || new Date().toISOString();
  identity.quota_remaining = snapshot.remaining ?? null;
  identity.quota_reset_at = snapshot.resetAt || null;
  identity.last_quota_observed_at = observedAt;
  identity.quota_state =
    snapshot.remaining == null
      ? 'UNKNOWN'
      : snapshot.remaining <= 0
        ? 'EXHAUSTED'
        : 'OK';
  identity.updated_at = observedAt;
  return identity;
}

export function isQuotaStale(identity, now = new Date()) {
  if (!identity.quota_reset_at) return identity.quota_state === 'UNKNOWN';
  const resetAt = new Date(identity.quota_reset_at);
  // If we observed the quota after the reset time, we have post-reset numbers.
  // Only stale if our observation predates the reset.
  if (identity.last_quota_observed_at) {
    const observedAt = new Date(identity.last_quota_observed_at);
    if (observedAt >= resetAt) return false;
  }
  return now >= resetAt;
}

export function refreshQuotaState(identity, now = new Date()) {
  if (isQuotaStale(identity, now) && identity.quota_state !== 'UNKNOWN') {
    identity.quota_state = 'STALE';
  }
  return identity;
}

// Returns { eligible: boolean, reason: string }.
export function isEligible(identity, estimatedCost, safetyReserve, now = new Date()) {
  if (identity.status !== 'ACTIVE' && identity.status !== 'DEGRADED') {
    return { eligible: false, reason: `identity status ${identity.status} is not spendable` };
  }
  refreshQuotaState(identity, now);
  if (identity.quota_state === 'UNKNOWN' || identity.quota_remaining == null) {
    return { eligible: false, reason: 'quota unknown; refresh required (fail closed)' };
  }
  if (identity.quota_state === 'STALE') {
    return { eligible: false, reason: 'quota past reset_at without refresh; re-query required' };
  }
  if (identity.quota_state === 'EXHAUSTED' || identity.quota_remaining <= 0) {
    return { eligible: false, reason: 'quota exhausted' };
  }
  const required = estimatedCost + safetyReserve;
  if (identity.quota_remaining < required) {
    return {
      eligible: false,
      reason: `quota_remaining ${identity.quota_remaining} < estimated ${estimatedCost} + reserve ${safetyReserve}`,
    };
  }
  return { eligible: true, reason: 'ok' };
}
