import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BindingVerifier,
  walkCausation,
  recomputeEvidenceHash,
  type GraphLike,
  type PresentationBinding,
} from '../src/binding-verifier.js';

function makeGraph(): GraphLike {
  const sources = new Map([
    ['src-1', { id: 'src-1', uri: 'https://example.com/services', observedAt: '2026-09-21T00:00:00Z' }],
  ]);
  const observations = new Map([
    ['obs-1', { id: 'obs-1', sourceId: 'src-1', text: 'Drain cleaning listed', namespace: 'core::demo' }],
  ]);
  const canon = '{"service":"drain-cleaning"}';
  const evidence = new Map([
    [
      'ev-1',
      {
        id: 'ev-1',
        observationId: 'obs-1',
        canonicalBytes: canon,
        evidenceHash: recomputeEvidenceHash(canon),
        namespace: 'core::demo',
        provenance: 0.9,
        causationId: 'obs-1',
        confidenceSource: 'direct' as const,
      },
    ],
  ]);
  const claims = new Map([
    [
      'claim-1',
      {
        id: 'claim-1',
        text: 'Business offers drain cleaning',
        evidenceId: 'ev-1',
        confidence: 0.9,
        causationId: 'ev-1',
        confidenceSource: 'derived' as const,
        namespace: 'core::demo',
      },
    ],
  ]);
  return { sources, observations, evidence, claims };
}

const B = (claimId: string, id = 'bind-1', slot = 'services'): PresentationBinding => ({ id, claimId, slot });

describe('C3: verifyPresentationBinding (fail closed)', () => {
  it('fully traceable binding -> VERIFIED', () => {
    const v = new BindingVerifier();
    const r = v.verify(B('claim-1'), makeGraph());
    assert.equal(r.verified, true);
    assert.equal(r.reason, null);
    assert.deepEqual(r.checks, { claim: true, evidenceHash: true, observation: true, source: true, namespace: true });
  });

  it('tampered claim (evidence hash mismatch) -> FAIL CLOSED', () => {
    const g = makeGraph();
    g.evidence.get('ev-1')!.canonicalBytes = '{"service":"SEWER-LINE-REPLACEMENT"}'; // attacker edit
    const r = new BindingVerifier().verify(B('claim-1'), g);
    assert.equal(r.verified, false);
    assert.match(r.reason!, /tampered_evidence/);
    assert.equal(r.checks.evidenceHash, false);
  });

  it('deleted evidence -> UNVERIFIED (never healthy)', () => {
    const g = makeGraph();
    g.evidence.delete('ev-1');
    const r = new BindingVerifier().verify(B('claim-1'), g);
    assert.equal(r.verified, false);
    assert.equal(r.reason, 'missing_evidence');
  });

  it('missing claim -> UNVERIFIED', () => {
    const r = new BindingVerifier().verify(B('claim-nope'), makeGraph());
    assert.equal(r.verified, false);
    assert.equal(r.reason, 'missing_claim');
  });

  it('missing observation / source -> UNVERIFIED', () => {
    const g1 = makeGraph();
    g1.observations.delete('obs-1');
    assert.equal(new BindingVerifier().verify(B('claim-1'), g1).reason, 'missing_observation');
    const g2 = makeGraph();
    g2.sources.delete('src-1');
    assert.equal(new BindingVerifier().verify(B('claim-1'), g2).reason, 'missing_source');
  });

  it('namespace mismatch (claim vs evidence) -> UNVERIFIED', () => {
    const g = makeGraph();
    g.claims.get('claim-1')!.namespace = 'tenant::other';
    const r = new BindingVerifier().verify(B('claim-1'), g);
    assert.equal(r.verified, false);
    assert.equal(r.reason, 'namespace_mismatch');
  });

  it('rejected evidence -> UNVERIFIED (fail closed, not down-ranked)', () => {
    const g = makeGraph();
    g.evidence.get('ev-1')!.rejected = true;
    const r = new BindingVerifier().verify(B('claim-1'), g);
    assert.equal(r.verified, false);
    assert.equal(r.reason, 'evidence_rejected');
  });

  it('unsupported binding shape -> UNVERIFIED', () => {
    const r = new BindingVerifier().verify({} as PresentationBinding, makeGraph());
    assert.equal(r.verified, false);
    assert.match(r.reason!, /unsupported_binding/);
  });

  it('evidence without hashable bytes -> UNVERIFIED', () => {
    const g = makeGraph();
    (g.evidence.get('ev-1') as { canonicalBytes?: unknown }).canonicalBytes = undefined;
    const r = new BindingVerifier().verify(B('claim-1'), g);
    assert.equal(r.verified, false);
    assert.match(r.reason!, /unsupported_evidence/);
  });
});

describe('C3: verifyAll — accumulate, verify, rank, DROP unverifiable', () => {
  it('mixed bindings: verified are ranked, unverifiable are dropped with reasons', () => {
    const g = makeGraph();
    const v = new BindingVerifier();
    v.accumulate([B('claim-1', 'bind-ok'), B('claim-nope', 'bind-bad')]);
    const { verified, rejected } = v.verifyAll(g);
    assert.equal(verified.length, 1);
    assert.equal(verified[0].binding.id, 'bind-ok');
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].verdict.reason, 'missing_claim');
  });

  it('null confidence ranks at 0.5 — never above an explicit assessment', () => {
    const g = makeGraph();
    const canon2 = '{"service":"x"}';
    g.evidence.set('ev-2', {
      id: 'ev-2', observationId: 'obs-1', canonicalBytes: canon2,
      evidenceHash: recomputeEvidenceHash(canon2), provenance: 1.0,
      causationId: 'obs-1', confidenceSource: 'derived',
    });
    g.claims.set('claim-2', {
      id: 'claim-2', text: 'unassessed claim', evidenceId: 'ev-2',
      confidence: null, causationId: 'ev-2', confidenceSource: 'derived',
    });
    const v = new BindingVerifier();
    v.accumulate([B('claim-1', 'b1'), B('claim-2', 'b2')]);
    const { verified } = v.verifyAll(g);
    // claim-1: 0.9 x 0.9 = 0.81; claim-2: 0.5 x 1.0 = 0.50 -> claim-1 first
    assert.equal(verified[0].binding.id, 'b1');
    assert.equal(verified[1].binding.id, 'b2');
    assert.ok(verified[1].rankScore < verified[0].rankScore);
  });
});

describe('C6: causation chain walk (WHY THIS)', () => {
  it('intact chain walks claim -> evidence -> observation -> source', () => {
    const r = walkCausation('claim-1', makeGraph());
    assert.equal(r.complete, true);
    assert.deepEqual((r as { chain: unknown }).chain, {
      claim: 'claim-1', evidence: 'ev-1', observation: 'obs-1', source: 'src-1',
    });
  });

  it('derived claim carries causation_id + confidence_source', () => {
    const claim = makeGraph().claims.get('claim-1')!;
    assert.equal(claim.causationId, 'ev-1');
    assert.equal(claim.confidenceSource, 'derived');
    const ev = makeGraph().evidence.get('ev-1')!;
    assert.equal(ev.causationId, 'obs-1');
    assert.equal(ev.confidenceSource, 'direct');
  });

  it('dropped evidence -> chain reported BROKEN, never silently intact', () => {
    const g = makeGraph();
    g.evidence.delete('ev-1');
    const r = walkCausation('claim-1', g);
    assert.equal(r.complete, false);
    assert.equal((r as { brokenAt: string }).brokenAt, 'evidence');
  });
});
