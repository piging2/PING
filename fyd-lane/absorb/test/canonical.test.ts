import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalize, canonicalBytes } from '../src/canonical.js';

describe('canonical serializer (C1 foundation, Patch-7B pattern)', () => {
  it('key-order permutation -> identical canonical bytes', () => {
    const a = { stage: 'APPROVED', object_id: 'obj-1', z: 1, a: 2 };
    const b = { a: 2, z: 1, object_id: 'obj-1', stage: 'APPROVED' };
    assert.equal(canonicalBytes(a), canonicalBytes(b));
  });

  it('nested key-order permutation -> identical canonical bytes', () => {
    const a = { outer: { b: 1, a: [3, { y: 1, x: 2 }, 1] }, k: 'v' };
    const b = { k: 'v', outer: { a: [3, { x: 2, y: 1 }, 1], b: 1 } };
    assert.equal(canonicalBytes(a), canonicalBytes(b));
  });

  it('array order is semantic: reordered array -> different bytes', () => {
    assert.notEqual(canonicalBytes({ items: [1, 2, 3] }), canonicalBytes({ items: [3, 2, 1] }));
  });

  it('undefined normalizes to null (PING 7B rule)', () => {
    assert.deepEqual(canonicalize({ a: undefined }), { a: null });
    assert.equal(canonicalBytes({ a: undefined }), canonicalBytes({ a: null }));
  });

  it('semantic difference -> different bytes', () => {
    assert.notEqual(canonicalBytes({ a: 1 }), canonicalBytes({ a: 2 }));
  });

  it('refuses to guess bytes for non-deterministic types (fail closed)', () => {
    assert.throws(() => canonicalize({ f: () => 1 }), /unsupported type/);
    assert.throws(() => canonicalize({ b: 10n }), /unsupported type/);
    assert.throws(() => canonicalize({ n: Infinity }), /non-finite/);
    assert.throws(() => canonicalize(Symbol('x')), /unsupported type/);
  });
});
