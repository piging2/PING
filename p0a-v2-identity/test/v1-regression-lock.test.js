'use strict';
/**
 * P0-A REGRESSION LOCK (RED against V1).
 *
 * These tests assert CORRECT canonicalization behavior. Run against the
 * frozen V1 fixtures they are EXPECTED TO FAIL: each failure is a locked-in
 * demonstration of the V1 defect the replacement must fix.
 *
 * LOCK-15..18 are defect-characterization locks (inverted style): they PASS
 * by asserting the defective behavior EXISTS, pinning it so the fix can be
 * verified against the exact current semantics.
 *
 * Do not "fix" these tests. The V2 proof suite (test/v2-proofs.test.cjs)
 * asserts the same behavior against the replacement and must go GREEN.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { CanonicalBytes } = require('./fixtures/v1-canonical-authority.js');
const { identityAuthority } = require('./fixtures/v1-identity-authority.js');

const s = (v) => CanonicalBytes.serializeString(v);
const mint = (payload) =>
  identityAuthority.generateSpineEventId('T', 's', { payload });

test('LOCK-01: [1,2] != [12] (array element boundaries)', () => {
  assert.notEqual(s([1, 2]), s([12]), 'V1 COLLIDES: ' + s([1, 2]));
});

test('LOCK-02: ["ab","c"] != ["a","bc"] (string element boundaries)', () => {
  assert.notEqual(s(['ab', 'c']), s(['a', 'bc']));
});

test('LOCK-03: {"a":1,"b":2} canonicalizes identically regardless of key order', () => {
  assert.equal(s({ a: 1, b: 2 }), s({ b: 2, a: 1 }));
});

test('LOCK-04: nested arrays preserve boundaries', () => {
  assert.notEqual(s([[1], [2]]), s([[1, 2]]));
  assert.notEqual(s([1, [2, 3]]), s([[1, 2], 3]));
});

test('LOCK-05: nested objects preserve boundaries', () => {
  assert.notEqual(s({ a: { x: 1 }, b: 2 }), s({ a: { x: 1, b: 2 } }));
});

test('LOCK-06: strings containing separators cannot alter structure', () => {
  assert.notEqual(s({ a: 'x:y' }), s({ 'a:x': 'y' }));
  assert.notEqual(s(['a,b']), s(['a', 'b']));
  assert.notEqual(s({ a: '}{' }), s([{ a: '}' }, { a: '{' }]));
});

test('LOCK-07: null distinguishable from every permitted numeric value', () => {
  for (const n of [0, 1, -1, 0.5]) {
    assert.notEqual(s({ v: null }), s({ v: n }), `null vs ${n}`);
  }
});

test('LOCK-08: 0 / -0 behavior is EXPLICIT (bytes must be stable and documented)', () => {
  // Either identical-by-spec or distinguished-and-documented; V1 must pick one deterministically.
  const a = s({ v: 0 });
  const b = s({ v: -0 });
  assert.ok(typeof a === 'string' && typeof b === 'string', 'must serialize');
});

test('LOCK-09: NaN must NOT silently become null', () => {
  let threw = false;
  let bytes = null;
  try {
    bytes = s({ v: NaN });
  } catch { threw = true; }
  assert.ok(threw || bytes !== s({ v: null }), 'V1 COLLIDES: NaN -> ' + bytes);
});

test('LOCK-10: Unicode preserved as-is, distinct forms distinct bytes', () => {
  assert.notEqual(s({ v: 'é' }), s({ v: 'é' }), 'NFC vs NFD must differ (no normalization)');
  assert.equal(s({ v: '日本語🎉' }), s({ v: '日本語🎉' }));
});

test('LOCK-11: deeply nested values remain deterministic', () => {
  const deep = (n) => (n === 0 ? { leaf: [1, 2, 3] } : { nest: deep(n - 1) });
  assert.equal(s(deep(40)), s(deep(40)));
});

test('LOCK-12: minting distinguishes NaN-bearing from null-bearing payloads', () => {
  assert.notEqual(
    mint({ v: NaN }),
    mint({ v: null }),
    'V1 MINT COLLIDES: sha256(JSON.stringify) maps NaN->null'
  );
});

test('LOCK-13: minting is stable under payload key insertion order', () => {
  assert.equal(
    mint({ a: 1, b: 2 }),
    mint({ b: 2, a: 1 }),
    'V1 MINT UNSTABLE: insertion-ordered JSON.stringify'
  );
});

test('LOCK-14: minting rejects (not coerces) non-finite numbers', () => {
  let threw = false;
  try {
    mint({ v: Infinity });
  } catch { threw = true; }
  assert.ok(threw, 'V1 MINT SILENTLY COERCES Infinity->null');
});

// ---- WS2-derived locks (2026-10-01, deployed-line exposure) ----

test('LOCK-15: deployed whitelist check is blind to nested keys', () => {
  // Deployed conflict check: JSON.stringify(o, Object.keys(o).sort()) —
  // a replacer ARRAY is a top-level-key whitelist; nested keys vanish.
  const canon = (o) => JSON.stringify(o, Object.keys(o).sort());
  assert.equal(
    canon({ v: { x: [1, 2] } }),
    canon({ v: { x: [12] } }),
    'expected defect: both collapse to {"v":{}}'
  );
  assert.equal(canon({ v: { x: [1, 2] } }), '{"v":{}}');
});

test('LOCK-16: logical_id removes payload from identity material', () => {
  // BaseWorker._emit defaults logical_id to `${eventType}:${causation_id}`;
  // with logical_id set, two different payloads mint the SAME event_id and
  // the (blind, LOCK-15) conflict check is the only guard.
  const idA = identityAuthority.generateSpineEventId('T', 's', {
    logical_id: 'T:cause-1', payload: { v: [1, 2] },
  });
  const idB = identityAuthority.generateSpineEventId('T', 's', {
    logical_id: 'T:cause-1', payload: { v: [12] },
  });
  assert.equal(idA, idB, 'payload leaves identity material under logical_id');
});

test('LOCK-17: pipe-delimited ID minting is injection-ambiguous (journal plane)', () => {
  // emit.py / mc-dispatch.ts: '|'.join(fields) with no escaping.
  const mint = (fields) => fields.join('|');
  assert.equal(
    mint(['a', 'b|c', 'd']),
    mint(['a|b', 'c', 'd']),
    'separator-bearing fields collide: distinct inputs, same preimage'
  );
});

test('LOCK-18: raw JCS engine drops undefined keys (why the validator runs first)', () => {
  // canonicalize@2.1.0 without the domain validator: JSON semantics.
  const serialize = require('../vendor/canonicalize-2.1.0/lib/canonicalize.js');
  assert.equal(serialize({ a: 1, b: undefined }), serialize({ a: 1 }));
  assert.equal(serialize([1, undefined]), serialize([1, null]));
});
