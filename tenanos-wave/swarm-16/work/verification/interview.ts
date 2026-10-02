/**
 * TenantOS Verification Engine — challenge interview (swarm-16, P-20260923-089)
 *
 * The RESULT -> VERIFICATION step is an interrogation, not a formality.
 * challengeClaims() turns unevidenced or weakly-evidenced claims into
 * probing questions the autonomous loop must answer before acceptance —
 * the substrate generalization of the interview-engine pattern harvested
 * from PING (confidence gating: "Not sure" -> null -> cannot proceed).
 *
 * scoreChallenge() is the gate: any blocking question answered anything
 * other than 'confirmed' fails closed (cannot verify); a 'refuted' answer
 * is evidence of contradiction and should drive REJECTED downstream.
 */
import { GRADE_ORDER, VERIFIED_GRADE_FLOOR } from './types.ts';
import type {
  EvidenceCheck,
  EvidenceCheckKind,
  ToolResult,
  VerificationExpectation,
  VerificationFinding,
} from './types.ts';

export interface ProbeQuestion {
  questionId: string;
  claimId: string;
  prompt: string;
  /** evidence kinds that would satisfy this probe */
  requiredEvidenceKinds: EvidenceCheckKind[];
  /** a blocking probe must be answered 'confirmed' or the result cannot verify */
  blocking: boolean;
}

export type ChallengeAnswerValue = 'confirmed' | 'unsure' | 'unknown' | 'refuted';

export interface ChallengeAnswer {
  questionId: string;
  answer: ChallengeAnswerValue;
  /** reference to the evidence that confirms it, when answer is 'confirmed' */
  evidenceRef?: string;
}

export interface ChallengeScore {
  canVerify: boolean;
  findings: VerificationFinding[];
}

const PROBE_KINDS: Record<string, EvidenceCheckKind[]> = {
  'file-written': ['hash-recompute', 'requery'],
  'row-inserted': ['requery', 'journal-readback'],
  'row-updated': ['requery', 'journal-readback'],
  'message-sent': ['requery', 'journal-readback'],
  'record-created': ['requery', 'journal-readback'],
};

/**
 * Generate one probing question per claim that lacks live, grade-sufficient
 * evidence for this verification act. Claims already backed by fresh
 * evidence at/above the floor are not interrogated.
 */
export function challengeClaims(
  result: ToolResult,
  expectation: VerificationExpectation,
  checks: EvidenceCheck[],
  nowMs: number,
): ProbeQuestion[] {
  const questions: ProbeQuestion[] = [];
  for (const claim of result.claimed) {
    const live = checks.filter(
      (c) =>
        c.claimId === claim.claimId &&
        c.nonce === expectation.freshnessNonce &&
        nowMs - c.observedAtMs <= expectation.maxAgeMs &&
        c.passed,
    );
    const best = live.reduce(
      (acc, c) => (GRADE_ORDER[c.grade] > GRADE_ORDER[acc] ? c.grade : acc),
      'none' as const,
    );
    if (GRADE_ORDER[best] >= GRADE_ORDER[VERIFIED_GRADE_FLOOR]) continue;
    const kinds = PROBE_KINDS[claim.effectKind] ?? ['requery', 'invariant', 'schema-match'];
    questions.push({
      questionId: `probe-${claim.claimId}`,
      claimId: claim.claimId,
      prompt:
        `The result claims '${claim.description}' (${claim.effectKind}) but carries ` +
        `${live.length === 0 ? 'no live evidence' : `only '${best}'-grade evidence`} bound to this verification. ` +
        `Which authoritative record carries the effect, and what did the re-read return?`,
      requiredEvidenceKinds: kinds,
      blocking: true,
    });
  }
  // Expected-but-unclaimed: the loop must explain the absence.
  const claimedIds = new Set(result.claimed.map((c) => c.claimId));
  for (const expected of expectation.expected) {
    if (!claimedIds.has(expected.claimId)) {
      questions.push({
        questionId: `probe-missing-${expected.claimId}`,
        claimId: expected.claimId,
        prompt:
          `The loop expected '${expected.description}' but the result does not claim it. ` +
          `Did the effect happen and go unreported, or did it not happen?`,
        requiredEvidenceKinds: ['requery', 'journal-readback'],
        blocking: true,
      });
    }
  }
  return questions;
}

/**
 * Score the loop's answers. Fail-closed: 'unsure' and 'unknown' are the
 * interview engine's "Not sure" — they null out the claim, they never
 * promote it. Only 'confirmed' with an evidence reference clears a probe.
 */
export function scoreChallenge(
  answers: ChallengeAnswer[],
  questions: ProbeQuestion[],
): ChallengeScore {
  const findings: VerificationFinding[] = [];
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  let canVerify = true;

  for (const q of questions) {
    const answer = byId.get(q.questionId);
    if (answer === undefined) {
      canVerify = false;
      findings.push({
        severity: 'reject',
        code: 'PROBE_UNANSWERED',
        message: `blocking probe '${q.questionId}' was not answered`,
        claimId: q.claimId,
      });
      continue;
    }
    if (answer.answer === 'refuted') {
      canVerify = false;
      findings.push({
        severity: 'reject',
        code: 'CHALLENGE_REFUTED',
        message: `probe '${q.questionId}' was refuted: the claim does not hold`,
        claimId: q.claimId,
      });
      continue;
    }
    if (answer.answer === 'unsure' || answer.answer === 'unknown') {
      canVerify = false;
      findings.push({
        severity: 'reject',
        code: 'CHALLENGE_INCONCLUSIVE',
        message: `probe '${q.questionId}' answered '${answer.answer}': inconclusive is not confirmation`,
        claimId: q.claimId,
      });
      continue;
    }
    // 'confirmed'
    if (q.blocking && (answer.evidenceRef === undefined || answer.evidenceRef.length === 0)) {
      canVerify = false;
      findings.push({
        severity: 'reject',
        code: 'CONFIRMATION_WITHOUT_EVIDENCE',
        message: `probe '${q.questionId}' confirmed without an evidence reference: confirmation is not evidence`,
        claimId: q.claimId,
      });
    }
  }
  return { canVerify, findings };
}
