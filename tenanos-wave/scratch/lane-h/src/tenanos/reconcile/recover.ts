/**
 * Recovery Executor — re-enqueue + atomic claim, never resume in place
 * (P-20260923-013, swarm-14).
 *
 * The recoverer does exactly one thing: turn a DEAD attempt into a redrive
 * plan for a NEW run. It never resumes the old attempt in place — resuming
 * in place is structurally impossible here because the plan carries no
 * write-target for the old attempt row; the old identity appears only as
 * lineage (supersedes_*) and in the journal.
 *
 *   - Dead-executor predicate: lease expired + grace elapsed. A missing
 *     lease is not proof of death — fail closed, refuse recovery.
 *   - New identity is DERIVED deterministically from the dead attempt
 *     (sha256 domain-separated). Re-enqueueing the same dead attempt
 *     yields the identical plan, so a duplicate enqueue is a no-op at the
 *     unique constraint — re-enqueue is idempotent by construction.
 *   - attempt_number increments by exactly one: the lineage is auditable.
 *   - The journal names the dead executor AND the new run.
 *   - The atomic claim (Lane 2: electing the runner) is issued against the
 *     NEW attempt with a FRESH fencing token. 103's buildFenceCondition is
 *     the enforcer; this module only plans.
 *
 * PURE: no clock (nowMs is a parameter), no IO, no mutation of inputs.
 * The data-access layer performs the INSERT + fenced claim; this module
 * decides what that write must contain.
 *
 * SEAMS (single ownership):
 *   - P-20260923-095 owns the run-state vocabulary + transition guard +
 *     reconciliation classifier. This executor only runs on attempts the
 *     classifier (or the dead-executor predicate) already condemned; it
 *     never reclassifies. Its redrive corresponds to 095's
 *     REQUEUE_AS_PENDING / RETRY_ATTEMPT_WITH_LINEAGE directives, and
 *     NEEDS_RECONCILIATION -> PENDING is a legal 095 edge.
 *   - P-20260923-103 owns attempt lifecycle mechanics, fencing tokens,
 *     and the checkpoint write gate. The fresh claim_token planned here
 *     becomes the fencing_token of the new attempt row; 103's conditional
 *     UPDATE (fence on token + status) is what makes the claim atomic.
 *     This module never touches the old attempt's token.
 *   - P-20260923-006 owns the canonical overdue predicate. isDeadExecutor
 *     below mirrors its contract (lease expired + grace); at repo
 *     integration this delegates to src/tenanos/reconcile/overdue.ts.
 *     Kept local here so the reference implementation is self-contained.
 */

import { createHash } from 'node:crypto';
import { isOverdue } from './overdue';

/** Minimal dead-attempt shape the recoverer reads. */
export interface DeadAttempt {
  attempt_id: string;
  /** Old run identity — lineage only, never a write target. */
  run_id: string;
  mission_id: string;
  attempt_number: number;
  /** Per-attempt lease (103's tenanos_run_attempts.lease_until). */
  lease_until_ms: number | null;
  /** Old fencing token — never reused. */
  fencing_token: string;
  /** Name of the executor that died holding this attempt. */
  dead_executor: string;
}

export interface RecoveryJournalEntry {
  type: 'RECOVERY_REDRIVE';
  at_ms: number;
  dead_executor: string;
  old_attempt_id: string;
  old_run_id: string;
  new_attempt_id: string;
  new_run_id: string;
  attempt_number: number;
}

/**
 * The redrive plan. Note what is ABSENT: there is no field that addresses
 * the old attempt row for mutation. Resume-in-place is not a rejected
 * option — it is an inexpressible one.
 */
export interface RecoveryPlan {
  new_run_id: string;
  new_attempt_id: string;
  mission_id: string;
  /** Exactly old attempt_number + 1. */
  attempt_number: number;
  /** Lineage only. */
  supersedes_attempt_id: string;
  /** Lineage only. */
  supersedes_run_id: string;
  dead_executor: string;
  /** Fresh fencing token for the new attempt's atomic claim (Lane 2). */
  claim_token: string;
  journal: RecoveryJournalEntry;
}

export class AttemptNotDeadError extends Error {
  constructor(attemptId: string) {
    super(
      `planRecovery: attempt ${attemptId} is not provably dead ` +
        '(lease live or lease unknown) — refusing to recover (fail-closed)',
    );
    this.name = 'AttemptNotDeadError';
  }
}

export class InvalidAttemptError extends Error {
  constructor(message: string) {
    super(`planRecovery: invalid attempt: ${message}`);
    this.name = 'InvalidAttemptError';
  }
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Dead-executor predicate, delegated to the canonical 006 overdue
 * predicate (src/tenanos/reconcile/overdue.ts): an attempt is a dead
 * executor iff its lease deadline (plus grace) is overdue while the
 * attempt still reads as live work (RUNNING). A null lease fails closed
 * to NOT dead (matches 095's "no lease info fails toward in-flight"
 * posture for legacy rows). Negative grace throws inside 006
 * (fail-closed); this module owns no copy of the decision.
 */
export function isDeadExecutor(
  leaseUntilMs: number | null,
  nowMs: number,
  graceMs: number,
): boolean {
  return isOverdue({ state: 'RUNNING', dueAtMs: leaseUntilMs, nowMs, graceMs });
}

function checkAttempt(dead: DeadAttempt): void {
  if (!dead.attempt_id) throw new InvalidAttemptError('attempt_id required');
  if (!dead.run_id) throw new InvalidAttemptError('run_id required');
  if (!dead.mission_id) throw new InvalidAttemptError('mission_id required');
  if (!Number.isInteger(dead.attempt_number) || dead.attempt_number < 0) {
    throw new InvalidAttemptError('attempt_number must be a non-negative integer');
  }
  if (!dead.fencing_token) throw new InvalidAttemptError('fencing_token required');
  if (!dead.dead_executor) throw new InvalidAttemptError('dead_executor required');
}

/**
 * Plan the recovery of a dead attempt as a NEW run.
 * Pure and deterministic: the same dead attempt always yields the same
 * plan, so duplicate recovery passes converge on one redrive.
 */
export function planRecovery(
  dead: DeadAttempt,
  nowMs: number,
  graceMs: number,
): RecoveryPlan {
  checkAttempt(dead);
  if (!isDeadExecutor(dead.lease_until_ms, nowMs, graceMs)) {
    throw new AttemptNotDeadError(dead.attempt_id);
  }

  const attemptNumber = dead.attempt_number + 1;
  const basis = `${dead.attempt_id}:${dead.attempt_number}:${dead.lease_until_ms}`;
  const newRunId = `run_redrive_${sha256Hex(`redrive:v1:${basis}`).slice(0, 32)}`;
  const newAttemptId = `att_redrive_${sha256Hex(`attempt:v1:${basis}`).slice(0, 32)}`;
  const claimToken = `fence_${sha256Hex(`claim:v1:${basis}`).slice(0, 32)}`;

  return {
    new_run_id: newRunId,
    new_attempt_id: newAttemptId,
    mission_id: dead.mission_id,
    attempt_number: attemptNumber,
    supersedes_attempt_id: dead.attempt_id,
    supersedes_run_id: dead.run_id,
    dead_executor: dead.dead_executor,
    claim_token: claimToken,
    journal: {
      type: 'RECOVERY_REDRIVE',
      at_ms: nowMs,
      dead_executor: dead.dead_executor,
      old_attempt_id: dead.attempt_id,
      old_run_id: dead.run_id,
      new_attempt_id: newAttemptId,
      new_run_id: newRunId,
      attempt_number: attemptNumber,
    },
  };
}
