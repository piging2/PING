/**
 * TenantOS Verification Engine — the RESULT -> VERIFICATION gate
 * (swarm-16, P-20260923-089)
 *
 * verifyToolResult() takes a raw tool result plus the loop's expectation and
 * evidence checks, and returns a Verification. Decision order is
 * fail-closed: any structural defect (unknown semantics, stale evidence,
 * unexpected claims, self-asserted claims) yields UNVERIFIED; evidence that
 * actively contradicts a claim yields REJECTED with the missing evidence
 * named. VERIFIED requires every claim to be backed by fresh, nonce-bound
 * evidence at or above the grade floor, and is the only state that permits
 * autonomous mutation.
 *
 * Deterministic: the verification instant is an explicit parameter (nowMs),
 * so the gate is testable and replayable.
 */
import {
  GRADE_CONFIDENCE_CAP,
  GRADE_ORDER,
  VERIFIED_GRADE_FLOOR,
} from './types.ts';
import type {
  EffectClaim,
  EvidenceCheck,
  EvidenceGrade,
  ToolResult,
  Verification,
  VerificationExpectation,
  VerificationFinding,
} from './types.ts';

const FRESHNESS_BOUND_KINDS = new Set(['requery', 'journal-readback']);

function finding(
  severity: 'info' | 'warn' | 'reject',
  code: string,
  message: string,
  claimId?: string,
): VerificationFinding {
  return claimId === undefined ? { severity, code, message } : { severity, code, message, claimId };
}

function minGrade(a: EvidenceGrade, b: EvidenceGrade): EvidenceGrade {
  return GRADE_ORDER[a] <= GRADE_ORDER[b] ? a : b;
}

export function verifyToolResult(
  result: ToolResult,
  expectation: VerificationExpectation,
  checks: EvidenceCheck[],
  nowMs: number,
): Verification {
  const findings: VerificationFinding[] = [];
  let outcome: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED' = 'VERIFIED';
  let gradeFloor: EvidenceGrade = 'attested';

  const failClosed = (f: VerificationFinding) => {
    findings.push(f);
    if (outcome === 'VERIFIED') outcome = 'UNVERIFIED';
  };
  const reject = (f: VerificationFinding) => {
    findings.push(f);
    outcome = 'REJECTED';
  };

  // 0. Identity binding: the expectation must be for this tool call.
  if (expectation.toolCallId !== result.toolCallId) {
    reject(finding('reject', 'EXPECTATION_MISMATCH',
      `expectation is for ${expectation.toolCallId} but result is for ${result.toolCallId}`));
    return finish();
  }

  // 1. ACK != EFFECT and unknown side-effect semantics fail closed.
  if (result.sideEffectSemantics === 'unknown') {
    failClosed(finding('reject', 'SIDE_EFFECT_UNKNOWN',
      'tool result carries unknown side-effect semantics: autonomous mutation blocked until the effect is characterized'));
  }
  if (result.ack !== 'ok') {
    failClosed(finding('reject', 'ACK_NOT_OK',
      `transport ack is '${result.ack}': there is no successful result to verify`));
  }

  // 2. Claim coverage: every expected claim must be present in the result.
  const claimedById = new Map(result.claimed.map((c) => [c.claimId, c]));
  const expectedById = new Map(expectation.expected.map((c) => [c.claimId, c]));
  for (const expected of expectation.expected) {
    if (!claimedById.has(expected.claimId)) {
      failClosed(finding('reject', 'EXPECTATION_UNMET',
        `expected claim '${expected.claimId}' (${expected.description}) is absent from the result`, expected.claimId));
    }
  }
  // Surprise effects fail closed: the loop may not mutate on effects it did not expect.
  for (const claimed of result.claimed) {
    if (!expectedById.has(claimed.claimId)) {
      failClosed(finding('reject', 'UNEXPECTED_CLAIM',
        `result claims '${claimed.claimId}' (${claimed.description}) which the expectation did not authorize`, claimed.claimId));
    }
  }

  // 3. Evidence binding per claim.
  const checksByClaim = new Map<string, EvidenceCheck[]>();
  for (const check of checks) {
    if (check.claimId === undefined) continue;
    const list = checksByClaim.get(check.claimId) ?? [];
    list.push(check);
    checksByClaim.set(check.claimId, list);
  }

  const gradeOf = (claim: EffectClaim): EvidenceGrade => {
    const claimChecks = checksByClaim.get(claim.claimId) ?? [];
    // Freshness + nonce binding first: recycled or stale evidence is not evidence.
    const live = claimChecks.filter((check) => {
      if (check.nonce !== expectation.freshnessNonce) {
        failClosed(finding('warn', 'EVIDENCE_NONCE_MISMATCH',
          `check '${check.checkId}' was minted for a different verification act (nonce mismatch)`, claim.claimId));
        return false;
      }
      if (nowMs - check.observedAtMs > expectation.maxAgeMs) {
        failClosed(finding('warn', 'STALE_EVIDENCE',
          `check '${check.checkId}' is older than maxAgeMs (${expectation.maxAgeMs}ms)`, claim.claimId));
        return false;
      }
      if (FRESHNESS_BOUND_KINDS.has(check.kind) && check.nonce !== expectation.freshnessNonce) {
        return false;
      }
      return true;
    });
    // Contradiction: any live check that fails rejects with named evidence.
    for (const check of live) {
      if (!check.passed) {
        reject(finding('reject', 'EVIDENCE_CONTRADICTED',
          `check '${check.checkId}' (${check.kind}) contradicts claim '${claim.claimId}': ${check.detail ?? 'no detail'}`, claim.claimId));
      }
    }
    if (live.length === 0) return 'none';
    let best: EvidenceGrade = 'none';
    for (const check of live) {
      if (GRADE_ORDER[check.grade] > GRADE_ORDER[best]) best = check.grade;
    }
    return best;
  };

  const noOp = result.claimed.length === 0 && expectation.expected.length === 0;
  if (noOp && !expectation.allowEmpty) {
    failClosed(finding('reject', 'NOTHING_TO_VERIFY',
      'no claims expected and none made; a no-op verifies only when the expectation explicitly allows it'));
  }

  for (const claim of result.claimed) {
    const grade = gradeOf(claim);
    gradeFloor = minGrade(gradeFloor, grade);
    if (grade === 'none') {
      failClosed(finding('reject', 'NO_EVIDENCE',
        `claim '${claim.claimId}' has no live evidence bound to this verification act`, claim.claimId));
    } else if (GRADE_ORDER[grade] < GRADE_ORDER[VERIFIED_GRADE_FLOOR]) {
      failClosed(finding('reject', grade === 'asserted' ? 'SELF_ASSERTED_CLAIM' : 'GRADE_BELOW_FLOOR',
        grade === 'asserted'
          ? `claim '${claim.claimId}' is self-asserted only (e.g. a bare success flag): assertion is not evidence`
          : `claim '${claim.claimId}' best grade '${grade}' is below the '${VERIFIED_GRADE_FLOOR}' floor required for VERIFIED`,
        claim.claimId));
    }
  }
  // Expected-but-unclaimed claims also drag the floor down.
  for (const expected of expectation.expected) {
    if (!claimedById.has(expected.claimId)) gradeFloor = minGrade(gradeFloor, 'none');
  }

  function finish(): Verification {
    const certifiedConfidence = outcome === 'VERIFIED' ? GRADE_CONFIDENCE_CAP[gradeFloor] : 0;
    return {
      outcome,
      gradeFloor,
      certifiedConfidence,
      findings,
      autonomousMutationAllowed: outcome === 'VERIFIED',
      toolCallId: result.toolCallId,
      verifiedAtMs: nowMs,
    };
  }
  return finish();
}
