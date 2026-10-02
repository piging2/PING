import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attest, preconditionsFor } from '../src/attestation-gate.js';

const FULL = {
  'regen-complete': {
    approved_transition_id: 'abc123',
    rendered_sitespec_hash: 'def456',
    bindings_verified: true,
  },
  'correction-survived': {
    correction_transition_id: 't-1',
    post_regen_claim_hash: 'h-1',
    binding_verdict: 'verified',
  },
  'refresh-applied': {
    source_observation_id: 'obs-9',
    owner_policy_preserved: true,
    binding_verdict: 'verified',
  },
} as const;

describe('C4: failure-honesty gate (missing evidence NEVER becomes HEALTHY)', () => {
  for (const kind of Object.keys(FULL) as (keyof typeof FULL)[]) {
    it(`${kind}: all preconditions present -> ATTESTED, emit invoked`, () => {
      let emitted: unknown = null;
      const r = attest(kind, { ...FULL[kind] }, (a) => { emitted = a; });
      assert.equal(r.status, 'ATTESTED');
      assert.equal(r.reason, null);
      assert.ok(r.attestation);
      assert.equal(r.attestation!.kind, kind);
      assert.ok(emitted, 'emit must be invoked on success');
    });

    it(`${kind}: one missing precondition -> ATTESTATION_REJECTED, emit NEVER invoked`, () => {
      const [first] = preconditionsFor(kind);
      const evidence = { ...FULL[kind] };
      delete (evidence as Record<string, unknown>)[first];
      let emitCalls = 0;
      const r = attest(kind, evidence, () => { emitCalls++; });
      assert.equal(r.status, 'ATTESTATION_REJECTED');
      assert.match(r.reason!, new RegExp(`missing_evidence:.*${first}`));
      assert.equal(r.attestation, null);
      assert.equal(emitCalls, 0, 'no success claim may be produced');
    });

    it(`${kind}: explicit null is NOT evidence -> rejected`, () => {
      const [first] = preconditionsFor(kind);
      const evidence = { ...FULL[kind], [first]: null };
      const r = attest(kind, evidence);
      assert.equal(r.status, 'ATTESTATION_REJECTED');
      assert.match(r.reason!, /missing_evidence/);
    });
  }

  it('empty evidence object -> ATTESTATION_REJECTED naming every missing precondition', () => {
    const r = attest('regen-complete', {});
    assert.equal(r.status, 'ATTESTATION_REJECTED');
    for (const name of preconditionsFor('regen-complete')) {
      assert.match(r.reason!, new RegExp(name));
    }
  });

  it('unknown attestation kind -> throws (refuses to guess preconditions)', () => {
    assert.throws(
      () => attest('launch-missiles' as never, {}),
      /unknown attestation kind/
    );
  });

  it('rejection reason is typed and stable', () => {
    const r = attest('refresh-applied', { source_observation_id: 'x' });
    assert.equal(r.reason, 'missing_evidence:owner_policy_preserved,binding_verdict');
  });
});
