/**
 * Challenge-interview tests (swarm-16, P-20260923-094)
 */
import { describe, expect, test } from '@jest/globals';
import { challengeClaims, scoreChallenge } from '../verification/interview';
import { requeryEvidence } from '../verification/evidence';
import type { ToolResult, VerificationExpectation } from '../verification/types';

const NOW = 1_750_000_000_000;
const NONCE = 'fresh-nonce-001';

function fixture() {
  const result: ToolResult = {
    toolCallId: 'call-1',
    ack: 'ok',
    claimed: [{ claimId: 'c1', effectKind: 'row-inserted', description: 'inserted assignment row' }],
    rawPayload: { success: true },
    sideEffectSemantics: 'known',
  };
  const expectation: VerificationExpectation = {
    toolCallId: 'call-1',
    expected: [{ claimId: 'c1', effectKind: 'row-inserted', description: 'inserted assignment row' }],
    freshnessNonce: NONCE,
    maxAgeMs: 60_000,
  };
  return { result, expectation };
}

describe('interview: challenge generation', () => {
  test('interrogates claims that carry no live evidence', () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    expect(qs.length).toBe(1);
    expect(qs[0].claimId).toBe('c1');
    expect(qs[0].blocking).toBe(true);
    expect(qs[0].prompt.includes('no live evidence')).toBe(true);
  });

  test('does not interrogate claims already backed by sufficient evidence', () => {
    const { result, expectation } = fixture();
    const checks = [
      requeryEvidence({
        checkId: 'chk-1', claimId: 'c1', kind: 'journal-readback',
        nonce: NONCE, observedAtMs: NOW - 1_000,
        read: () => ({ seq: 7 }),
        matches: (v) => v.seq === 7,
      }),
    ];
    const qs = challengeClaims(result, expectation, checks, NOW);
    expect(qs.length).toBe(0);
  });

  test('asks about expected-but-unclaimed effects', () => {
    const { result, expectation } = fixture();
    result.claimed = [];
    const qs = challengeClaims(result, expectation, [], NOW);
    expect(qs.some((q) => q.questionId === 'probe-missing-c1')).toBe(true);
  });
});

describe('interview: challenge scoring', () => {
  test("'unsure' fails closed, exactly like the interview engine's Not sure", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([{ questionId: qs[0].questionId, answer: 'unsure' }], qs);
    expect(s.canVerify).toBe(false);
    expect(s.findings.some((f) => f.code === 'CHALLENGE_INCONCLUSIVE')).toBe(true);
  });

  test("'unknown' fails closed too", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([{ questionId: qs[0].questionId, answer: 'unknown' }], qs);
    expect(s.canVerify).toBe(false);
  });

  test("'refuted' is a contradiction signal", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([{ questionId: qs[0].questionId, answer: 'refuted' }], qs);
    expect(s.canVerify).toBe(false);
    expect(s.findings.some((f) => f.code === 'CHALLENGE_REFUTED')).toBe(true);
  });

  test("unanswered blocking probes fail closed", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([], qs);
    expect(s.canVerify).toBe(false);
    expect(s.findings.some((f) => f.code === 'PROBE_UNANSWERED')).toBe(true);
  });

  test("'confirmed' without an evidence reference is still not verification", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([{ questionId: qs[0].questionId, answer: 'confirmed' }], qs);
    expect(s.canVerify).toBe(false);
    expect(s.findings.some((f) => f.code === 'CONFIRMATION_WITHOUT_EVIDENCE')).toBe(true);
  });

  test("'confirmed' with an evidence reference clears the probe", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge(
      [{ questionId: qs[0].questionId, answer: 'confirmed', evidenceRef: 'journal seq 42' }],
      qs,
    );
    expect(s.canVerify).toBe(true);
    expect(s.findings.length).toBe(0);
  });
});