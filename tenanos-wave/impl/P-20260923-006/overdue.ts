/**
 * Lazy Reconciliation — pure overdue predicate (P-20260923-006, swarm-14).
 *
 * isOverdue(state, dueAtMs, nowMs, graceMs): the single canonical answer to
 * "is this execution overdue and therefore eligible for a redrive enqueue?"
 *
 * Design rules:
 *   - PURE: all inputs are parameters. No Date.now(), no IO, no ambient
 *     clock. Same inputs always yield the same decision.
 *   - LAZY: detection happens at status-read / claim time. There is no
 *     sweeper service and no second orchestrator; the predicate is the
 *     decider and the caller's data-access layer is the enforcer.
 *   - NEVER MUTATES: the predicate returns a decision; enqueueing the
 *     redrive is the caller's job (P-20260923-013 executes it).
 *   - FAIL-CLOSED: unknown state strings throw; a missing deadline is
 *     never overdue; terminal / held states are never overdue.
 *
 * SEAMS (single ownership):
 *   - P-20260923-095 (src/tenanos/run/run-state-authority.ts) owns the state
 *     VOCABULARY (CanonicalRunState) and the row->state PROJECTION
 *     (projectMission). This module COMPOSES with it: it takes a projected
 *     state and decides overdue-ness. It does not re-project rows.
 *   - P-20260923-101 (proposed) owns the startup/orphan reconciliation PASS;
 *     this predicate owns the lazy read-path/claim-path detection. Different
 *     triggers, one shared decision shape.
 *   - P-20260923-013 consumes this predicate as its dead-executor detector.
 */

/** Canonical run states this predicate understands (mirrors 095's vocabulary). */
export type RunState =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'BLOCKED'
  | 'CANCELLED'
  | 'UNKNOWN_EXECUTION'
  | 'NEEDS_RECONCILIATION';

const TERMINAL: ReadonlySet<RunState> = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);

/** States the reconciler owns, not the overdue predicate (no double handling). */
const RECONCILER_OWNED: ReadonlySet<RunState> = new Set([
  'UNKNOWN_EXECUTION',
  'NEEDS_RECONCILIATION',
]);

export class UnknownRunStateError extends Error {
  constructor(state: string) {
    super(`isOverdue: unknown run state '${state}' (fail-closed)`);
    this.name = 'UnknownRunStateError';
  }
}

export interface OverdueInput {
  /** Projected canonical state (095's vocabulary). */
  state: string;
  /** Deadline in epoch ms, or null when the run has no deadline. */
  dueAtMs: number | null;
  /** Observation time in epoch ms — passed in, never read from the clock. */
  nowMs: number;
  /** Grace after the deadline before the run counts as overdue. */
  graceMs: number;
}

function asRunState(state: string): RunState {
  switch (state) {
    case 'PENDING':
    case 'RUNNING':
    case 'SUCCEEDED':
    case 'FAILED':
    case 'BLOCKED':
    case 'CANCELLED':
    case 'UNKNOWN_EXECUTION':
    case 'NEEDS_RECONCILIATION':
      return state;
    default:
      throw new UnknownRunStateError(state);
  }
}

/**
 * Pure overdue predicate. Returns true only when ALL hold:
 *   1. state is live work (PENDING or RUNNING),
 *   2. a deadline exists,
 *   3. nowMs >= dueAtMs + graceMs.
 *
 * Terminal states are never overdue (done work is not late work).
 * BLOCKED is a deliberate hold, not lateness. UNKNOWN_EXECUTION and
 * NEEDS_RECONCILIATION belong to the reconciler/classifier (095/101);
 * routing them through "overdue" would double-handle them.
 */
export function isOverdue(input: OverdueInput): boolean {
  if (input.graceMs < 0) {
    throw new Error('isOverdue: graceMs must be non-negative');
  }
  const state = asRunState(input.state);
  if (TERMINAL.has(state)) return false;
  if (RECONCILER_OWNED.has(state)) return false;
  if (state === 'BLOCKED') return false;
  // PENDING | RUNNING from here.
  if (input.dueAtMs == null) return false; // no deadline: never overdue
  return input.nowMs >= input.dueAtMs + input.graceMs;
}

export type RedriveDecision = 'ENQUEUE_REDRIVE' | 'NOOP';

/**
 * Decision wrapper over the predicate, with the reason a caller (or an
 * audit trail) needs. Still pure: the decision is data, the enqueue is
 * the caller's effect.
 */
export function decideRedrive(input: OverdueInput): { decision: RedriveDecision; reason: string } {
  const overdue = isOverdue(input);
  return {
    decision: overdue ? 'ENQUEUE_REDRIVE' : 'NOOP',
    reason: overdue
      ? `state=${input.state} past dueAt+grace (dueAt=${input.dueAtMs}, grace=${input.graceMs}ms, now=${input.nowMs})`
      : `state=${input.state} not overdue (dueAt=${input.dueAtMs}, grace=${input.graceMs}ms, now=${input.nowMs})`,
  };
}
