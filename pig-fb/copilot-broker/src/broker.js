'use strict';
//
// Broker: Pig task -> classifier -> (local | Copilot) -> identity state -> evidence.
//
// Flow:
//   task
//     -> classify tier
//     -> T0/T1: local route. Copilot is NEVER invoked.
//     -> T2/T3/T4: identity eligibility check (predictive, fail closed)
//     -> cost estimate + safety reserve -> per-task --max-ai-credits ceiling
//     -> CLI with scrubbed env -> JSONL classification
//     -> identity state update -> evidence record (no secrets, ever)

import { classify, usesCopilot, assertTier } from './task-tiers.js';
import { loadStore, recordOutcome, createIdentity } from './identity-state.js';
import { isEligible } from './quota-model.js';
import { estimateCost, safetyReserve, creditCeiling } from './cost-model.js';
import { buildChildEnv, assertNoTokenMaterial } from './credential-boundary.js';
import { runCopilotTask } from './cli-runner.js';

export const DEFAULT_IDENTITY_ID = 'identity_1';

// Execution-authorization allowlist: the ONLY identity_ids dispatch() will
// spend quota for. Mirrors the canonical registry AGENT_PROFILES
// (orca-workstream-d/external_agent_adapter.js and the Pig worktree copy),
// which authorizes exactly identity_1..identity_4 and fails closed on
// anything else. This inline set is deliberately NOT a new authority: any
// change to the authorized set must land in AGENT_PROFILES first and be
// mirrored here, never expanded here alone. OWNERSHIP IS NOT EXECUTION
// AUTHORIZATION: a human-OAuth login existing in the state file (e.g.
// identity_5..identity_10) does not grant dispatch rights.
export const AUTHORIZED_IDENTITY_IDS = Object.freeze(
  new Set(['identity_1', 'identity_2', 'identity_3', 'identity_4'])
);

function denyUnregisteredIdentity(identity_id, tier, tenant_id) {
  // Secret-free denial log: identity_id is a non-secret registry key, and
  // nothing from the state row (quota, logins, token-adjacent fields) is
  // emitted. Denial happens BEFORE getIdentity() so unregistered ids never
  // materialize rows in the store.
  console.error(
    `[broker] DENIED dispatch: '${identity_id}' is not a registered/authorized execution identity`
  );
  return {
    route: 'blocked',
    tier,
    identity_id,
    tenant_id: tenant_id ?? null,
    invoked_copilot: false,
    reason: 'identity not registered/authorized for execution (fail closed)',
  };
}

export function createBroker(deps = {}) {
  const store = deps.store || loadStore(deps.statePath);
  const runner = deps.runner || runCopilotTask;
  const clock = deps.clock || (() => new Date());

  function getIdentity(identity_id) {
    let identity = store.get(identity_id);
    if (!identity) {
      identity = createIdentity(identity_id);
      store.put(identity);
    }
    return identity;
  }

  async function dispatch(task) {
    if (!task || typeof task !== 'object') throw new Error('task is required');
    const tier = assertTier(classify(task));
    const identity_id = task.identity_id || DEFAULT_IDENTITY_ID;
    // Tenant threading (lane B handoff, lane F step 0): the scheduler dispatch
    // event's authoritative tenant_id passes through the task into every
    // evidence/return record. Null when absent (core execution). The broker
    // does NOT validate tenants — validation is owned by the scheduler and
    // the orca-adapter; this is a pass-through, never a new authority.
    const tenant_id = task.tenant_id ?? null;

    // Single choke point: unregistered identities are denied before any
    // routing, row materialization, quota check, or Copilot invocation.
    if (!AUTHORIZED_IDENTITY_IDS.has(identity_id)) {
      return denyUnregisteredIdentity(identity_id, tier, tenant_id);
    }

    if (!usesCopilot(tier)) {
      return {
        route: 'local',
        tier,
        identity_id,
        tenant_id,
        invoked_copilot: false,
        note: 'T0/T1 tasks are handled locally; the broker never invokes Copilot for them.',
      };
    }

    const identity = getIdentity(identity_id);
    const estimated = estimateCost(tier);
    const reserve = safetyReserve();
    const eligibility = isEligible(identity, estimated, reserve, clock());
    if (!eligibility.eligible) {
      return {
        route: 'blocked',
        tier,
        identity_id,
        tenant_id,
        invoked_copilot: false,
        reason: eligibility.reason,
      };
    }

    const ceiling = creditCeiling(tier); // soft ceiling; may overshoot
    const env = buildChildEnv(); // scrub ambient token overrides; no token material
    const result = await runner({
      prompt: task.prompt,
      workdir: task.workdir,
      maxAiCredits: ceiling,
      model: task.model || null,
      env,
    });

    recordOutcome(identity, result.classification, {});
    store.put(identity);

    const evidence = {
      route: 'copilot',
      tier,
      identity_id,
      tenant_id,
      invoked_copilot: true,
      classification: result.classification,
      model: result.model || null,
      requested_credit_ceiling: result.requested_credit_ceiling,
      actual_reported_usage: result.actual_reported_usage,
      started_at: result.started_at,
      completed_at: result.completed_at,
      timed_out: result.timed_out,
      event_summary: result.event_summary,
      stderr_tail: result.stderr_tail,
      // result_text is task output, not a credential; kept for evidence.
      result_text: result.result_text,
    };
    assertNoTokenMaterial(evidence, 'execution evidence');
    assertNoTokenMaterial(identity, 'identity record');
    return evidence;
  }

  return { dispatch, store, getIdentity };
}
