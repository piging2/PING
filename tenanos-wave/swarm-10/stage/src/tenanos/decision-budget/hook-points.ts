/**
 * Hook points — Swarm 10 (Human Decision Budget).
 *
 * Maps every existing escalation site from ESCALATION-INVENTORY.md to its
 * expected class and the hook contract. When the converged loop harvests a
 * piece, it places a `classify()` call (taxonomy.ts) at the hook site: the
 * hook classifies and records; all action stays in the existing loop.
 *
 * Paths below are the substrate source checkout (/home/nolan/ping @ cc6856c3b);
 * the converged call sites will live under src/tenanos/**. The siteId is the
 * stable key — it survives the move.
 */

import { EscalationClass } from './taxonomy';

export interface HookSite {
  /** Stable id, e.g. 'E-07'. */
  siteId: string;
  /** Where it exists today: '<path>:<line>'. */
  currentLocation: string;
  /** One-line description of the pause/defer/drop/fail/ask. */
  behavior: string;
  /** Expected class under the taxonomy (first-pass; classify() decides live). */
  expectedClass: EscalationClass;
  /** What the hook must capture into the EscalationAttempt. */
  capture: string;
}

/** The complete inventory, machine-readable. */
export const HOOK_SITES: ReadonlyArray<HookSite> = [
  { siteId: 'E-01', currentLocation: 'gateway/approval_authority.js:86', behavior: 'requestApproval evaluates patch/replay/test/witness; policy hardcoded automatic', expectedClass: EscalationClass.DERIVABLE_FROM_SOURCE, capture: 'approval_conditions incl. blocked_by; policy_name' },
  { siteId: 'E-02', currentLocation: 'gateway/approval_authority.js:201', behavior: "status 'pending_manual' exists but is unreachable", expectedClass: EscalationClass.POLICY_CONFLICT, capture: 'policy_type that produced the status; contradiction text' },
  { siteId: 'E-03', currentLocation: 'gateway/approval_authority.js:205', behavior: "status 'pending_constitutional' exists but is unreachable", expectedClass: EscalationClass.POLICY_CONFLICT, capture: 'policy_type that produced the status; contradiction text' },
  { siteId: 'E-04', currentLocation: 'gateway/approval_authority.js:217', behavior: 'approveManually(): human resolution sink, zero callers', expectedClass: EscalationClass.AUTHORIZATION_REQUIRED, capture: 'approval_id; pending duration; question for the human' },
  { siteId: 'E-05', currentLocation: 'gateway/approval_authority.js:273', behavior: 'getPendingApprovals(): zero callers; approvals table is write-only', expectedClass: EscalationClass.DERIVABLE_FROM_RUNTIME, capture: 'pending rows with age; poll cadence' },
  { siteId: 'E-06', currentLocation: 'gateway/mission_execution_graph.js:456', behavior: '_executeApprove runs requestApproval between replay and commit', expectedClass: EscalationClass.DERIVABLE_FROM_SOURCE, capture: 'patch_validation, test_results, replay_result refs' },
  { siteId: 'E-07', currentLocation: 'gateway/mission_execution_graph.js:480', behavior: "commit gate: status!=='approved' -> {committed:false}; no retry/event/escalation", expectedClass: EscalationClass.DERIVABLE_FROM_SOURCE, capture: 'approval_conditions.blocked_by; prior fix attempts' },
  { siteId: 'E-08', currentLocation: 'gateway/node_registry.js:312', behavior: 'ApproveNodeExecutor; missing dep returns string approval_data -> fail-closed downstream', expectedClass: EscalationClass.DERIVABLE_FROM_SOURCE, capture: 'which dependency was missing' },
  { siteId: 'E-09', currentLocation: 'gateway/node_registry.js:342', behavior: 'commit gate, identical fail-closed', expectedClass: EscalationClass.DERIVABLE_FROM_SOURCE, capture: 'approval_conditions.blocked_by' },
  { siteId: 'E-10', currentLocation: 'ping-runtime/orchestration/merge_gate.js:77', behavior: '7 static gates, blocking/warning; deterministic', expectedClass: EscalationClass.DERIVABLE_FROM_SOURCE, capture: 'failed gates with hint fields' },
  { siteId: 'E-11', currentLocation: 'ping-runtime/orchestration/merge_queue.js:96', behavior: 'runMergeGate: gate failure -> constitutional_review holding pen, no owner', expectedClass: EscalationClass.DERIVABLE_FROM_RUNTIME, capture: 'gate_results; queue age' },
  { siteId: 'E-12', currentLocation: 'ping-runtime/orchestration/merge_queue.js:135', behavior: 'completeReview(): reviewer is a free-form string', expectedClass: EscalationClass.AUTHORIZATION_REQUIRED, capture: 'reviewer identity binding; decision; notes' },
  { siteId: 'E-13', currentLocation: 'ping-runtime/orchestration/merge_queue.js:167', behavior: 'merge() from constitutional_review overrides a failed gate', expectedClass: EscalationClass.DESTRUCTIVE, capture: 'gate_results at merge time; caller identity' },
  { siteId: 'E-14', currentLocation: 'ping-runtime/orchestration/execution/engine.js:160', behavior: "'No workers available - deferring'; mission silently dropped, never rescheduled", expectedClass: EscalationClass.DERIVABLE_FROM_RUNTIME, capture: 'requiredCapabilities; worker-registered subscription state' },
  { siteId: 'E-15', currentLocation: 'ping-runtime/orchestration/execution/engine.js:289', behavior: '_resolveMission: consensus rejected -> status failed', expectedClass: EscalationClass.DERIVABLE_FROM_HISTORY, capture: 'decision.reason; repeatKey (mission_type+target)' },
  { siteId: 'E-16', currentLocation: 'ping-runtime/orchestration/execution/engine.js:327,365,385,403', behavior: 'consensus/merge/mission events emitted with zero subscribers', expectedClass: EscalationClass.DERIVABLE_FROM_RUNTIME, capture: 'event ids; subscriber count (must be >0 post-convergence)' },
  { siteId: 'E-17', currentLocation: 'ping-runtime/orchestration/execution/engine.js:startAutonomousLoop', behavior: 'minPriority filter silently skips low-priority missions', expectedClass: EscalationClass.PRODUCT_INTENT, capture: 'skipped mission ids + priorities; threshold source' },
  { siteId: 'E-18', currentLocation: 'ping-runtime/orchestration/mission_runtime.js:202', behavior: 'failWithRetry: retry_pending + backoff; exhaustion -> failed', expectedClass: EscalationClass.DERIVABLE_FROM_HISTORY, capture: 'retries; failure_reason; prior resolutions for repeatKey' },
  { siteId: 'E-20', currentLocation: 'ping-runtime/orchestration/mission_scheduler.js:289', behavior: '_failMission: exhaustion -> recordDeadLetter when DLQ wired', expectedClass: EscalationClass.DERIVABLE_FROM_HISTORY, capture: 'retry_count; dead_letter_id' },
  { siteId: 'E-21', currentLocation: 'ping-runtime/orchestration/mission_scheduler.js:266', behavior: "'no worker matched event_type' -> mission failed", expectedClass: EscalationClass.DERIVABLE_FROM_SOURCE, capture: 'event_type; capability registry lookup result' },
  { siteId: 'E-22', currentLocation: 'gateway/dead_letter_authority.js:112', behavior: 'recordDeadLetter: DLQ write with replayable flag', expectedClass: EscalationClass.DERIVABLE_FROM_HISTORY, capture: 'job_type; failure_reason; replayable' },
  { siteId: 'E-23', currentLocation: 'gateway/dead_letter_authority.js:262', behavior: 'replayDeadLetter requires replayFn; no production caller', expectedClass: EscalationClass.SAFE_EXPERIMENT_AVAILABLE, capture: 'sandbox replay evidence; replayFn provenance' },
  { siteId: 'E-24', currentLocation: 'gateway/routes/mission_control.js:625,653,663', behavior: 'GET /dead-letters read-only; no replay/requeue endpoint', expectedClass: EscalationClass.AUTHORIZATION_REQUIRED, capture: 'human action requested; dead_letter_id' },
  { siteId: 'E-25', currentLocation: 'ping-runtime/knowledge/knowledge_promoter.js:36', behavior: 'SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED -> knowledge (1.0)', expectedClass: EscalationClass.PRODUCT_INTENT, capture: 'sourceEventId; approver signal provenance' },
  { siteId: 'E-26', currentLocation: '(gap) no production emitter', behavior: 'zero production emitters of approval events; capture unwired', expectedClass: EscalationClass.AUTHORIZATION_REQUIRED, capture: 'candidate node id; requested approver' },
  { siteId: 'E-27', currentLocation: 'src/lib/environment.ts:63', behavior: "'Environment must be explicitly configured. Cannot proceed with unsafe default.'", expectedClass: EscalationClass.CREDENTIAL_REQUIRED, capture: 'missing variable/scope name (never the value)' },
  { siteId: 'E-28', currentLocation: 'src/lib/materialization-state-machine.ts:103', behavior: 'TRANSITION_BLOCKED logged only', expectedClass: EscalationClass.DERIVABLE_FROM_SOURCE, capture: 'from/to states; allowed transitions' },
];

/** Lookup by site id. */
export function hookSite(siteId: string): HookSite | undefined {
  return HOOK_SITES.find((h) => h.siteId === siteId);
}
