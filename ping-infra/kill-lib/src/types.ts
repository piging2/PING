/**
 * kill-lib — shared failure-injection / honest-recovery test library.
 *
 * The single load-bearing idea: an effect that cannot be proven is
 * OUTCOME_UNKNOWN, never FAILED and never SUCCEEDED. Every primitive in this
 * library classifies into exactly one of the three outcomes, and every
 * verdict carries its evidence.
 *
 * Consumers: TenantOS wave autonomy gauntlet (swarm 20), ORCA wave recovery
 * gauntlet. This is the reusable LIBRARY underneath the gauntlet TESTS.
 */

export type Outcome = 'SUCCEEDED' | 'FAILED' | 'OUTCOME_UNKNOWN';

/**
 * What a recovery probe can honestly say about an effect whose executor died.
 *
 * - EFFECT_OBSERVABLE: the effect's durable receipt exists. The effect happened.
 * - EFFECT_ABSENT:    the effect provably did not happen (its preconditions
 *                     for observability are met and the receipt is missing).
 * - UNVERIFIABLE:     the probe cannot tell. The effect may or may not have
 *                     happened. Honest answer: OUTCOME_UNKNOWN.
 */
export type ProbeResult = 'EFFECT_OBSERVABLE' | 'EFFECT_ABSENT' | 'UNVERIFIABLE';

export interface EffectVerdict {
  outcome: Outcome;
  /** Human- and machine-readable evidence trail. Never empty. */
  evidence: string[];
  /** ISO-8601 timestamp of classification. */
  at: string;
}

/**
 * The outcome taxonomy. The mapping is total and honest:
 * observable -> SUCCEEDED, provably absent -> FAILED, else OUTCOME_UNKNOWN.
 */
export function classifyProbeResult(probe: ProbeResult, context: string): EffectVerdict {
  const at = new Date().toISOString();
  switch (probe) {
    case 'EFFECT_OBSERVABLE':
      return {
        outcome: 'SUCCEEDED',
        at,
        evidence: [
          `probe=effect_observable context=${context}`,
          'durable receipt present: effect provably completed before death',
        ],
      };
    case 'EFFECT_ABSENT':
      return {
        outcome: 'FAILED',
        at,
        evidence: [
          `probe=effect_absent context=${context}`,
          'observability preconditions met and receipt missing: effect provably did not complete',
        ],
      };
    case 'UNVERIFIABLE':
      return {
        outcome: 'OUTCOME_UNKNOWN',
        at,
        evidence: [
          `probe=unverifiable context=${context}`,
          'effect may have completed; no receipt readable: MUST NOT retry blindly, MUST NOT claim success',
        ],
      };
  }
}

export function assertNever(x: never): never {
  throw new Error(`unreachable outcome branch: ${String(x)}`);
}
