'use strict';
/**
 * ORCA recovery decisions (Nolan directive section 9).
 *
 * Workstream (e), 2026-09-18.
 *
 * Uses EXISTING mission leases, retry, retry exhaustion, dead-letter, and
 * recovery semantics. ORCA's recovery decisions never mutate mission state
 * behind MissionRuntime: mission-level recovery goes through MissionRuntime
 * methods (failWithRetry, reapExpiredLeases, renewLease); delegation-level
 * recovery goes through the WorkOrder authorization gate. Where PING owns
 * the mechanism, ORCA's decision is to invoke it, not reimplement it.
 *
 * Each entry: the failure signal, ORCA's decision, the existing mechanism
 * it runs through, the decision class (from orca_policy.js), and the source
 * rule it derives from.
 */

const RECOVERY_TABLE = Object.freeze([
  {
    failureSignal: 'worker-reported failed (retryable)',
    orcaDecision: 'retry through existing mechanism',
    mechanism: 'Re-issue the same taskId with attempt+1 through authorizeWorkOrder/issueWorkOrder (idempotent work_order_id). Bounded by MAX_ATTEMPTS.',
    decisionClass: 'AUTO_EXECUTE',
    sourceRule: 'contract§5:retry-increments-attempt',
  },
  {
    failureSignal: 'dispatcher timeout (no worker output)',
    orcaDecision: 'retry through existing mechanism',
    mechanism: 'Honest failed envelope (status failed, non-empty error; no success fabricated) via timeoutEnvelope; then the same attempt+1 path as worker-reported failure.',
    decisionClass: 'AUTO_EXECUTE',
    sourceRule: 'contract§5:timeout-is-honest-failure',
  },
  {
    failureSignal: 'result verification failed (envelope invalid)',
    orcaDecision: 'escalate to human',
    mechanism: 'No retry (contract: non-retryable, never reaches canonical authority). 99-escalate.json with the verification reason; exit 3.',
    decisionClass: 'REQUIRES_HUMAN_APPROVAL',
    sourceRule: 'contract§5:verifyResultEnvelope:non-retryable',
  },
  {
    failureSignal: 'authorization denied',
    orcaDecision: 'escalate to human (or re-plan)',
    mechanism: 'Denial is an authority decision, not a worker outcome. ORCA may not grant itself authority; re-plan the task within authorized capabilities or escalate.',
    decisionClass: 'REQUIRES_HUMAN_APPROVAL',
    sourceRule: 'external_agent_adapter.authorizeWorkOrder:denied',
  },
  {
    failureSignal: 'retry budget exhausted (delegation unit)',
    orcaDecision: 'escalate to human',
    mechanism: 'Mirrors MissionRuntime.failWithRetry exhaustion (retries >= max_attempts -> failed). Unit transitions RUNNING -> FAILED; 99-escalate.json; exit 3. Dead-letter routing for PING missions stays with MissionScheduler._failMission (P0-5); ORCA does not duplicate it.',
    decisionClass: 'REQUIRES_HUMAN_APPROVAL',
    sourceRule: 'mission_runtime.failWithRetry:exhaustion',
  },
  {
    failureSignal: 'worker unavailable (profile blockedExternal)',
    orcaDecision: 'delegate to another compatible worker',
    mechanism: 'Select a different agentId whose AGENT_PROFILES entry is LIVE and whose allowedCapabilities include the required capability; re-classify via orca_policy.classifyDelegation and re-issue through the same gate. Never bypass blockedExternal.',
    decisionClass: 'REQUIRES_VERIFICATION',
    sourceRule: 'external_agent_adapter:AGENT_PROFILES:blockedExternal',
  },
  {
    failureSignal: 'task too large / capability mismatch for one worker',
    orcaDecision: 'split the task',
    mechanism: 'Decompose into subtasks, each with its own capability requirement; each subtask is classified and authorized independently through the gate. Preserves causation lineage (parent work_order_id in the plan artifact).',
    decisionClass: 'REQUIRES_VERIFICATION',
    sourceRule: 'orca_role§1:decompose + external_agent_adapter.authorizeWorkOrder',
  },
  {
    failureSignal: 'missing information (input cannot be assembled)',
    orcaDecision: 'request missing information',
    mechanism: 'Do not invent the input. Escalate with an information request: 99-escalate.json names the missing fields and the source that could supply them. Treated as BLOCKED pending human input, then re-planned.',
    decisionClass: 'REQUIRES_HUMAN_APPROVAL',
    sourceRule: 'section7:undecidable→escalate + orca_role:known-vs-unknown',
  },
  {
    failureSignal: 'mission lease expired (PING mission, not delegation unit)',
    orcaDecision: 'retry through existing mechanism',
    mechanism: 'MissionRuntime.reapExpiredLeases resets orphaned assigned/running missions to created and emits MISSION_LEASE_EXPIRED. ORCA observes and re-plans; it does not touch the rows itself.',
    decisionClass: 'AUTO_EXECUTE',
    sourceRule: 'mission_runtime:reapExpiredLeases (P0-6)',
  },
  {
    failureSignal: 'canonical event emit rejected (recordVerifiedResult)',
    orcaDecision: 'escalate to human',
    mechanism: 'The constitutional writer refused; ORCA must not retry emission itself (not the event authority). Escalate with the rejection detail.',
    decisionClass: 'REQUIRES_HUMAN_APPROVAL',
    sourceRule: 'orca_role§2:not-the-event-authority',
  },
  {
    failureSignal: 'undecidable from existing structures',
    orcaDecision: 'escalate to human',
    mechanism: 'Fail closed. Never default to AUTO_EXECUTE.',
    decisionClass: 'REQUIRES_HUMAN_APPROVAL',
    sourceRule: 'section7:undecidable→escalate (fail-closed)',
  },
  {
    failureSignal: 'no remaining work verified',
    orcaDecision: 'stop (close the run)',
    mechanism: 'ASSESS finds no non-terminal work and no structural remaining work; write 99-close.json; exit 0. Not a failure; the completion contract is satisfied.',
    decisionClass: 'AUTO_EXECUTE',
    sourceRule: 'control_loop:CLOSE + status_model:VERIFIED→CLOSED',
  },
]);

function decideRecovery(failureSignal) {
  const entry = RECOVERY_TABLE.find(r => r.failureSignal === failureSignal);
  if (!entry) {
    return {
      failureSignal,
      orcaDecision: 'escalate to human',
      mechanism: 'Unknown failure signal; fail closed.',
      decisionClass: 'REQUIRES_HUMAN_APPROVAL',
      sourceRule: 'section7:undecidable→escalate (fail-closed)',
    };
  }
  return Object.assign({}, entry);
}

module.exports = { RECOVERY_TABLE, decideRecovery };
