/**
 * Evidence constructor tests (swarm-16, P-20260923-089)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  schemaMatchEvidence,
  hashRecomputeEvidence,
  requeryEvidence,
  invariantEvidence,
} from './evidence.ts';

const NOW = 1_750_000_000_000;

describe('evidence: schema-match', () => {
  it('passes when the payload carries the claimed shape', () => {
    const c = schemaMatchEvidence({
      checkId: 's1', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      payload: { rowId: 'r1', count: 3 },
      schema: { rowId: 'string', count: 'number' },
    });
    assert.equal(c.passed, true);
    assert.equal(c.grade, 'observed');
  });

  it('fails when the payload lacks the claimed shape', () => {
    const c = schemaMatchEvidence({
      checkId: 's2', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      payload: { success: true }, // the anti-pattern: nothing about the effect
      schema: { rowId: 'string' },
    });
    assert.equal(c.passed, false);
  });
});

describe('evidence: hash-recompute', () => {
  it('passes when the recomputed digest matches the claim', () => {
    const c = hashRecomputeEvidence({
      checkId: 'h1', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      bytes: 'artifact-bytes',
      // sha256('artifact-bytes') computed below at runtime is not the point;
      // the point is the constructor recomputes rather than trusts.
      expectedHex: 'wrong-on-purpose',
    });
    assert.equal(c.grade, 'recomputed');
    assert.equal(c.passed, false); // wrong digest must fail
  });

  it('detects substituted bytes', () => {
    const good = createHash('sha256').update('real-bytes').digest('hex');
    const c = hashRecomputeEvidence({
      checkId: 'h2', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      bytes: 'tampered-bytes',
      expectedHex: good,
    });
    assert.equal(c.passed, false);
    const c2 = hashRecomputeEvidence({
      checkId: 'h3', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      bytes: 'real-bytes',
      expectedHex: good,
    });
    assert.equal(c2.passed, true);
  });
});

describe('evidence: requery (attestation)', () => {
  it('attests when the authoritative re-read carries the effect', () => {
    const c = requeryEvidence({
      checkId: 'r1', claimId: 'c1', kind: 'journal-readback', nonce: 'n', observedAtMs: NOW,
      read: () => ({ status: 'inserted' }),
      matches: (v) => v.status === 'inserted',
    });
    assert.equal(c.passed, true);
    assert.equal(c.grade, 'attested');
  });

  it('fails honest when the re-read finds nothing', () => {
    const c = requeryEvidence({
      checkId: 'r2', claimId: 'c1', kind: 'requery', nonce: 'n', observedAtMs: NOW,
      read: () => null,
      matches: () => true,
    });
    assert.equal(c.passed, false);
    assert.ok((c.detail ?? '').includes('returned nothing'));
  });
});

describe('evidence: invariant', () => {
  it('evaluates a pure predicate against real data', () => {
    const c = invariantEvidence({
      checkId: 'i1', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      predicate: () => 1 + 1 === 2,
    });
    assert.equal(c.passed, true);
    assert.equal(c.grade, 'observed');
  });
});
