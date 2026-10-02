/**
 * TenantOS Verification Engine — types (swarm-16, P-20260923-094)
 *
 * RESULT -> VERIFICATION step of the autonomous loop.
 * Core law: RESULT != VERIFIED OUTCOME. A tool result is a claim; only
 * evidence bound to that claim can promote it to a verified outcome.
 *
 * Self-contained: no imports from repo roots (avoids the shared-seam rule on
 * any future src/tenanos/types.ts).
 */

/** Ordered evidence grades. Comparison uses GRADE_ORDER, never string order. */
export type EvidenceGrade = 'none' | 'asserted' | 'observed' | 'recomputed' | 'attested';

export const GRADE_ORDER: Record<EvidenceGrade, number> = {
  none: 0,
  asserted: 1,
  observed: 2,
  recomputed: 3,
  attested: 4,
};

/**
 * Maximum certifiable confidence per weakest evidence grade.
 * A verifier may never certify above the evidence it actually holds —
 * this is the confidence ceiling (swarm-16 mandate).
 */
export const GRADE_CONFIDENCE_CAP: Record<EvidenceGrade, number> = {
  none: 0,
  asserted: 0.25,
  observed: 0.6,
  recomputed: 0.85,
  attested: 1.0,
};

/** Minimum grade floor required on every claim for a VERIFIED outcome. */
export const VERIFIED_GRADE_FLOOR: EvidenceGrade = 'observed';

export type VerificationOutcome = 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';

export type EvidenceCheckKind =
  | 'schema-match'
  | 'hash-recompute'
  | 'requery'
  | 'journal-readback'
  | 'invariant';

/** A single claimed effect of a tool call. Claims are cheap; verification is not. */
export interface EffectClaim {
  claimId: string;
  /** stable kind, e.g. 'file-written', 'row-inserted', 'message-sent' */
  effectKind: string;
  description: string;
  expectedValue?: unknown;
}

/**
 * One evidence check bound to one claim. The nonce binds the evidence to a
 * single verification act: recycled evidence from a previous run is stale
 * by construction and must fail the freshness gate.
 */
export interface EvidenceCheck {
  checkId: string;
  claimId: string;
  kind: EvidenceCheckKind;
  grade: EvidenceGrade;
  passed: boolean;
  /** unix ms when the evidence was collected */
  observedAtMs: number;
  /** must equal the expectation's freshnessNonce */
  nonce: string;
  /** human/machine-readable note, e.g. digest value or journal sequence */
  detail?: string;
}

/** Raw output of a tool call, before verification. */
export interface ToolResult {
  toolCallId: string;
  /** transport-level acknowledgement; ACK != EFFECT */
  ack: 'ok' | 'error' | 'timeout';
  claimed: EffectClaim[];
  rawPayload: unknown;
  /** unknown side-effect semantics fail closed for autonomous mutation */
  sideEffectSemantics: 'known' | 'unknown';
}

/** What the autonomous loop expected the tool call to do. */
export interface VerificationExpectation {
  toolCallId: string;
  expected: EffectClaim[];
  /** evidence minted for any other nonce is rejected */
  freshnessNonce: string;
  /** evidence older than this (ms) relative to verification time is stale */
  maxAgeMs: number;
  /** allow a no-op call (no claims at all) to verify */
  allowEmpty?: boolean;
}

export interface VerificationFinding {
  severity: 'info' | 'warn' | 'reject';
  code: string;
  message: string;
  claimId?: string;
}

export interface Verification {
  outcome: VerificationOutcome;
  /** weakest evidence grade across all claims */
  gradeFloor: EvidenceGrade;
  /** >0 only when outcome is VERIFIED; capped by gradeFloor */
  certifiedConfidence: number;
  findings: VerificationFinding[];
  /** true only when outcome is VERIFIED */
  autonomousMutationAllowed: boolean;
  toolCallId: string;
  verifiedAtMs: number;
}