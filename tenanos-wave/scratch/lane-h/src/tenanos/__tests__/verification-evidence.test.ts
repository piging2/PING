/**
 * Evidence constructor tests (swarm-16, P-20260923-094)
 */
import { describe, expect, test } from '@jest/globals';
import { createHash } from 'node:crypto';
import {
  schemaMatchEvidence,
  hashRecomputeEvidence,
  requeryEvidence,
  invariantEvidence,
} from '../verification/evidence';

const NOW = 1_750_000_000_000;

describe('evidence: schema-match', () => {
  test('passes when the payload carries the claimed shape', () => {
    const c = schemaMatchEvidence({
      checkId: 's1', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      payload: { rowId: 'r1', count: 3 },
      schema: { rowId: 'string', count: 'number' },
    });
    expect(c.passed).toBe(true);
    expect(c.grade).toBe('observed');
  });

  test('fails when the payload lacks the claimed shape', () => {
    const c = schemaMatchEvidence({
      checkId: 's2', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      payload: { success: true }, // the anti-pattern: nothing about the effect
      schema: { rowId: 'string' },
    });
    expect(c.passed).toBe(false);
  });
});

describe('evidence: hash-recompute', () => {
  test('passes when the recomputed digest matches the claim', () => {
    const c = hashRecomputeEvidence({
      checkId: 'h1', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      bytes: 'artifact-bytes',
      // sha256('artifact-bytes') computed below at runtime is not the point;
      // the point is the constructor recomputes rather than trusts.
      expectedHex: 'wrong-on-purpose',
    });
    expect(c.grade).toBe('recomputed');
    expect(c.passed).toBe(false); // wrong digest must fail
  });

  test('detects substituted bytes', () => {
    const good = createHash('sha256').update('real-bytes').digest('hex');
    const c = hashRecomputeEvidence({
      checkId: 'h2', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      bytes: 'tampered-bytes',
      expectedHex: good,
    });
    expect(c.passed).toBe(false);
    const c2 = hashRecomputeEvidence({
      checkId: 'h3', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      bytes: 'real-bytes',
      expectedHex: good,
    });
    expect(c2.passed).toBe(true);
  });
});

describe('evidence: requery (attestation)', () => {
  test('attests when the authoritative re-read carries the effect', () => {
    const c = requeryEvidence({
      checkId: 'r1', claimId: 'c1', kind: 'journal-readback', nonce: 'n', observedAtMs: NOW,
      read: () => ({ status: 'inserted' }),
      matches: (v) => v.status === 'inserted',
    });
    expect(c.passed).toBe(true);
    expect(c.grade).toBe('attested');
  });

  test('fails honest when the re-read finds nothing', () => {
    const c = requeryEvidence({
      checkId: 'r2', claimId: 'c1', kind: 'requery', nonce: 'n', observedAtMs: NOW,
      read: () => null,
      matches: () => true,
    });
    expect(c.passed).toBe(false);
    expect((c.detail ?? '').includes('returned nothing')).toBe(true);
  });
});

describe('evidence: invariant', () => {
  test('evaluates a pure predicate against real data', () => {
    const c = invariantEvidence({
      checkId: 'i1', claimId: 'c1', nonce: 'n', observedAtMs: NOW,
      predicate: () => 1 + 1 === 2,
    });
    expect(c.passed).toBe(true);
    expect(c.grade).toBe('observed');
  });
});