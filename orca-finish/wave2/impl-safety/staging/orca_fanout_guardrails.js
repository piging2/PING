/**
 * orca_fanout_guardrails.js — Controller-enforced delegation guardrails.
 *
 * ADAPT of orka-delegation-guardrails. The guardrails are enforced by the
 * CONTROLLER (dispatch authority), never by the parent agent's goodwill:
 * max delegation depth, max concurrent children, per-run child budget, and an
 * allowed-agents membership list.
 *
 * Invariant (from source): fan-out is bounded in depth, breadth, and membership
 * by the dispatch authority. Hitting a CAPACITY cap requeues the delegation
 * instead of failing it: the work waits for capacity, it is never dropped and
 * never failed. Membership violations (agent not in the allowed set) are
 * DENIED, not requeued: a security boundary will not open on retry, and
 * requeueing would turn a policy refusal into a busy loop.
 *
 * This module is pure: no I/O, no scheduler import, no clock. The controller
 * supplies the current counts; the module returns a decision record.
 */

'use strict';

const DECISIONS = Object.freeze({
  SPAWN: 'spawn',
  REQUEUE: 'requeue',
  DENY: 'deny',
});

const REASONS = Object.freeze({
  WITHIN_CAPS: 'within_caps',
  DEPTH_CAP: 'depth_cap',
  CONCURRENCY_CAP: 'concurrency_cap',
  BUDGET_CAP: 'budget_cap',
  AGENT_NOT_ALLOWED: 'agent_not_allowed',
  INVALID_REQUEST: 'invalid_request',
});

/**
 * @param {object} cfg
 * @param {number} cfg.maxDepth - max delegation depth; a child of a parent at
 *   depth D would run at depth D+1. Root runs are depth 0.
 * @param {number} cfg.maxConcurrency - max concurrently running children per parent.
 * @param {string[]|null} cfg.allowedAgents - membership allowlist; null/undefined
 *   means no membership restriction is configured.
 * @param {number} cfg.maxChildrenPerRun - per-run budget: total children a run
 *   may ever spawn (spawned + requeued counts against it, so a requeued
 *   delegation cannot dodge the budget by cycling).
 */
function createController(cfg) {
  const { maxDepth, maxConcurrency, maxChildrenPerRun } = cfg;
  for (const [k, v] of Object.entries({ maxDepth, maxConcurrency, maxChildrenPerRun })) {
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`fanout guardrail: ${k} must be a non-negative integer, got ${JSON.stringify(v)}`);
    }
  }
  const allowedAgents = cfg.allowedAgents == null ? null : Object.freeze([...cfg.allowedAgents]);
  return Object.freeze({ maxDepth, maxConcurrency, maxChildrenPerRun, allowedAgents });
}

/**
 * Evaluate one delegation request.
 *
 * @param {object} controller - from createController.
 * @param {object} req
 * @param {string} req.runId
 * @param {string} req.parentId
 * @param {number} req.parentDepth - depth of the requesting parent.
 * @param {string} req.childAgent - agent type being delegated to.
 * @param {number} req.runningChildren - children of this parent currently running.
 * @param {number} req.totalChildren - children this run has spawned so far
 *   (spawned + requeued; supplied by the controller's durable count).
 * @param {string} req.delegationId - stable id of this delegation request, used
 *   as the requeue key so a requeued delegation is not duplicated.
 *
 * @returns {{ action, reason, runId, parentId, delegationId, childDepth }} where
 *   action is 'spawn' | 'requeue' | 'deny'.
 */
function requestDelegation(controller, req) {
  const { runId, parentId, parentDepth, childAgent, runningChildren, totalChildren, delegationId } = req || {};
  const base = { runId, parentId, delegationId, childDepth: (parentDepth ?? 0) + 1 };

  if (typeof runId !== 'string' || typeof parentId !== 'string' ||
      typeof delegationId !== 'string' || typeof childAgent !== 'string' ||
      !Number.isInteger(parentDepth) || parentDepth < 0 ||
      !Number.isInteger(runningChildren) || runningChildren < 0 ||
      !Number.isInteger(totalChildren) || totalChildren < 0) {
    return { ...base, action: DECISIONS.DENY, reason: REASONS.INVALID_REQUEST };
  }

  // Membership: enforced by the controller. A delegation to an agent outside
  // the allowed set is a policy refusal: deny, never requeue.
  if (controller.allowedAgents !== null && !controller.allowedAgents.includes(childAgent)) {
    return { ...base, action: DECISIONS.DENY, reason: REASONS.AGENT_NOT_ALLOWED };
  }

  // Depth: structural bound. Requeue (per the "over-cap requeues, never drops"
  // rule): the delegation stays named in the queue where the coordinator can
  // re-home or explicitly fail it. Never silently dropped.
  if (base.childDepth > controller.maxDepth) {
    return { ...base, action: DECISIONS.REQUEUE, reason: REASONS.DEPTH_CAP };
  }

  // Concurrency: capacity bound. Requeue: the work waits for capacity.
  if (runningChildren >= controller.maxConcurrency) {
    return { ...base, action: DECISIONS.REQUEUE, reason: REASONS.CONCURRENCY_CAP };
  }

  // Budget: per-run envelope. Requeue: the delegation is not dropped; it waits
  // for the coordinator to raise the budget or explicitly cancel it.
  if (totalChildren >= controller.maxChildrenPerRun) {
    return { ...base, action: DECISIONS.REQUEUE, reason: REASONS.BUDGET_CAP };
  }

  return { ...base, action: DECISIONS.SPAWN, reason: REASONS.WITHIN_CAPS };
}

/**
 * Record a child on the parent record. The parent status lists its child
 * tasks (from the source mechanism: "the parent status lists its child tasks").
 * Immutable: returns a new parent record.
 *
 * @param {object} parent - parent run record, may carry childTasks: [].
 * @param {{ delegationId, childAgent, childDepth, action }} child
 */
function recordChild(parent, child) {
  const childTasks = Array.isArray(parent.childTasks) ? [...parent.childTasks] : [];
  childTasks.push({
    delegationId: child.delegationId,
    childAgent: child.childAgent,
    childDepth: child.childDepth,
    action: child.action,
    recordedAt: new Date().toISOString(),
  });
  return { ...parent, childTasks };
}

/**
 * Branch composition seam: run the branch's policy classifier FIRST, then the
 * guardrail controller. The branch policy stays the outer authority: a
 * REQUIRES_HUMAN_APPROVAL or PROHIBITED classification is returned as a deny
 * and is NEVER requeued by the controller (a policy refusal is not a
 * capacity problem). Only AUTO_EXECUTE delegations enter the controller,
 * where over-cap work requeues instead of dropping.
 *
 * @param {object} p
 * @param {object} p.policyModule - the branch's orca_policy.js (injected;
 *   requires classifyDelegation + DECISION_CLASSES).
 * @param {object} p.controller - from createController.
 * @param {object} p.classifyArgs - args for policyModule.classifyDelegation
 *   ({ adapter, agentId, capability, namespace, constraints, workOrdersUsed,
 *   runBounds }).
 * @param {object} p.delegation - args for requestDelegation.
 */
function guardedDelegation({ policyModule, controller, classifyArgs, delegation }) {
  if (!policyModule || typeof policyModule.classifyDelegation !== 'function') {
    throw new Error('guardedDelegation: policyModule with classifyDelegation required');
  }
  const policyDecision = policyModule.classifyDelegation(classifyArgs);
  if (!policyDecision || policyDecision.decisionClass !== 'AUTO_EXECUTE') {
    return {
      action: DECISIONS.DENY,
      reason: `policy_${String(policyDecision && policyDecision.decisionClass || 'undecidable').toLowerCase()}`,
      policyDecision,
      delegationId: delegation && delegation.delegationId,
    };
  }
  const gd = requestDelegation(controller, delegation);
  return { ...gd, policyDecision };
}

module.exports = { createController, requestDelegation, recordChild, guardedDelegation, DECISIONS, REASONS };
