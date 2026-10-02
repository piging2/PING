/**
 * Challenge-interview tests (swarm-16, P-20260923-089)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { challengeClaims, scoreChallenge } from './interview.ts';
import { requeryEvidence } from './evidence.ts';
import type { ToolResult, VerificationExpectation } from './types.ts';

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
  it('interrogates claims that carry no live evidence', () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    assert.equal(qs.length, 1);
    assert.equal(qs[0].claimId, 'c1');
    assert.equal(qs[0].blocking, true);
    assert.ok(qs[0].prompt.includes('no live evidence'));
  });

  it('does not interrogate claims already backed by sufficient evidence', () => {
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
    assert.equal(qs.length, 0);
  });

  it('asks about expected-but-unclaimed effects', () => {
    const { result, expectation } = fixture();
    result.claimed = [];
    const qs = challengeClaims(result, expectation, [], NOW);
    assert.ok(qs.some((q) => q.questionId === 'probe-missing-c1'));
  });
});

describe('interview: challenge scoring', () => {
  it("'unsure' fails closed, exactly like the interview engine's Not sure", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([{ questionId: qs[0].questionId, answer: 'unsure' }], qs);
    assert.equal(s.canVerify, false);
    assert.ok(s.findings.some((f) => f.code === 'CHALLENGE_INCONCLUSIVE'));
  });

  it("'unknown' fails closed too", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([{ questionId: qs[0].questionId, answer: 'unknown' }], qs);
    assert.equal(s.canVerify, false);
  });

  it("'refuted' is a contradiction signal", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([{ questionId: qs[0].questionId, answer: 'refuted' }], qs);
    assert.equal(s.canVerify, false);
    assert.ok(s.findings.some((f) => f.code === 'CHALLENGE_REFUTED'));
  });

  it("unanswered blocking probes fail closed", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([], qs);
    assert.equal(s.canVerify, false);
    assert.ok(s.findings.some((f) => f.code === 'PROBE_UNANSWERED'));
  });

  it("'confirmed' without an evidence reference is still not verification", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge([{ questionId: qs[0].questionId, answer: 'confirmed' }], qs);
    assert.equal(s.canVerify, false);
    assert.ok(s.findings.some((f) => f.code === 'CONFIRMATION_WITHOUT_EVIDENCE'));
  });

  it("'confirmed' with an evidence reference clears the probe", () => {
    const { result, expectation } = fixture();
    const qs = challengeClaims(result, expectation, [], NOW);
    const s = scoreChallenge(
      [{ questionId: qs[0].questionId, answer: 'confirmed', evidenceRef: 'journal seq 42' }],
      qs,
    );
    assert.equal(s.canVerify, true);
    assert.equal(s.findings.length, 0);
  });
});
