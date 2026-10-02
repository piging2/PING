/**
 * kill-lib — shared failure-injection / honest-recovery test library.
 *
 * Primitives:
 *   kill-mid-effect   fork a real child, kill it with a real signal, classify honestly
 *   checkpoint-resume durable checkpoints, stale detection, revalidation on resume
 *   claim-race        exactly-one-winner claiming across real concurrent processes
 *   lease             TTL leases with safe reclaim only after provable expiry
 *   idempotency       idempotency-key dedup; IN_FLIGHT retries get OUTCOME_UNKNOWN
 *   failure-classes   harvested real failure classes, each bound to a regression gate
 *   types             the Outcome taxonomy: SUCCEEDED / FAILED / OUTCOME_UNKNOWN
 */

export * from './types';
export * from './kill-mid-effect';
export * from './checkpoint-resume';
export * from './claim-race';
export * from './lease';
export * from './idempotency';
export * from './failure-classes';
