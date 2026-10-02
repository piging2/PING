import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fydTransitionId, TransitionJournal, FYD_GENERATOR_VERSION } from '../src/transition-id.js';

const T = (over: Record<string, unknown> = {}) => ({
  stage: 'APPROVED',
  objectId: 'obj-42',
  ownerId: 'owner-7',
  logicalPayload: { field: 'services', op: 'hide', target: 'svc-3' },
  ...over,
});

describe('C1: fydTransitionId', () => {
  it('key-order permutation of logicalPayload -> identical hash', () => {
    const a = T({ logicalPayload: { op: 'hide', target: 'svc-3', field: 'services' } });
    const b = T({ logicalPayload: { field: 'services', target: 'svc-3', op: 'hide' } });
    assert.equal(fydTransitionId(a), fydTransitionId(b));
  });

  it('same logical transition hashes identically across calls (process boundary)', () => {
    assert.equal(fydTransitionId(T()), fydTransitionId(T()));
  });

  it('sha256 hex domain', () => {
    assert.match(fydTransitionId(T()), /^[a-f0-9]{64}$/);
  });

  it('different stage -> different id', () => {
    assert.notEqual(fydTransitionId(T()), fydTransitionId(T({ stage: 'PROPOSED' })));
  });

  it('different object -> different id', () => {
    assert.notEqual(fydTransitionId(T()), fydTransitionId(T({ objectId: 'obj-43' })));
  });

  it('generator version is bound into the identity', () => {
    const idV1 = fydTransitionId(T(), '0.1.0');
    const idV2 = fydTransitionId(T(), '0.2.0');
    assert.notEqual(idV1, idV2);
    assert.equal(fydTransitionId(T()), idV1, 'default binds FYD_GENERATOR_VERSION');
    assert.equal(FYD_GENERATOR_VERSION, '0.1.0');
  });
});

describe('C1: TransitionJournal idempotent append', () => {
  it('double emit -> second is dedup, state unchanged', () => {
    const j = new TransitionJournal();
    const first = j.append(T());
    assert.equal(first.status, 'persisted');
    const before = j.size;
    const second = j.append(T());
    assert.equal(second.status, 'deduped');
    assert.equal(second.id, first.id);
    assert.equal(j.size, before, 'state unchanged by duplicate emit');
    assert.ok(j.has(first.id));
  });

  it('distinct transitions persist independently', () => {
    const j = new TransitionJournal();
    j.append(T());
    j.append(T({ stage: 'ACCEPTED' }));
    assert.equal(j.size, 2);
  });

  it('key-order-permuted payload dedups against the original', () => {
    const j = new TransitionJournal();
    j.append(T({ logicalPayload: { a: 1, b: 2 } }));
    const r = j.append(T({ logicalPayload: { b: 2, a: 1 } }));
    assert.equal(r.status, 'deduped');
    assert.equal(j.size, 1);
  });
});
