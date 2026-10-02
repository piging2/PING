/**
 * Verifier tests — writer-authored fail-before suite (swarm-16, P-20260923-094)
 *
 * Each case encodes one wave invariant: ACK!=EFFECT, RESULT!=VERIFIED
 * OUTCOME, RETRY!=IDEMPOTENCY. Run: npx jest --config src/tenanos/jest.config.cjs
 */
import { describe, expect, test } from '@jest/globals';
import { verifyToolResult } from '../verification/verifier';
import { schemaMatchEvidence, hashRecomputeEvidence, requeryEvidence } from '../verification/evidence';
import type { RequeryInput } from '../verification/evidence';
import type { ToolResult, VerificationExpectation, EvidenceCheck } from '../verification/types';

const NOW = 1_750_000_000_000;
const NONCE = 'fresh-nonce-001';

function expectation(over: Partial<VerificationExpectation> = {}): VerificationExpectation {
  return {
    toolCallId: 'call-1',
    expected: [{ claimId: 'c1', effectKind: 'row-inserted', description: 'inserted assignment row' }],
    freshnessNonce: NONCE,
    maxAgeMs: 60_000,
    ...over,
  };
}

function result(over: Partial<ToolResult> = {}): ToolResult {
  return {
    toolCallId: 'call-1',
    ack: 'ok',
    claimed: [{ claimId: 'c1', effectKind: 'row-inserted', description: 'inserted assignment row' }],
    rawPayload: { success: true },
    sideEffectSemantics: 'known',
    ...over,
  };
}

function journalCheck(over: Partial<RequeryInput<{ seq: number }>> = {}): EvidenceCheck {
  return requeryEvidence({
    checkId: 'chk-1',
    claimId: 'c1',
    kind: 'journal-readback',
    nonce: NONCE,
    observedAtMs: NOW - 1_000,
    read: () => ({ seq: 42 }),
    matches: (v) => v.seq === 42,
    describe: (v) => `journal seq ${v.seq}`,
    ...over,
  });
}

describe('verifier: the headline invariant', () => {
  test('a bare success:true with no evidence is UNVERIFIED, never VERIFIED', () => {
    // This is the exact pattern found live in-repo (raw-boolean-true.txt):
    // `return { success: true }` reported as the outcome.
    const v = verifyToolResult(result(), expectation(), [], NOW);
    expect(v.outcome).toBe('UNVERIFIED');
    expect(v.autonomousMutationAllowed).toBe(false);
    expect(v.certifiedConfidence).toBe(0);
    expect(v.findings.some((f) => f.code === 'NO_EVIDENCE')).toBe(true);
  });

  test('self-asserted evidence alone cannot verify', () => {
    const asserted: EvidenceCheck = {
      checkId: 'chk-self',
      claimId: 'c1',
      kind: 'schema-match',
      grade: 'asserted', // the tool quoting itself
      passed: true,
      observedAtMs: NOW - 1_000,
      nonce: NONCE,
    };
    const v = verifyToolResult(result(), expectation(), [asserted], NOW);
    expect(v.outcome).toBe('UNVERIFIED');
    expect(v.findings.some((f) => f.code === 'SELF_ASSERTED_CLAIM')).toBe(true);
  });
});

describe('verifier: fail-closed gates', () => {
  test('unknown side-effect semantics fail closed', () => {
    const v = verifyToolResult(
      result({ sideEffectSemantics: 'unknown' }),
      expectation(),
      [journalCheck()],
      NOW,
    );
    expect(v.outcome).toBe('UNVERIFIED');
    expect(v.autonomousMutationAllowed).toBe(false);
    expect(v.findings.some((f) => f.code === 'SIDE_EFFECT_UNKNOWN')).toBe(true);
  });

  test('non-ok ack means there is nothing to verify', () => {
    const v = verifyToolResult(result({ ack: 'timeout' }), expectation(), [journalCheck()], NOW);
    expect(v.outcome).toBe('UNVERIFIED');
    expect(v.findings.some((f) => f.code === 'ACK_NOT_OK')).toBe(true);
  });

  test('unexpected (unauthorized) claims fail closed', () => {
    const r = result({
      claimed: [
        { claimId: 'c1', effectKind: 'row-inserted', description: 'inserted assignment row' },
        { claimId: 'c-evil', effectKind: 'file-deleted', description: 'deleted something extra' },
      ],
    });
    const v = verifyToolResult(r, expectation(), [journalCheck()], NOW);
    expect(v.outcome).toBe('UNVERIFIED');
    expect(v.findings.some((f) => f.code === 'UNEXPECTED_CLAIM')).toBe(true);
  });

  test('missing expected claim fails closed', () => {
    const v = verifyToolResult(result({ claimed: [] }), expectation(), [], NOW);
    expect(v.outcome).toBe('UNVERIFIED');
    expect(v.findings.some((f) => f.code === 'EXPECTATION_UNMET')).toBe(true);
  });

  test('stale evidence is not evidence', () => {
    const stale = journalCheck({ observedAtMs: NOW - 120_000 });
    const v = verifyToolResult(result(), expectation(), [stale], NOW);
    expect(v.outcome).toBe('UNVERIFIED');
    expect(v.findings.some((f) => f.code === 'STALE_EVIDENCE')).toBe(true);
  });

  test('recycled evidence from a previous verification act is rejected', () => {
    const recycled = journalCheck({ nonce: 'old-nonce-999' });
    const v = verifyToolResult(result(), expectation(), [recycled], NOW);
    expect(v.outcome).toBe('UNVERIFIED');
    expect(v.findings.some((f) => f.code === 'EVIDENCE_NONCE_MISMATCH')).toBe(true);
  });

  test('contradicted evidence REJECTS with the missing evidence named', () => {
    const contradicted = journalCheck({
      read: () => null, // journal does not carry the effect
    });
    const v = verifyToolResult(result(), expectation(), [contradicted], NOW);
    expect(v.outcome).toBe('REJECTED');
    expect(v.findings.some((f) => f.code === 'EVIDENCE_CONTRADICTED')).toBe(true);
  });

  test('expectation/result toolCallId mismatch rejects', () => {
    const v = verifyToolResult(result(), expectation({ toolCallId: 'call-2' }), [journalCheck()], NOW);
    expect(v.outcome).toBe('REJECTED');
    expect(v.findings.some((f) => f.code === 'EXPECTATION_MISMATCH')).toBe(true);
  });
});

describe('verifier: the verified path', () => {
  test('fresh journal read-back on every claim VERIFIES and permits mutation', () => {
    const v = verifyToolResult(result(), expectation(), [journalCheck()], NOW);
    expect(v.outcome).toBe('VERIFIED');
    expect(v.autonomousMutationAllowed).toBe(true);
    expect(v.gradeFloor).toBe('attested');
    expect(v.certifiedConfidence).toBe(1.0);
  });

  test('confidence is capped by the weakest evidence grade', () => {
    const observed = schemaMatchEvidence({
      checkId: 'chk-obs',
      claimId: 'c1',
      nonce: NONCE,
      observedAtMs: NOW - 1_000,
      payload: { rowId: 'r1' },
      schema: { rowId: 'string' },
    });
    const v = verifyToolResult(result(), expectation(), [observed], NOW);
    expect(v.outcome).toBe('VERIFIED');
    expect(v.gradeFloor).toBe('observed');
    expect(v.certifiedConfidence).toBe(0.6); // ceiling, not a guess
  });

  test('no-op verifies only when explicitly allowed', () => {
    const empty = result({ claimed: [] });
    const strict = verifyToolResult(empty, expectation({ expected: [] }), [], NOW);
    expect(strict.outcome).toBe('UNVERIFIED');
    const allowed = verifyToolResult(empty, expectation({ expected: [], allowEmpty: true }), [], NOW);
    expect(allowed.outcome).toBe('VERIFIED');
  });
});