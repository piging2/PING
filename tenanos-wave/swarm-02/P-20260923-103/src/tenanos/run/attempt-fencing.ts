/**
 * Attempt Fencing — TenantOS execution substrate (swarm-02, P-20260923-103).
 *
 * SINGLE ownership point for durable attempt identity mechanics:
 * per-attempt fencing tokens, the attempt status machine, checkpoint
 * monotonicity, and zombie-attempt write discipline.
 *
 * Seam with swarm-11 (P-20260923-095, approved):
 *   - 095 owns the canonical run-state VOCABULARY (CanonicalRunState),
 *     the projection (projectMission/projectExecution), the transition
 *     guard (isLegalTransition), the reconciliation CLASSIFIER
 *     (classifyUnknownExecution), and the base table
 *     tenanos_run_attempts (attempt_id, mission_id, attempt_number,
 *     outcome, ...).
 *   - THIS module owns the attempt lifecycle MECHANICS one level down:
 *     finer-grained attempt status, fencing tokens that make a stale
 *     attempt's writes match zero rows, per-attempt leases, and
 *     checkpoints. projectAttemptOutcome() maps this module's status
 *     onto 095's outcome vocabulary — never the reverse.
 *
 * Does NOT re-implement MissionRuntime, WorkerRuntime, or the event
 * authority. No dispatch, no timers, no second orchestrator: the SQL
 * in the writer's data-access layer is the enforcer; the tables in
 * this module are the single decider.
 *
 * Hard rules (from the SWARM-02 acceptance battery, tests 13/14):
 *   A-1: A zombie attempt's write MUST match zero rows. Token rotation
 *        on supersede/timeout is the mechanism; rowCount is the proof.
 *   A-2: Worker disappearance is UNKNOWN_EXECUTION, never FAILED.
 *        A timed_out or stale attempt is reconciled, not failed.
 *   A-3: A completed attempt row without a MISSION_COMPLETED event
 *        heals to completed (HEAL_COMPLETED) — it is never re-executed.
 *   A-4: Checkpoints are monotonic per attempt. A checkpoint write with
 *        a stale token or a non-sequential seq is rejected, never
 *        silently applied.
 */

import {
  classifyUnknownExecution,
  ReconcileDirective,
} from './run-state-authority';

/** Finer-grained attempt lifecycle. 095's `outcome` is a projection of this. */
export const AttemptStatus = Object.freeze({
  CREATED: 'created',
  CLAIMED: 'claimed',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMED_OUT: 'timed_out',
  STALE: 'stale',
} as const);
export type AttemptStatus =
  (typeof AttemptStatus)[keyof typeof AttemptStatus];

/**
 * Attempt transition table. Absent pair = illegal transition (fail closed).
 * Mirrors the ORCA verdict's required shape: an explicit table that the
 * data-access layer MUST consult before issuing the conditional UPDATE,
 * so the table decides and SQL enforces.
 */
const ATTEMPT_TRANSITIONS: Readonly<
  Record<AttemptStatus, Readonly<Record<string, AttemptStatus>>>
> = {
  [AttemptStatus.CREATED]: {
    claim: AttemptStatus.CLAIMED,
    expire: AttemptStatus.STALE,
  },
  [AttemptStatus.CLAIMED]: {
    start: AttemptStatus.RUNNING,
    expire: AttemptStatus.STALE,
    supersede: AttemptStatus.STALE,
  },
  [AttemptStatus.RUNNING]: {
    complete: AttemptStatus.COMPLETED,
    fail: AttemptStatus.FAILED,
    timeout: AttemptStatus.TIMED_OUT,
    expire: AttemptStatus.STALE,
    supersede: AttemptStatus.STALE,
  },
  // Terminal: no legal events.
  [AttemptStatus.COMPLETED]: {},
  [AttemptStatus.FAILED]: {},
  [AttemptStatus.TIMED_OUT]: {},
  [AttemptStatus.STALE]: {},
};

export class IllegalAttemptTransitionError extends Error {
  constructor(from: string, event: string) {
    super(`attemptTransition: illegal ${from} --${event}--> ?`);
    this.name = 'IllegalAttemptTransitionError';
  }
}

/** Pure decider: returns the target status, or throws on an illegal edge. */
export function attemptTransition(
  from: AttemptStatus,
  event: string,
): AttemptStatus {
  const row = ATTEMPT_TRANSITIONS[from];
  if (!row) {
    throw new IllegalAttemptTransitionError(String(from), event);
  }
  const to = row[event];
  if (!to) {
    throw new IllegalAttemptTransitionError(from, event);
  }
  return to;
}

/** 095's outcome vocabulary, projected from the finer-grained status. */
export type AttemptOutcome = 'started' | 'succeeded' | 'failed' | 'unknown';

export function projectAttemptOutcome(status: AttemptStatus): AttemptOutcome {
  switch (status) {
    case AttemptStatus.CREATED:
    case AttemptStatus.CLAIMED:
    case AttemptStatus.RUNNING:
      return 'started';
    case AttemptStatus.COMPLETED:
      return 'succeeded';
    case AttemptStatus.FAILED:
      return 'failed';
    case AttemptStatus.TIMED_OUT:
    case AttemptStatus.STALE:
      return 'unknown';
  }
}

/**
 * Fenced-write contract. The writer's UPDATE must carry the fencing token
 * in the WHERE clause:
 *
 *   UPDATE tenanos_run_attempts
 *   SET status = $3, ...
 *   WHERE attempt_id = $1 AND fencing_token = $2 AND status = ANY($4)
 *
 * A zombie attempt (token rotated by supersede/timeout, or status already
 * moved on) matches ZERO rows. The caller MUST branch on rowCount —
 * see interpretFenceResult — and must never treat zero rows as success.
 */
export interface FenceCondition {
  /** Parameterized WHERE fragment (Postgres $1..$n). */
  text: string;
  /** [attempt_id, fencing_token, from_statuses]. */
  values: [string, string, AttemptStatus[]];
}

export function buildFenceCondition(
  attemptId: string,
  fencingToken: string,
  fromStatuses: AttemptStatus[],
): FenceCondition {
  if (!attemptId) throw new Error('buildFenceCondition: attemptId required');
  if (!fencingToken) {
    throw new Error('buildFenceCondition: fencingToken required');
  }
  if (fromStatuses.length === 0) {
    throw new Error('buildFenceCondition: fromStatuses must be non-empty');
  }
  return {
    text: 'attempt_id = $1 AND fencing_token = $2 AND status = ANY($3)',
    values: [attemptId, fencingToken, [...fromStatuses]],
  };
}

export type FenceVerdict = 'applied' | 'fenced';

/**
 * Interpret the UPDATE rowCount. 'fenced' means the attempt is a zombie:
 * its token was rotated or its status moved on. Log it, emit an
 * observation, NEVER retry the write and NEVER treat it as success.
 */
export function interpretFenceResult(rowCount: number): FenceVerdict {
  if (rowCount === 1) return 'applied';
  if (rowCount === 0) return 'fenced';
  throw new Error(
    `interpretFenceResult: impossible rowCount ${rowCount} — fencing ` +
      'predicate must match at most one row (attempt_id is the PK)',
  );
}

/** A checkpoint inside a running attempt (resume point, not completion). */
export interface AttemptCheckpoint {
  attempt_id: string;
  seq: number;
  kind: string;
  payload: Record<string, unknown>;
}

export class NonMonotonicCheckpointError extends Error {
  constructor(attemptId: string, prevSeq: number, nextSeq: number) {
    super(
      `checkpoint for ${attemptId} must be seq ${prevSeq + 1}, got ${nextSeq}`,
    );
    this.name = 'NonMonotonicCheckpointError';
  }
}

/**
 * Pure checkpoint gate: the next checkpoint for an attempt must be exactly
 * prevSeq + 1. The writer applies this BEFORE the fenced INSERT, so a
 * replayed or reordered checkpoint can never silently rewrite history.
 */
export function validateCheckpoint(
  attemptId: string,
  prevSeq: number,
  next: AttemptCheckpoint,
): void {
  if (next.attempt_id !== attemptId) {
    throw new Error(
      `validateCheckpoint: checkpoint attempt ${next.attempt_id} != ${attemptId}`,
    );
  }
  if (next.seq !== prevSeq + 1) {
    throw new NonMonotonicCheckpointError(attemptId, prevSeq, next.seq);
  }
}

export class AmbiguousAttemptRefError extends Error {
  constructor(ref: string, count: number) {
    super(`attempt ref '${ref}' matches ${count} attempts`);
    this.name = 'AmbiguousAttemptRefError';
  }
}

export class UnknownAttemptRefError extends Error {
  constructor(ref: string) {
    super(`attempt ref '${ref}' matches no attempt`);
    this.name = 'UnknownAttemptRefError';
  }
}

/**
 * Opaque short-ref resolution (acceptance criterion O-9). attempt_id values
 * are never sequential or enumerable; operators get the first 8 chars.
 * Exact match wins; a short ref must resolve to exactly one attempt.
 */
export function resolveAttemptRef(
  ref: string,
  candidateIds: string[],
): string {
  const exact = candidateIds.find((id) => id === ref);
  if (exact) return exact;
  const prefixed = candidateIds.filter((id) => id.startsWith(ref));
  if (prefixed.length === 1) return prefixed[0];
  if (prefixed.length > 1) throw new AmbiguousAttemptRefError(ref, prefixed.length);
  throw new UnknownAttemptRefError(ref);
}

/** Minimal attempt shape the reconciler adapter reads. */
export interface ReconcilableAttempt {
  attempt_id: string;
  mission_id: string;
  status: AttemptStatus;
}

/** Effect evidence the reconciler adapter reads. */
export interface AttemptEffectEvidence {
  /** The effect is proven (ledger row, witness, idempotent receipt). */
  effectProven: boolean;
  /** The effect is proven ABSENT (checked the sink, nothing there). */
  effectAbsent: boolean;
}

export interface AttemptReconcileResult {
  directive: ReconcileDirective;
  reexecute: boolean;
  reason: string;
}

/**
 * Adapter: attempt lifecycle state -> 095's reconciliation classifier.
 * Terminal attempts (completed/failed) need no reconciliation — a
 * completed attempt WITHOUT a MISSION_COMPLETED event heals to
 * completed (A-3) via MARK_SUCCEEDED_FROM_EVIDENCE, never re-execution.
 * Non-terminal attempts whose worker may have disappeared go through
 * 095's classifyUnknownExecution (A-2): disappearance is UNKNOWN,
 * never FAILED.
 */
export function reconcileAttempt(
  attempt: ReconcilableAttempt,
  evidence: AttemptEffectEvidence,
): AttemptReconcileResult | null {
  if (attempt.status === AttemptStatus.COMPLETED) {
    // A-3: the attempt did the work. Even if the completion event is
    // missing, the truthful directive is to heal the record, never to
    // re-execute. Effect evidence is consulted but cannot demote this.
    return {
      directive: ReconcileDirective.MARK_SUCCEEDED_FROM_EVIDENCE,
      reexecute: false,
      reason: `attempt ${attempt.attempt_id} is completed; heal the record, never re-execute`,
    };
  }
  if (attempt.status === AttemptStatus.FAILED) {
    return null; // terminal failure stands; nothing to reconcile
  }
  // created/claimed/running/timed_out/stale: the worker may have
  // disappeared mid-attempt. Delegate to the canonical classifier.
  const c = classifyUnknownExecution({
    effectProven: evidence.effectProven,
    effectAbsent: evidence.effectAbsent,
    attemptStarted:
      attempt.status === AttemptStatus.RUNNING ||
      attempt.status === AttemptStatus.TIMED_OUT ||
      attempt.status === AttemptStatus.STALE,
  });
  return {
    directive: c.directive,
    reexecute: c.reexecute,
    reason:
      `attempt ${attempt.attempt_id} in ${attempt.status}: ` +
      `delegated to classifyUnknownExecution (R-A/R-B/R-C)`,
  };
}
