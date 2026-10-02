/**
 * Auto-resolvers — Swarm 10 (Human Decision Budget).
 *
 * How agents resolve the four auto classes THEMSELVES (DECISION-BUDGET.md R1-R5).
 * These are contracts + bounded procedures, not implementations: the converged
 * loop supplies the source readers; the resolvers enforce the bounds.
 *
 * An agent that cannot name the source it consulted has not auto-resolved.
 */

import { EscalationAttempt, EscalationClass } from './taxonomy';

export interface ResolutionResult {
  resolved: boolean;
  /** What was done, in audit-ready language. Appended to the evidence chain (R3). */
  actionTaken: string;
  /** The source consulted, named (R1). */
  sourceConsulted: string;
  /** Follow-up class when not resolved (e.g. experiment failed -> human with evidence). */
  reclassifyTo?: EscalationClass;
  /** Evidence produced (experiment output, re-verification result, state snapshot ref). */
  evidence?: string;
}

/** Bounds from DECISION-BUDGET.md R2. */
export const RESOLUTION_BOUNDS = {
  /** 2.1: one fix + one re-verification per distinct blocked_by. */
  maxFixAttemptsPerCause: 1,
  /** 2.2: replay at most one recorded resolution. */
  maxHistoryReplays: 1,
  /** 2.3: re-check at most N times with backoff, then convert to experiment. */
  maxRuntimeRechecks: 3,
  /** 2.4: one experiment per hypothesis. */
  maxExperimentsPerHypothesis: 1,
  /** History replay stops after this many consecutive failures. */
  consecutiveFailureCap: 3,
  /** Default sandbox experiment budget. */
  experimentTimeoutMs: 5 * 60 * 1000,
} as const;

/**
 * 2.1 DERIVABLE_FROM_SOURCE — apply the remedy the artifact names, re-verify
 * through the same gate. Concrete remedy map from the inventory:
 *  - 'tests_failed'            -> re-run the failing tests (E-01/E-07)
 *  - 'patch_validation_failed' -> read validator output, amend patch (E-01/E-07)
 *  - 'replay_mismatch'         -> re-run replay; if flaky, one re-run only (E-01/E-07)
 *  - 'witness_verification_failed' -> re-create witness (E-01)
 *  - merge-gate hint           -> apply the hinted fix (E-10)
 *  - 'no worker matched'       -> registry lookup; register worker or drop type (E-21)
 *  - TRANSITION_BLOCKED        -> follow an allowed transition (E-28)
 */
export interface SourceResolver {
  /** The blocked_by / gate id / cause code being resolved. */
  causeCode: string;
  /** Apply the deterministic remedy. Must be side-effect-bounded. */
  applyFix(attempt: EscalationAttempt): Promise<{ fixed: boolean; detail: string }>;
  /** Re-verify through the SAME gate that blocked. */
  reverify(attempt: EscalationAttempt): Promise<{ passed: boolean; detail: string }>;
}

export async function resolveFromSource(
  attempt: EscalationAttempt,
  resolver: SourceResolver,
): Promise<ResolutionResult> {
  const fix = await resolver.applyFix(attempt);
  if (!fix.fixed) {
    return {
      resolved: false,
      actionTaken: `source remedy for ${resolver.causeCode} could not be applied: ${fix.detail}`,
      sourceConsulted: `blocking artifact (${attempt.siteId})`,
      reclassifyTo: EscalationClass.SAFE_EXPERIMENT_AVAILABLE,
      evidence: fix.detail,
    };
  }
  const check = await resolver.reverify(attempt);
  return {
    resolved: check.passed,
    actionTaken: `applied source remedy for ${resolver.causeCode}; re-verification ${check.passed ? 'passed' : 'failed'}: ${check.detail}`,
    sourceConsulted: `blocking artifact (${attempt.siteId})`,
    reclassifyTo: check.passed ? undefined : EscalationClass.SAFE_EXPERIMENT_AVAILABLE,
    evidence: check.detail,
  };
}

/**
 * 2.2 DERIVABLE_FROM_HISTORY — replay at most ONE recorded resolution for the
 * same repeatKey. History source: mission / approval / DLQ tables.
 */
export interface HistoryRecord {
  repeatKey: string;
  terminalResolution: string;
  succeeded: boolean;
}

export async function resolveFromHistory(
  attempt: EscalationAttempt,
  lookup: (repeatKey: string) => Promise<HistoryRecord | null>,
  applyRecorded: (record: HistoryRecord, attempt: EscalationAttempt) => Promise<{ ok: boolean; detail: string }>,
): Promise<ResolutionResult> {
  const record = await lookup(attempt.repeatKey);
  if (!record) {
    return {
      resolved: false,
      actionTaken: 'no recorded terminal resolution for repeatKey; class not satisfied (R4)',
      sourceConsulted: 'mission/approval/DLQ history',
      reclassifyTo: EscalationClass.SAFE_EXPERIMENT_AVAILABLE,
    };
  }
  const applied = await applyRecorded(record, attempt);
  return {
    resolved: applied.ok,
    actionTaken: `replayed recorded resolution for ${attempt.repeatKey.slice(0, 12)}: ${record.terminalResolution}; outcome: ${applied.detail}`,
    sourceConsulted: 'mission/approval/DLQ history',
    reclassifyTo: applied.ok ? undefined : EscalationClass.SAFE_EXPERIMENT_AVAILABLE,
    evidence: applied.detail,
  };
}

/**
 * 2.3 DERIVABLE_FROM_RUNTIME — read fresh live state, act, re-check (≤3).
 * State must be read inside the attempt's execution window; cached state older
 * than the attempt is not a source (R1/R4).
 */
export interface RuntimeSnapshot {
  readAt: string;
  [key: string]: unknown;
}

export async function resolveFromRuntime(
  attempt: EscalationAttempt,
  readState: () => Promise<RuntimeSnapshot>,
  decide: (snapshot: RuntimeSnapshot, attempt: EscalationAttempt) => Promise<{ action: string; done: boolean; detail: string }>,
): Promise<ResolutionResult> {
  for (let i = 0; i < RESOLUTION_BOUNDS.maxRuntimeRechecks; i++) {
    const snapshot = await readState();
    const d = await decide(snapshot, attempt);
    if (d.done) {
      return {
        resolved: true,
        actionTaken: `runtime decision after ${i + 1} check(s): ${d.action}; ${d.detail}`,
        sourceConsulted: `live state read at ${snapshot.readAt}`,
        evidence: d.detail,
      };
    }
  }
  return {
    resolved: false,
    actionTaken: `runtime state did not yield a decision after ${RESOLUTION_BOUNDS.maxRuntimeRechecks} checks; converting to experiment (R2)`,
    sourceConsulted: 'live scheduler/registry/queue/table state',
    reclassifyTo: EscalationClass.SAFE_EXPERIMENT_AVAILABLE,
  };
}

/**
 * 2.4 SAFE_EXPERIMENT_AVAILABLE — one bounded experiment per hypothesis.
 * The experiment MUST be: side-effect-free or fully sandboxed, time-bounded
 * (default 5 min), evidence-recorded, reversible by construction.
 */
export interface SafeExperiment {
  hypothesis: string;
  /** Runs the dry-run; must not mutate production state. */
  run: () => Promise<{ success: boolean; evidence: string }>;
  timeoutMs?: number;
}

export async function trySafeExperiment(
  attempt: EscalationAttempt,
  experiment: SafeExperiment,
): Promise<ResolutionResult> {
  const timeoutMs = experiment.timeoutMs ?? RESOLUTION_BOUNDS.experimentTimeoutMs;
  const result = await Promise.race([
    experiment.run(),
    new Promise<{ success: false; evidence: string }>((resolve) =>
      setTimeout(() => resolve({ success: false, evidence: `experiment timed out after ${timeoutMs}ms` }), timeoutMs),
    ),
  ]);
  return {
    resolved: result.success,
    actionTaken: `safe experiment for hypothesis ${JSON.stringify(experiment.hypothesis)}: ${result.success ? 'succeeded' : 'failed'}`,
    sourceConsulted: 'sandbox experiment harness',
    // On failure the evidence goes WITH the escalation: the human decides once (2.4).
    reclassifyTo: result.success ? undefined : EscalationClass.OTHER,
    evidence: result.evidence,
  };
}
