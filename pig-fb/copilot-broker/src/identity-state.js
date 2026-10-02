'use strict';
//
// Identity state: the minimal persistent representation of one Copilot identity.
// The model is N-ready (a map of identity_id -> record) but the broker
// operates exactly one identity until a human authorizes more.
//
// The broker's durable state holds identity_id and metadata only. It NEVER
// holds token material (see credential-boundary.js).

import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const IDENTITY_STATES = Object.freeze([
  'ACTIVE',
  'DEGRADED',
  'RATE_LIMITED',
  'EXHAUSTED',
  'AUTH_FAILED',
  'QUARANTINED',
  'COOLDOWN',
  'DISABLED',
]);

const QUARANTINE_AFTER_UNKNOWN_FAILURES = 3;

function nowIso() {
  return new Date().toISOString();
}

export function createIdentity(identity_id) {
  if (!identity_id || typeof identity_id !== 'string') {
    throw new Error('identity_id must be a non-empty string');
  }
  return {
    identity_id,
    status: 'DISABLED', // not usable until a human authorizes it
    quota_state: 'UNKNOWN',
    quota_remaining: null,
    quota_reset_at: null,
    last_quota_observed_at: null,
    last_success_at: null,
    last_failure_at: null,
    task_count: 0,
    consecutive_unknown_failures: 0,
    cooldown_until: null,
    github_login: null, // non-secret display name, filled after authorization
    updated_at: nowIso(),
  };
}

function assertKnownStatus(status) {
  if (!IDENTITY_STATES.includes(status)) throw new Error(`unknown identity status: ${status}`);
}

// Apply one execution outcome to an identity record. Returns the record.
export function recordOutcome(identity, classification, detail = {}) {
  assertKnownStatus(identity.status);
  identity.updated_at = nowIso();
  switch (classification) {
    case 'SUCCESS':
      identity.status = 'ACTIVE';
      identity.last_success_at = nowIso();
      identity.task_count += 1;
      identity.consecutive_unknown_failures = 0;
      identity.cooldown_until = null;
      break;
    case 'RATE_LIMITED':
      identity.status = 'RATE_LIMITED';
      identity.last_failure_at = nowIso();
      identity.cooldown_until = detail.retry_after_iso || null;
      break;
    case 'EXHAUSTED':
      identity.status = 'EXHAUSTED';
      identity.last_failure_at = nowIso();
      identity.quota_state = 'EXHAUSTED';
      identity.quota_remaining = 0;
      break;
    case 'AUTH_FAILED':
      identity.status = 'AUTH_FAILED';
      identity.last_failure_at = nowIso();
      break;
    case 'TEMPORARY_FAILURE':
      // Per-session ceiling hit: identity is fine, this task needs a new session.
      identity.status = 'COOLDOWN';
      identity.last_failure_at = nowIso();
      identity.cooldown_until = detail.retry_after_iso || null;
      break;
    case 'POLICY_BLOCKED':
      // Content/policy rejection is about the task, not the identity's health.
      identity.last_failure_at = nowIso();
      break;
    case 'TOOL_FAILURE':
    case 'UNKNOWN':
      identity.last_failure_at = nowIso();
      identity.consecutive_unknown_failures += 1;
      identity.status =
        identity.consecutive_unknown_failures >= QUARANTINE_AFTER_UNKNOWN_FAILURES
          ? 'QUARANTINED'
          : 'DEGRADED';
      break;
    default:
      throw new Error(`unknown classification: ${classification}`);
  }
  return identity;
}

export function markAuthorized(identity, { github_login = null } = {}) {
  identity.status = 'ACTIVE';
  if (github_login) identity.github_login = github_login;
  identity.updated_at = nowIso();
  return identity;
}

// --- File store (atomic writes; JSON; no secrets ever written here) ---

const BROKER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_STATE_PATH = resolve(BROKER_ROOT, 'state', 'identities.json');

export function loadStore(statePath = DEFAULT_STATE_PATH) {
  let data = {};
  try {
    data = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return {
    path: statePath,
    get(identity_id) {
      return data[identity_id] || null;
    },
    list() {
      return Object.values(data);
    },
    put(identity) {
      assertKnownStatus(identity.status);
      data[identity.identity_id] = identity;
      this.save();
      return identity;
    },
    save() {
      mkdirSync(dirname(statePath), { recursive: true });
      const tmp = `${statePath}.tmp`;
      writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
      renameSync(tmp, statePath); // atomic replace
    },
  };
}
