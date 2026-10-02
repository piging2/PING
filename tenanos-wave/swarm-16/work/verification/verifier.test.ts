/**
 * Verifier tests — writer-authored fail-before suite (swarm-16, P-20260923-089)
 *
 * Each case encodes one wave invariant: ACK!=EFFECT, RESULT!=VERIFIED
 * OUTCOME, RETRY!=IDEMPOTENCY. Run: node --experimental-strip-types --test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyToolResult } from './verifier.ts';
import { schemaMatchEvidence, hashRecomputeEvidence, requeryEvidence } from './evidence.ts';
import type { ToolResult, VerificationExpectation, EvidenceCheck } from './types.ts';

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

function journalCheck(over: Partial<EvidenceCheck> = {}): EvidenceCheck {
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
  it('a bare success:true with no evidence is UNVERIFIED, never VERIFIED', () => {
    // This is the exact pattern found live in-repo (raw-boolean-true.txt):
    // `return { success: true }` reported as the outcome.
    const v = verifyToolResult(result(), expectation(), [], NOW);
    assert.equal(v.outcome, 'UNVERIFIED');
    assert.equal(v.autonomousMutationAllowed, false);
    assert.equal(v.certifiedConfidence, 0);
    assert.ok(v.findings.some((f) => f.code === 'NO_EVIDENCE'));
  });

  it('self-asserted evidence alone cannot verify', () => {
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
    assert.equal(v.outcome, 'UNVERIFIED');
    assert.ok(v.findings.some((f) => f.code === 'SELF_ASSERTED_CLAIM'));
  });
});

describe('verifier: fail-closed gates', () => {
  it('unknown side-effect semantics fail closed', () => {
    const v = verifyToolResult(
      result({ sideEffectSemantics: 'unknown' }),
      expectation(),
      [journalCheck()],
      NOW,
    );
    assert.equal(v.outcome, 'UNVERIFIED');
    assert.equal(v.autonomousMutationAllowed, false);
    assert.ok(v.findings.some((f) => f.code === 'SIDE_EFFECT_UNKNOWN'));
  });

  it('non-ok ack means there is nothing to verify', () => {
    const v = verifyToolResult(result({ ack: 'timeout' }), expectation(), [journalCheck()], NOW);
    assert.equal(v.outcome, 'UNVERIFIED');
    assert.ok(v.findings.some((f) => f.code === 'ACK_NOT_OK'));
  });

  it('unexpected (unauthorized) claims fail closed', () => {
    const r = result({
      claimed: [
        { claimId: 'c1', effectKind: 'row-inserted', description: 'inserted assignment row' },
        { claimId: 'c-evil', effectKind: 'file-deleted', description: 'deleted something extra' },
      ],
    });
    const v = verifyToolResult(r, expectation(), [journalCheck()], NOW);
    assert.equal(v.outcome, 'UNVERIFIED');
    assert.ok(v.findings.some((f) => f.code === 'UNEXPECTED_CLAIM'));
  });

  it('missing expected claim fails closed', () => {
    const v = verifyToolResult(result({ claimed: [] }), expectation(), [], NOW);
    assert.equal(v.outcome, 'UNVERIFIED');
    assert.ok(v.findings.some((f) => f.code === 'EXPECTATION_UNMET'));
  });

  it('stale evidence is not evidence', () => {
    const stale = journalCheck({ observedAtMs: NOW - 120_000 });
    const v = verifyToolResult(result(), expectation(), [stale], NOW);
    assert.equal(v.outcome, 'UNVERIFIED');
    assert.ok(v.findings.some((f) => f.code === 'STALE_EVIDENCE'));
  });

  it('recycled evidence from a previous verification act is rejected', () => {
    const recycled = journalCheck({ nonce: 'old-nonce-999' });
    const v = verifyToolResult(result(), expectation(), [recycled], NOW);
    assert.equal(v.outcome, 'UNVERIFIED');
    assert.ok(v.findings.some((f) => f.code === 'EVIDENCE_NONCE_MISMATCH'));
  });

  it('contradicted evidence REJECTS with the missing evidence named', () => {
    const contradicted = journalCheck({
      read: () => null, // journal does not carry the effect
    });
    const v = verifyToolResult(result(), expectation(), [contradicted], NOW);
    assert.equal(v.outcome, 'REJECTED');
    assert.ok(v.findings.some((f) => f.code === 'EVIDENCE_CONTRADICTED'));
  });

  it('expectation/result toolCallId mismatch rejects', () => {
    const v = verifyToolResult(result(), expectation({ toolCallId: 'call-2' }), [journalCheck()], NOW);
    assert.equal(v.outcome, 'REJECTED');
    assert.ok(v.findings.some((f) => f.code === 'EXPECTATION_MISMATCH'));
  });
});

describe('verifier: the verified path', () => {
  it('fresh journal read-back on every claim VERIFIES and permits mutation', () => {
    const v = verifyToolResult(result(), expectation(), [journalCheck()], NOW);
    assert.equal(v.outcome, 'VERIFIED');
    assert.equal(v.autonomousMutationAllowed, true);
    assert.equal(v.gradeFloor, 'attested');
    assert.equal(v.certifiedConfidence, 1.0);
  });

  it('confidence is capped by the weakest evidence grade', () => {
    const observed = schemaMatchEvidence({
      checkId: 'chk-obs',
      claimId: 'c1',
      nonce: NONCE,
      observedAtMs: NOW - 1_000,
      payload: { rowId: 'r1' },
      schema: { rowId: 'string' },
    });
    const v = verifyToolResult(result(), expectation(), [observed], NOW);
    assert.equal(v.outcome, 'VERIFIED');
    assert.equal(v.gradeFloor, 'observed');
    assert.equal(v.certifiedConfidence, 0.6); // ceiling, not a guess
  });

  it('no-op verifies only when explicitly allowed', () => {
    const empty = result({ claimed: [] });
    const strict = verifyToolResult(empty, expectation({ expected: [] }), [], NOW);
    assert.equal(strict.outcome, 'UNVERIFIED');
    const allowed = verifyToolResult(empty, expectation({ expected: [], allowEmpty: true }), [], NOW);
    assert.equal(allowed.outcome, 'VERIFIED');
  });
});
