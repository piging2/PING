/**
 * Run-State Authority — TenantOS execution substrate (swarm-11).
 *
 * SINGLE ownership point for execution/run-state vocabulary and projection.
 * (Memory 2026-09-13: "Execution/run state" is one of the 12 areas requiring
 * provable single ownership.)
 *
 * This module is a MAP, not a runtime: it does not re-implement MissionRuntime,
 * WorkerRuntime, or the event authority. It projects existing durable rows onto
 * the required canonical vocabulary and hosts the pure reconciliation classifier.
 *
 * Required states: PENDING / RUNNING / SUCCEEDED / FAILED / BLOCKED /
 *                  CANCELLED / UNKNOWN_EXECUTION / NEEDS_RECONCILIATION
 *
 * Hard rules (enforced by kb-01-projection-unit.js, 21/21):
 *   R-A: "worker disappeared" is NOT FAILED.
 *   R-B: "timeout" is NOT proof the effect did not happen — never re-execute
 *        a proven effect.
 *   R-C: UNKNOWN_EXECUTION must never silently become PENDING.
 */

export const CanonicalRunState = Object.freeze({
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  CANCELLED: 'CANCELLED',
  UNKNOWN_EXECUTION: 'UNKNOWN_EXECUTION',
  NEEDS_RECONCILIATION: 'NEEDS_RECONCILIATION',
} as const);
export type CanonicalRunState = (typeof CanonicalRunState)[keyof typeof CanonicalRunState];

/** Subset of ping_missions columns the projection reads. */
export interface MissionRow {
  mission_id: string;
  status: string;
  lease_until: string | null;
  assigned_to?: string | null;
  retries?: number;
}

/** Subset of mission_executions columns the projection reads. */
export interface ExecutionRow {
  execution_id: string;
  mission_id: string;
  execution_status: string;
}

/**
 * Project a ping_missions row onto the canonical vocabulary.
 *
 * Existing states (mission_runtime.js): created / assigned / running /
 * completed / failed / retry_pending.
 *
 * The R1 defect this fixes: the lease reaper folds expired-lease
 * assigned/running rows back to `created` (PENDING), losing the distinction
 * between "never started" and "may have executed". Here they project to
 * UNKNOWN_EXECUTION — never PENDING (R-C), never FAILED (R-A).
 *
 * Fail-closed: unmapped statuses throw instead of defaulting.
 */
export function projectMission(row: MissionRow, now: number = Date.now()): CanonicalRunState {
  switch (row.status) {
    case 'created':
    case 'retry_pending':
      return CanonicalRunState.PENDING;
    case 'completed':
      return CanonicalRunState.SUCCEEDED;
    case 'failed':
      return CanonicalRunState.FAILED;
    case 'assigned':
    case 'running': {
      const leaseMs = row.lease_until == null ? NaN : new Date(row.lease_until).getTime();
      const leaseExpired = !Number.isNaN(leaseMs) && leaseMs < now;
      // No lease info (legacy rows): fail toward in-flight (RUNNING) — the
      // live scheduler may still own it. Only a positively-expired lease with
      // no renewal is UNKNOWN_EXECUTION.
      return leaseExpired ? CanonicalRunState.UNKNOWN_EXECUTION : CanonicalRunState.RUNNING;
    }
    default:
      throw new Error(`projectMission: unmapped status '${row.status}' (fail-closed)`);
  }
}

/**
 * Project a phase-15 mission_executions row. A null row (attempt began but the
 * process died before the end-of-loop INSERT — mission_execution_authority.js)
 * is UNKNOWN_EXECUTION, not absent.
 */
export function projectExecution(row: ExecutionRow | null): CanonicalRunState {
  if (row == null) return CanonicalRunState.UNKNOWN_EXECUTION;
  switch (row.execution_status) {
    case 'pending':
      return CanonicalRunState.PENDING;
    case 'completed':
      return CanonicalRunState.SUCCEEDED;
    case 'failed':
      return CanonicalRunState.FAILED;
    default:
      throw new Error(`projectExecution: unmapped status '${row.execution_status}' (fail-closed)`);
  }
}

/** Durable evidence the classifier may consult (all read from existing stores). */
export interface ReconciliationEvidence {
  /** An idempotency-keyed effect record exists (effect journal / connector log). */
  effectProven: boolean;
  /** Positive proof the effect never happened (died before the effect step). */
  effectAbsent: boolean;
  /** Any durable trace that an attempt began (claim event, execution row, logs). */
  attemptStarted: boolean;
}

export const ReconcileDirective = Object.freeze({
  MARK_SUCCEEDED_FROM_EVIDENCE: 'MARK_SUCCEEDED_FROM_EVIDENCE',
  REQUEUE_AS_PENDING: 'REQUEUE_AS_PENDING',
  RETRY_ATTEMPT_WITH_LINEAGE: 'RETRY_ATTEMPT_WITH_LINEAGE',
  HOLD_NEEDS_RECONCILIATION: 'HOLD_NEEDS_RECONCILIATION',
} as const);
export type ReconcileDirective = (typeof ReconcileDirective)[keyof typeof ReconcileDirective];

export interface Classification {
  directive: ReconcileDirective;
  /** False means the replacement MUST NOT execute the work again. */
  reexecute: boolean;
}

/**
 * Classify a run in UNKNOWN_EXECUTION. Pure and total over the evidence cube:
 * same evidence always yields the same directive (kill-battery KB-05 relies on
 * this for crash-safe re-runs of the reconciliation pass).
 *
 * Contradictory evidence (effectProven && effectAbsent) is a hold signal —
 * callers should normalize it to HOLD before calling, or treat the hold branch.
 */
export function classifyUnknownExecution(evidence: ReconciliationEvidence): Classification {
  if (evidence.effectProven && !evidence.effectAbsent) {
    // R-B: the effect happened. Re-execution is forbidden. Record success
    // from evidence; do not repeat the work.
    return { directive: ReconcileDirective.MARK_SUCCEEDED_FROM_EVIDENCE, reexecute: false };
  }
  if (evidence.effectAbsent && !evidence.attemptStarted) {
    // Positive proof nothing ran: safe to re-queue as new work.
    return { directive: ReconcileDirective.REQUEUE_AS_PENDING, reexecute: true };
  }
  if (evidence.effectAbsent && evidence.attemptStarted) {
    // Attempt began but provably produced no effect: safe to retry the
    // attempt, preserving lineage so the retry is auditable.
    return { directive: ReconcileDirective.RETRY_ATTEMPT_WITH_LINEAGE, reexecute: true };
  }
  // Indeterminate (including contradictory evidence): hold. Never silently
  // re-queue (R-C). A human or compensating action resolves it.
  return { directive: ReconcileDirective.HOLD_NEEDS_RECONCILIATION, reexecute: false };
}

/**
 * Per-attempt durable record (addresses map gap G6: `retries` is a bare
 * counter; attempt history is not durable). New table `tenanos_run_attempts`
 * — additive, no change to ping_missions DDL. DDL in
 * src/tenanos/run/schema.sql (this diff).
 */
export interface RunAttempt {
  attempt_id: string;
  mission_id: string;
  attempt_number: number;
  worker_name: string | null;
  started_at: string;
  ended_at: string | null;
  outcome: 'started' | 'succeeded' | 'failed' | 'unknown';
  evidence_refs: string[];
}

/**
 * Validate that a proposed run-state transition is legal. The existing
 * MissionRuntime guards its own SQL transitions; this is the canonical
 * vocabulary-level guard for NEW states (BLOCKED/CANCELLED/UNKNOWN_EXECUTION/
 * NEEDS_RECONCILIATION) so future writers cannot invent ad-hoc edges.
 */
const LEGAL_EDGES: Readonly<Record<string, ReadonlySet<string>>> = {
  [CanonicalRunState.PENDING]: new Set([
    CanonicalRunState.RUNNING,
    CanonicalRunState.CANCELLED,
    CanonicalRunState.BLOCKED,
  ]),
  [CanonicalRunState.RUNNING]: new Set([
    CanonicalRunState.SUCCEEDED,
    CanonicalRunState.FAILED,
    CanonicalRunState.BLOCKED,
    CanonicalRunState.CANCELLED,
    CanonicalRunState.UNKNOWN_EXECUTION,
  ]),
  [CanonicalRunState.UNKNOWN_EXECUTION]: new Set([CanonicalRunState.NEEDS_RECONCILIATION]),
  [CanonicalRunState.NEEDS_RECONCILIATION]: new Set([
    CanonicalRunState.SUCCEEDED, // MARK_SUCCEEDED_FROM_EVIDENCE
    CanonicalRunState.PENDING, // REQUEUE_AS_PENDING
    CanonicalRunState.RUNNING, // RETRY_ATTEMPT_WITH_LINEAGE
    CanonicalRunState.BLOCKED, // HOLD escalated
  ]),
  [CanonicalRunState.BLOCKED]: new Set([CanonicalRunState.PENDING, CanonicalRunState.CANCELLED]),
  [CanonicalRunState.SUCCEEDED]: new Set(),
  [CanonicalRunState.FAILED]: new Set(),
  [CanonicalRunState.CANCELLED]: new Set(),
};

export function isLegalTransition(from: CanonicalRunState, to: CanonicalRunState): boolean {
  return LEGAL_EDGES[from]?.has(to) ?? false;
}