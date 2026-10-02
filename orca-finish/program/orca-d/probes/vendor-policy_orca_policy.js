'use strict';
/**
 * ORCA bounded-autonomy policy (Nolan directive section 7).
 *
 * Workstream (e), 2026-09-18. Worktree: /home/nolan/worktrees/orca-autonomy,
 * branch feature/orca-autonomy.
 *
 * This module implements the four explicit decision classes:
 *   AUTO_EXECUTE / REQUIRES_VERIFICATION / REQUIRES_HUMAN_APPROVAL / PROHIBITED
 *
 * The classes are DERIVED from existing PING authority, capability, and
 * governance structures, not from a hardcoded arbitrary policy table:
 *
 *  - authorizeWorkOrder in ping-runtime/external-agent/external_agent_adapter.js
 *    is consulted LIVE (fail-closed). The policy never duplicates its logic;
 *    it classifies the gate's answer.
 *  - Capability allowlists come from the adapter's AGENT_PROFILES (7 LIVE
 *    profiles, workstream (d) port, validated 26/26).
 *  - Namespace validity comes from the adapter's NAMESPACE_RE
 *    (^(core|tenant)::[a-z0-9_.-]+$, same rule as CanonicalizationService).
 *  - The FORBIDDEN list comes from the multi-runtime WorkOrder contract
 *    section 6 (explicit, fail-closed) and orca/ORCA-ROLE.md sections 2-3
 *    (what ORCA explicitly is NOT / may NOT independently own).
 *  - Outward-facing send capabilities (email.send, sms.send) route through
 *    the approval gate (contract section 6, temporal activity stub note);
 *    routing them is dispatcher policy, never worker choice.
 *  - Retry/exhaustion semantics come from MissionRuntime.failWithRetry
 *    (retry_pending + retry_at backoff; exhaustion at max_attempts -> failed)
 *    and MissionScheduler._failMission (exhaustion -> dead-letter authority,
 *    P0-5).
 *  - Run bounds come from orca/control-loop/CONTROL-LOOP-DESIGN.md section 2
 *    (max work orders, max attempts, dispatcher timeout, absolute deadline).
 *
 * Standing rule (section 7): ORCA may choose HOW to accomplish authorized
 * work; it cannot grant itself new authority. Anything the policy cannot
 * decide from existing structures escalates (REQUIRES_HUMAN_APPROVAL) and
 * NEVER defaults to AUTO_EXECUTE.
 *
 * Every classifier returns a decision record:
 *   { decisionClass, sourceRule, reason, action, at }
 * where sourceRule names the exact PING rule the class was derived from.
 * Decision records are persisted by the loop (policy-*.json) as evidence.
 */

const DECISION_CLASSES = Object.freeze({
  AUTO_EXECUTE: 'AUTO_EXECUTE',
  REQUIRES_VERIFICATION: 'REQUIRES_VERIFICATION',
  REQUIRES_HUMAN_APPROVAL: 'REQUIRES_HUMAN_APPROVAL',
  PROHIBITED: 'PROHIBITED',
});

// Derived from the WorkOrder contract section 6 ("The temporal activity stub
// notes requiresApproval for send-capabilities (email.send, sms.send)").
const APPROVAL_GATED_CAPABILITIES = Object.freeze(['email.send', 'sms.send']);

// Derived from the WorkOrder contract section 6 "Forbidden (explicit,
// fail-closed)" and orca/ORCA-ROLE.md sections 2-3. Each entry names the
// exact source rule. These are the actions ORCA may never take, period.
const PROHIBITED_ACTIONS = Object.freeze([
  { action: 'emit-canonical-events', sourceRule: 'contract§6:FORBIDDEN + orca_role§2:not-the-event-authority', reason: 'Canonical events are emitted only by PING UnifiedEventRuntime via recordVerifiedResult. ORCA must never emit, forge, or replay canonical events.' },
  { action: 'write-mission-state', sourceRule: 'contract§6:FORBIDDEN + mission_authority', reason: 'Mission truth lives in MissionRuntime. ORCA must not mutate mission state behind MissionRuntime.' },
  { action: 'touch-event-storage', sourceRule: 'contract§6:FORBIDDEN', reason: 'No worker/ORCA writes to event storage; only PING authorities persist.' },
  { action: 'self-assert-principal', sourceRule: 'contract§6:FORBIDDEN', reason: 'The issuing principal is the constant ping:external-agent-adapter, never self-asserted.' },
  { action: 'self-assert-namespace', sourceRule: 'contract§6:FORBIDDEN + canonicalization.authorizeNamespace', reason: 'Namespace is issued by PING and echoed exactly by the worker.' },
  { action: 'self-assert-capability', sourceRule: 'contract§6:FORBIDDEN', reason: 'Capability is issued by PING (profile allowlist) and echoed exactly by the worker.' },
  { action: 'create-authority', sourceRule: 'contract§6:FORBIDDEN + orca_role§2', reason: 'No new authorities, event stores, mission DBs, or worker queues may be created. One PING authority, many execution runtimes.' },
  { action: 'create-event-store', sourceRule: 'contract§6:FORBIDDEN', reason: 'Same as create-authority: no second event store.' },
  { action: 'create-mission-db', sourceRule: 'contract§6:FORBIDDEN', reason: 'Same as create-authority: mission truth stays in PING.' },
  { action: 'create-worker-queue', sourceRule: 'contract§6:FORBIDDEN', reason: 'Same as create-authority: no ORCA-owned queue.' },
  { action: 'mint-canonical-identity', sourceRule: 'orca_role§2:not-the-identity-authority', reason: 'Event identity is owned by UnifiedEventRuntime.computeEventId; work_order_id by the adapter. ORCA mints no canonical identities.' },
  { action: 'execute-work-directly', sourceRule: 'orca_role§2:not-the-execution-authority', reason: 'ORCA dispatches; workers execute. The executor seam stays empty inside ORCA.' },
  { action: 'envelope-secrets', sourceRule: 'contract§6:FORBIDDEN', reason: 'No credentials, tokens, keys, or private material may appear in input, output, or evidence.' },
  { action: 'envelope-extra-fields', sourceRule: 'contract§6:FORBIDDEN', reason: 'The WorkOrder envelope is closed (additionalProperties: false); invented fields invalidate it.' },
  { action: 'fabricate-worker-success', sourceRule: 'contract§5 + orca_role§2:not-the-evidence-authority', reason: 'Timeout or worker failure must be reported as failed, never fabricated as success.' },
  { action: 'retry-validation-failure', sourceRule: 'contract§5:verifyResultEnvelope', reason: 'Validation failure is non-retryable and can never reach canonical event authority.' },
  { action: 'mutate-mission-behind-runtime', sourceRule: 'orca_role§3 + mission_authority', reason: 'Mission lifecycle changes go through MissionRuntime methods only; ORCA recovery never bypasses it.' },
]);

function now() {
  return new Date().toISOString();
}

function decisionRecord(decisionClass, sourceRule, reason, action, extra) {
  return Object.assign(
    { decisionClass, sourceRule, reason, action: action || null, at: now() },
    extra || {}
  );
}

/**
 * Is the named action prohibited, regardless of context?
 * Returns the prohibition entry or null.
 */
function prohibitedAction(action) {
  return PROHIBITED_ACTIONS.find(p => p.action === action) || null;
}

/**
 * Classify a delegation request BEFORE any WorkOrder is issued.
 *
 * Order of derivation (each step names its source):
 *  1. Approval-gated capabilities -> REQUIRES_HUMAN_APPROVAL
 *     (contract§6 temporal-stub requiresApproval; dispatcher policy).
 *  2. Run bounds exceeded -> REQUIRES_HUMAN_APPROVAL
 *     (CONTROL-LOOP-DESIGN§2; bounds are not auto-expandable).
 *  3. The LIVE authorization gate -> AUTO_EXECUTE on grant, or
 *     REQUIRES_HUMAN_APPROVAL on denial (ORCA cannot grant itself authority;
 *     a denial is re-plan-or-human, never a bypass).
 */
function classifyDelegation({ adapter, agentId, capability, namespace, constraints, workOrdersUsed, runBounds }) {
  if (APPROVAL_GATED_CAPABILITIES.includes(capability)) {
    return decisionRecord(
      DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL,
      'contract§6:temporal-stub:requiresApproval',
      `Capability '${capability}' is outward-facing and requires human approval via the approval gate; dispatcher policy, never worker choice.`,
      'escalate',
      { agentId, capability, namespace }
    );
  }
  if (workOrdersUsed >= runBounds.maxWorkOrders) {
    return decisionRecord(
      DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL,
      'control_loop:bounds:maxWorkOrders',
      `Run work-order budget exhausted (${workOrdersUsed}/${runBounds.maxWorkOrders}); bounds are enforced by mechanism, not expandable by ORCA.`,
      'escalate',
      { agentId, capability, namespace }
    );
  }
  // The authorization gate is the authority; the policy classifies its answer.
  const auth = adapter.authorizeWorkOrder({ agentId, capability, namespace, constraints });
  if (!auth.granted) {
    return decisionRecord(
      DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL,
      'external_agent_adapter.authorizeWorkOrder:denied',
      `Authorization denied: ${auth.reason}. ORCA may not grant itself authority; re-plan or escalate to a human.`,
      'escalate',
      { agentId, capability, namespace, denialReason: auth.reason }
    );
  }
  return decisionRecord(
    DECISION_CLASSES.AUTO_EXECUTE,
    'external_agent_adapter.authorizeWorkOrder:granted',
    `Granted by the authorization gate (agent '${agentId}', capability '${capability}', namespace '${namespace}'). ORCA chose the means; PING granted the authority.`,
    'delegate',
    { agentId, capability, namespace }
  );
}

/**
 * Classify a retry decision. Failure kinds: 'worker-failed', 'timeout',
 * 'validation-failed', 'auth-denied', 'emit-rejected'.
 *
 * Derived from contract section 5 (retry increments attempt; validation
 * failure non-retryable; timeout is an honest failed report) and
 * MissionRuntime.failWithRetry (exhaustion at max_attempts -> failed).
 */
function classifyRetry({ attempt, maxAttempts, failureKind }) {
  if (failureKind === 'validation-failed') {
    return decisionRecord(
      DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL,
      'contract§5:verifyResultEnvelope:non-retryable',
      'Result verification failed; the contract makes validation failure non-retryable and it can never reach canonical event authority. Escalate.',
      'escalate',
      { failureKind, attempt, maxAttempts, retryProhibited: true }
    );
  }
  if (failureKind === 'auth-denied' || failureKind === 'emit-rejected') {
    return decisionRecord(
      DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL,
      'external_agent_adapter.authorizeWorkOrder:denied',
      `Failure kind '${failureKind}' is an authority decision, not a worker outcome; retrying the same request cannot succeed. Re-plan or escalate.`,
      'escalate',
      { failureKind, attempt, maxAttempts }
    );
  }
  if (attempt >= maxAttempts) {
    return decisionRecord(
      DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL,
      'mission_runtime.failWithRetry:exhaustion',
      `Retry budget exhausted (attempt ${attempt}/${maxAttempts}); exhaustion semantics mirror failWithRetry -> failed. Escalate to human.`,
      'escalate',
      { failureKind, attempt, maxAttempts }
    );
  }
  return decisionRecord(
    DECISION_CLASSES.AUTO_EXECUTE,
    'contract§5:retry-increments-attempt',
    `Failure kind '${failureKind}' is retryable (attempt ${attempt}/${maxAttempts}); re-issue the same taskId with attempt+1 through the same authorized path.`,
    'retry-attempt-plus-1',
    { failureKind, attempt, maxAttempts, nextAttempt: attempt + 1 }
  );
}

/**
 * Classify accepting a worker result as truth.
 * Always REQUIRES_VERIFICATION: ORCA is not the evidence authority
 * (ORCA-ROLE§2); verifyResultEnvelope + recordVerifiedResult are the gate.
 */
function classifyResultAcceptance() {
  return decisionRecord(
    DECISION_CLASSES.REQUIRES_VERIFICATION,
    'external_agent_adapter.verifyResultEnvelope + orca_role§2:not-the-evidence-authority',
    'No worker output becomes loop truth until verifyResultEnvelope validates it and recordVerifiedResult records it as a canonical event.',
    'verify-then-record',
    {}
  );
}

/**
 * Classify a follow-up proposal.
 * Follow-ups derived from VERIFIED evidence -> REQUIRES_VERIFICATION
 * (the follow-up delegation is re-classified when issued).
 * Follow-ups derived from anything else -> REQUIRES_HUMAN_APPROVAL.
 */
function classifyFollowUp({ derivedFromVerified, followUpKind }) {
  if (!derivedFromVerified) {
    return decisionRecord(
      DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL,
      'section7:undecidable→escalate',
      'Follow-up proposed from unverified output; the policy cannot ground it in existing verified structures. Escalate.',
      'escalate',
      { followUpKind }
    );
  }
  return decisionRecord(
    DECISION_CLASSES.REQUIRES_VERIFICATION,
    'orca_role§1:propose-follow-up + verifyResultEnvelope',
    `Follow-up '${followUpKind}' is derived from verified evidence; each resulting delegation is classified again before issue.`,
    'plan-follow-up',
    { followUpKind }
  );
}

/**
 * Escalation constructor: the fail-closed default for anything the policy
 * cannot decide from existing structures (section 7 standing rule).
 */
function escalateUndecidable(what, context) {
  return decisionRecord(
    DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL,
    'section7:undecidable→escalate (fail-closed)',
    `The policy cannot decide '${what}' from existing PING authority/capability/governance structures; it escalates rather than defaulting to AUTO_EXECUTE.`,
    'escalate',
    { what, context: context || null }
  );
}

module.exports = {
  DECISION_CLASSES,
  APPROVAL_GATED_CAPABILITIES,
  PROHIBITED_ACTIONS,
  prohibitedAction,
  classifyDelegation,
  classifyRetry,
  classifyResultAcceptance,
  classifyFollowUp,
  escalateUndecidable,
  decisionRecord,
};
