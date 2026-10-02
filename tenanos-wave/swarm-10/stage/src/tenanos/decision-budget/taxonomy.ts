/**
 * Decision-budget taxonomy — Swarm 10 (Human Decision Budget).
 *
 * Pure classification module. No I/O, no stores, no event bus, no authority.
 * It answers one question: for an attempted escalation, WHO decides next —
 * the agent (classes AUTO_*) or a human (classes HUMAN_*) — and why.
 *
 * Membership tests are evaluated in enum order; the FIRST passing test wins.
 * Auto classes take precedence by construction: that precedence IS the budget.
 */

export enum EscalationClass {
  // Auto-resolve: MUST NOT reach a human.
  DERIVABLE_FROM_SOURCE = 'DERIVABLE_FROM_SOURCE',
  DERIVABLE_FROM_HISTORY = 'DERIVABLE_FROM_HISTORY',
  DERIVABLE_FROM_RUNTIME = 'DERIVABLE_FROM_RUNTIME',
  SAFE_EXPERIMENT_AVAILABLE = 'SAFE_EXPERIMENT_AVAILABLE',
  // Human-eligible: exactly-once, minimum payload (see escalation-envelope.ts).
  CREDENTIAL_REQUIRED = 'CREDENTIAL_REQUIRED',
  AUTHORIZATION_REQUIRED = 'AUTHORIZATION_REQUIRED',
  DESTRUCTIVE = 'DESTRUCTIVE',
  PRODUCT_INTENT = 'PRODUCT_INTENT',
  POLICY_CONFLICT = 'POLICY_CONFLICT',
  OTHER = 'OTHER',
}

export const AUTO_CLASSES: ReadonlySet<EscalationClass> = new Set([
  EscalationClass.DERIVABLE_FROM_SOURCE,
  EscalationClass.DERIVABLE_FROM_HISTORY,
  EscalationClass.DERIVABLE_FROM_RUNTIME,
  EscalationClass.SAFE_EXPERIMENT_AVAILABLE,
]);

export function isAutoClass(c: EscalationClass): boolean {
  return AUTO_CLASSES.has(c);
}

/**
 * The evidence an escalation attempt carries. Built by the caller (the converged
 * loop) from existing sources — approval_conditions, gate output, DLQ rows,
 * scheduler state — at the exact hook site. Nothing here is fetched.
 */
export interface EscalationAttempt {
  /** Stable hook-site id, e.g. 'E-07'. See hook-points.ts. */
  siteId: string;
  /** mission / run / execution / approval / dead-letter ids, as applicable. */
  contextIds: Record<string, string>;
  /** Machine-readable cause, e.g. approval_conditions.blocked_by. */
  causeCode?: string;
  /** Human-readable what-happened, one line. */
  summary: string;
  /**
   * What the agent already tried, in order. Required (may be empty only for
   * CREDENTIAL_REQUIRED / PRODUCT_INTENT where asking first is correct).
   */
  priorAttempts: Array<{
    action: string;
    sourceConsulted?: string;
    outcome: string;
    at: string;
  }>;
  /** Signals the caller observed; predicates read these, never I/O. */
  signals: {
    /** The blocking artifact names a deterministic remedy (gate hint, validator output). */
    causeNamesRemedy?: boolean;
    /** ≥1 prior attempt with the same repeatKey reached a terminal recorded resolution. */
    historyHasRecordedResolution?: boolean;
    /** Consecutive failures for this repeatKey with no successful resolution. */
    consecutiveFailures?: number;
    /** Answer is observable from live scheduler/registry/queue/table state. */
    answerInLiveState?: boolean;
    /** A bounded, sandboxed, evidence-recorded experiment exists. */
    safeExperimentAvailable?: boolean;
    /** Progress impossible without a human-provisioned secret/config. */
    needsProvisionedSecret?: boolean;
    /** Policy or design requires a named human yes/no. */
    requiresHumanJudgment?: boolean;
    /** Effect is irreversible. */
    irreversible?: boolean;
    /** No source/history/runtime/experiment could answer; it is a want, not a fact. */
    isWantNotFact?: boolean;
    /** Standing rules contradict, or the rule is unwired. */
    policyContradiction?: string;
  };
  /** sha256(siteId|class|mission_type|target|blocked_by|failure_reason) — caller computes. */
  repeatKey: string;
  /** True when a prior attempt with this repeatKey reached a human in the last 24h. */
  isRepeat?: boolean;
}

export interface Classification {
  class: EscalationClass;
  /** The membership test that passed, quoted. */
  rationale: string;
  autoResolve: boolean;
  /** For repeats: what changed since the prior decision, if anything. */
  repeatNote?: string;
}

const q = (s: string) => `"${s}"`;

/**
 * Classify an escalation attempt. Pure: reads only the attempt.
 * Order below is normative (DECISION-BUDGET.md section 2).
 */
export function classify(attempt: EscalationAttempt): Classification {
  const s = attempt.signals;

  if (s.causeNamesRemedy) {
    return {
      class: EscalationClass.DERIVABLE_FROM_SOURCE,
      rationale: `cause ${q(attempt.causeCode ?? 'unknown')} names its own remedy; fix deterministically and re-verify (R1).`,
      autoResolve: true,
    };
  }
  if (s.historyHasRecordedResolution && (s.consecutiveFailures ?? 0) < 3) {
    return {
      class: EscalationClass.DERIVABLE_FROM_HISTORY,
      rationale: `repeatKey ${q(attempt.repeatKey.slice(0, 12))} has a recorded terminal resolution; replay it (R2).`,
      autoResolve: true,
    };
  }
  if ((s.consecutiveFailures ?? 0) >= 3 && s.safeExperimentAvailable) {
    return {
      class: EscalationClass.SAFE_EXPERIMENT_AVAILABLE,
      rationale: `history shows >=3 consecutive failures; stop replaying, run one bounded experiment (R2/R4).`,
      autoResolve: true,
    };
  }
  if (s.answerInLiveState) {
    return {
      class: EscalationClass.DERIVABLE_FROM_RUNTIME,
      rationale: `answer observable from live state; read fresh, act, re-check (R1/R2).`,
      autoResolve: true,
    };
  }
  if (s.safeExperimentAvailable) {
    return {
      class: EscalationClass.SAFE_EXPERIMENT_AVAILABLE,
      rationale: `bounded dry-run available: side-effect-free or sandboxed, time-bounded, evidence-recorded (2.4).`,
      autoResolve: true,
    };
  }
  if (s.needsProvisionedSecret) {
    return {
      class: EscalationClass.CREDENTIAL_REQUIRED,
      rationale: `progress impossible without a human-provisioned value no agent may mint.`,
      autoResolve: false,
    };
  }
  if (s.irreversible) {
    return {
      class: EscalationClass.DESTRUCTIVE,
      rationale: `effect is irreversible; approval gate makes "yes" cheap, not theatrical.`,
      autoResolve: false,
    };
  }
  if (s.requiresHumanJudgment) {
    return {
      class: EscalationClass.AUTHORIZATION_REQUIRED,
      rationale: `policy or design requires a named human decision; the question is a real judgment.`,
      autoResolve: false,
    };
  }
  if (s.isWantNotFact) {
    return {
      class: EscalationClass.PRODUCT_INTENT,
      rationale: `no source/history/runtime/experiment answers it; route to the one canonical surface.`,
      autoResolve: false,
    };
  }
  if (s.policyContradiction) {
    return {
      class: EscalationClass.POLICY_CONFLICT,
      rationale: `policy conflict or unwired rule: ${q(s.policyContradiction)}; fail closed, escalate the conflict once.`,
      autoResolve: false,
    };
  }
  return {
    class: EscalationClass.OTHER,
    rationale: `no class test passed; burden of proof is on escalation — state why 2.1-2.4 do not apply.`,
    autoResolve: false,
    repeatNote: attempt.isRepeat ? 'repeat without recorded decision change' : undefined,
  };
}
