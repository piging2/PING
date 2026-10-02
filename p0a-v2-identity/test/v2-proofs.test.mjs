/**
 * P0-A V2 PROOFS (GREEN expected).
 *
 * Proves against the V2 candidate:
 *  (a) different semantic payload -> different identity (all adversarial vectors),
 *  (b) same semantic payload    -> same identity (key reorder, whitespace, cross-runtime),
 *  (c) domain rejections are typed and explicit,
 *  (d) V1 reader: golden vectors byte-identical; contract determinability.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { identityAuthority: v1authority } = require('./fixtures/v1-identity-authority.js');

const { validateCanonicalValue, DomainError } = await import('../v2/domain-validator.mjs');
const { canonicalizeV2 } = await import('../v2/canonical-v2.mjs');
const { mintV1, mintV2, contractOf, CONTRACT_V1, CONTRACT_V2 } = await import('../v2/event-identity.mjs');
const { resolveConflict } = await import('../v2/conflict-protocol.mjs');

const jcs = async (v) => (await canonicalizeV2(v)).json;
const idV2 = async (payload, opts = {}) =>
  (await mintV2('T', 's', { payload, ...opts })).eventId;

// ---------- (a) different semantics -> different identity ----------

test('P-01: [1,2] != [12]', async () => {
  assert.notEqual(await jcs([1, 2]), await jcs([12]));
  assert.notEqual(await idV2([1, 2]), await idV2([12]));
});

test('P-02: ["ab","c"] != ["a","bc"]', async () => {
  assert.notEqual(await jcs(['ab', 'c']), await jcs(['a', 'bc']));
});

test('P-03: nested boundaries hold', async () => {
  assert.notEqual(await jcs([[1], [2]]), await jcs([[1, 2]]));
  assert.notEqual(await jcs([1, [2, 3]]), await jcs([[1, 2], 3]));
  assert.notEqual(await jcs({ a: { x: 1 }, b: 2 }), await jcs({ a: { x: 1, b: 2 } }));
});

test('P-04: separator-bearing strings cannot alter structure', async () => {
  assert.notEqual(await jcs({ a: 'x:y' }), await jcs({ 'a:x': 'y' }));
  assert.notEqual(await jcs(['a,b']), await jcs(['a', 'b']));
  assert.notEqual(await jcs('}{'), await jcs(['}', '{']));
  assert.notEqual(await idV2({ a: '}{' }), await idV2([{ a: '}' }, { a: '{' }]));
});

test('P-05: null distinguished from every permitted number', async () => {
  for (const n of [0, 1, -1, 0.5, 1e21, 5e-324]) {
    assert.notEqual(await jcs({ v: null }), await jcs({ v: n }), `null vs ${n}`);
  }
});

test('P-06: -0 normalizes to 0 BY SPEC (explicit, not silent)', async () => {
  assert.equal(await jcs({ v: -0 }), await jcs({ v: 0 }));
  assert.equal(await jcs(-0), '0');
});

test('P-07: 1.0 === 1 (same double, not a defect)', async () => {
  assert.equal(await jcs(1.0), await jcs(1));
});

test('P-08: unicode as-is, no normalization; distinct forms differ', async () => {
  assert.notEqual(await jcs('é'), await jcs('é')); // NFC vs NFD
  assert.equal(await jcs('日本語🎉'), await jcs('日本語🎉'));
  // RFC 8785 S3.2.3 sort check: pure UTF-16 code-unit order (\r < "1" < "a" < "b")
  assert.equal(await jcs({ b: 1, '1': 2, '\r': 3, a: 4 }), '{"\\r":3,"1":2,"a":4,"b":1}');
});

test('P-08b: RFC 8785 S3.2.3 official sort vectors (incl. integer-like key "1")', async () => {
  // The RFC's own test object; expected order: \r, "1", \u0080, ö, €, emoji, \ufb33.
  const v = {
    '€': 'Euro Sign',
    '\r': 'Carriage Return',
    'דּ': 'Hebrew Letter Dalet With Dagesh',
    '1': 'One',
    '😀': 'Emoji: Grinning Face',
    '\u0080': 'Control',
    'ö': 'Latin Small Letter O With Diaeresis',
  };
  const got = await jcs(v);
  const keys = [...got.matchAll(/"((?:\\.|[^"\\])*)":/g)].map((m) => JSON.parse(`"${m[1]}"`));
  assert.deepEqual(keys, ['\r', '1', '\u0080', 'ö', '€', '😀', 'דּ']);
});

test('P-09: RFC 8785 Appendix B number samples', async () => {
  const samples = [
    [0, '0'], [1e21, '1e+21'], [1e+23, '1e+23'], [5e-324, '5e-324'],
    [1.7976931348623157e308, '1.7976931348623157e+308'],
    [9007199254740992, '9007199254740992'], [333333333.3333333, '333333333.3333333'],
    [0.1 + 0.2, '0.30000000000000004'],
  ];
  for (const [n, want] of samples) assert.equal(await jcs(n), want, String(n));
});

test('P-10: large integers deterministic (advisory: prefer strings > 2^53)', async () => {
  assert.equal(await jcs(9007199254740993), await jcs(9007199254740992)); // same double
  assert.notEqual(await jcs('9007199254740993'), await jcs('9007199254740992')); // strings differ
});

// ---------- domain rejections (typed, before hashing) ----------

test('P-11: non-finite rejected with typed errors', async () => {
  for (const v of [NaN, Infinity, -Infinity]) {
    await assert.rejects(() => canonicalizeV2({ v }), (e) =>
      e instanceof DomainError && e.code === 'DOMAIN_NON_FINITE_NUMBER');
  }
  await assert.rejects(() => mintV2('T', 's', { payload: { v: NaN } }), /DOMAIN_NON_FINITE_NUMBER/);
});

test('P-12: undefined / bigint / functions / symbols rejected', async () => {
  await assert.rejects(() => canonicalizeV2({ a: undefined }), /DOMAIN_UNDEFINED/);
  await assert.rejects(() => canonicalizeV2([1, undefined]), /DOMAIN_UNDEFINED/);
  await assert.rejects(() => canonicalizeV2(10n), /DOMAIN_BIGINT/);
  await assert.rejects(() => canonicalizeV2(() => {}), /DOMAIN_NON_DATA/);
  await assert.rejects(() => canonicalizeV2(Symbol('x')), /DOMAIN_NON_DATA/);
});

test('P-13: Date / Buffer / Map / class instances / toJSON rejected', async () => {
  await assert.rejects(() => canonicalizeV2(new Date()), /DOMAIN_NON_PLAIN_OBJECT/);
  await assert.rejects(() => canonicalizeV2(Buffer.from('x')), /DOMAIN_NON_PLAIN_OBJECT/);
  await assert.rejects(() => canonicalizeV2(new Map()), /DOMAIN_NON_PLAIN_OBJECT/);
  class Foo { constructor() { this.a = 1; } }
  await assert.rejects(() => canonicalizeV2(new Foo()), /DOMAIN_NON_PLAIN_OBJECT/);
  await assert.rejects(() => canonicalizeV2({ a: 1, toJSON() { return {}; } }), /DOMAIN_BEHAVIORAL/);
});

test('P-14: circular, sparse, deep, lone-surrogate rejected', async () => {
  const cyc = { a: 1 }; cyc.self = cyc;
  await assert.rejects(() => canonicalizeV2(cyc), /DOMAIN_CIRCULAR/);
  const sparse = [1, , 3];
  await assert.rejects(() => canonicalizeV2(sparse), /DOMAIN_UNDEFINED/);
  let deep = { leaf: 1 };
  for (let i = 0; i < 70; i++) deep = { nest: deep };
  await assert.rejects(() => canonicalizeV2(deep), /DOMAIN_DEPTH_EXCEEDED/);
  await assert.rejects(() => canonicalizeV2('lone\uDEAD'), /DOMAIN_LONE_SURROGATE/);
});

test('P-15: validator never mutates caller data', async () => {
  const input = { v: -0, nest: { arr: [1] } };
  const snap = JSON.stringify(input);
  validateCanonicalValue(input);
  assert.equal(JSON.stringify(input), snap);
  assert.ok(Object.is(input.v, -0), 'caller -0 untouched');
});

// ---------- (b) same semantics -> same identity ----------

test('P-16: key order irrelevant', async () => {
  assert.equal(await jcs({ a: 1, b: 2 }), await jcs({ b: 2, a: 1 }));
  assert.equal(await idV2({ a: 1, b: 2 }), await idV2({ b: 2, a: 1 }));
});

test('P-17: whitespace variants identical (parse -> canonicalize)', async () => {
  const a = JSON.parse('{ "a" : 1 , "b" : [ 1 , 2 ] }');
  const b = JSON.parse('{"b":[1,2],"a":1}');
  assert.equal(await jcs(a), await jcs(b));
});

test('P-18: logical_id dominates payload (timestamp-stripped identity preserved)', async () => {
  const x = await mintV2('T', 's', { logical_id: 'L', payload: { t: 1 } });
  const y = await mintV2('T', 's', { logical_id: 'L', payload: { t: 2 } });
  assert.equal(x.eventId, y.eventId);
  const z = await mintV2('T', 's', { logical_id: 'M', payload: { t: 1 } });
  assert.notEqual(x.eventId, z.eventId);
});

test('P-19: namespace and tenant_id join identity material', async () => {
  const base = await idV2({ a: 1 });
  assert.notEqual(base, await idV2({ a: 1 }, { namespace: 'n' }));
  assert.notEqual(base, await idV2({ a: 1 }, { tenant_id: 't1' }));
  assert.equal(await idV2({ a: 1 }, { tenant_id: 't1' }), await idV2({ a: 1 }, { tenant_id: 't1' }));
});

test('P-20: V2 IDs are 64-char hex and era-separated from V1', async () => {
  const v2 = await mintV2('T', 's', { payload: { a: 1 } });
  assert.match(v2.eventId, /^[0-9a-f]{64}$/);
  assert.equal(v2.contract, CONTRACT_V2);
  const v1 = mintV1('T', 's', { payload: { a: 1 } });
  assert.notEqual(v2.eventId, v1, 'era separator must prevent V1/V2 ID confusion');
});

// ---------- (d) V1 reader ----------

test('P-21: V1 golden vectors byte-identical (historical contract frozen)', () => {
  const GOLDEN = [
    ['REVIEW_RECEIVED', 'email-connector', { payload: { a: 1 } },
      '247197fe66b8d98e7903659b23930745a3b7cbfe0c8f35b784625c53a51c8c91'],
    ['REVIEW_RECEIVED', 'email-connector', { namespace: 'tenant::hpp', payload: { a: 1 } },
      'edc733f6896e65a740630dface9cb48b7e179838f3a93c5f9f831cdc6459d6bf'],
    ['REVIEW_RECEIVED', 'email-connector', { namespace: 'tenant::hpp', logical_id: 'L1', payload: { a: 1 } },
      'c1fe05bcca559220430e9252a7df9acb4c92bb86c3c22e492464936262f0c032'],
    ['CUSTOMER_CREATED', 'customer-authority', { payload: { nested: { x: [1, 2], y: 'z' } } },
      'ff90a33eb18b69f03f66740bd76be19965de987b5c681505abca6690a07f2fbf'],
  ];
  for (const [t, s2, o, want] of GOLDEN) {
    assert.equal(mintV1(t, s2, o), want, 'V1 drift');
    assert.equal(v1authority.generateSpineEventId(t, s2, o), want, 'V1 fixture drift');
  }
});

test('P-22: contract determinability (absent -> v1; present -> honored; unknown -> STOP)', () => {
  assert.equal(contractOf({ metadata: {} }), CONTRACT_V1);
  assert.equal(contractOf({}), CONTRACT_V1);
  assert.equal(contractOf({ metadata: { identity_contract: CONTRACT_V2 } }), CONTRACT_V2);
  assert.equal(contractOf({ metadata: { identity_contract: CONTRACT_V1 } }), CONTRACT_V1);
  assert.throws(() => contractOf({ metadata: { identity_contract: 'ping-event-id/v9' } }), /UNKNOWN_CONTRACT/);
});

// ---------- conflict protocol ----------

test('P-23: identical payload -> IDEMPOTENT_DUPLICATE', async () => {
  const payload = { a: 1, b: [1, 2] };
  const stored = { payload: JSON.parse(JSON.stringify(payload)), metadata: { identity_contract: CONTRACT_V2 } };
  const r = await resolveConflict({
    readStored: async () => stored,
    eventId: 'abc', candidatePayload: { b: [1, 2], a: 1 }, // key order differs: still duplicate
  });
  assert.equal(r.verdict, 'IDEMPOTENT_DUPLICATE');
  assert.equal(r.contract, CONTRACT_V2);
});

test('P-24: different payload, same ID -> CANONICAL_ID_COLLISION, fail closed, no payload leak', async () => {
  const r = await resolveConflict({
    readStored: async () => ({ payload: { v: [1, 2] }, metadata: { identity_contract: CONTRACT_V2 } }),
    eventId: 'deadbeef', candidatePayload: { v: [12] },
  });
  assert.equal(r.verdict, 'CANONICAL_ID_COLLISION');
  const ev = JSON.stringify(r.evidence);
  assert.ok(!ev.includes('[1,2]') && !ev.includes('[12]'), 'evidence must not leak payload bytes');
  assert.equal(r.evidence.contract, CONTRACT_V2);
  assert.ok(r.evidence.stored_payload_sha256 && r.evidence.candidate_payload_sha256);
});

test('P-25: V1-row conflict uses the frozen V1 comparator (historical semantics)', async () => {
  // Under V1, [1,2] vs [12] compare EQUAL (the documented historical defect):
  // the protocol reproduces history faithfully, it does not rewrite it.
  const r = await resolveConflict({
    readStored: async () => ({ payload: [1, 2], metadata: {} }),
    eventId: 'x', candidatePayload: [12],
  });
  assert.equal(r.verdict, 'IDEMPOTENT_DUPLICATE');
  assert.equal(r.contract, CONTRACT_V1);
});

test('P-26: no stored row -> NO_CONFLICT (lost race)', async () => {
  const r = await resolveConflict({ readStored: async () => null, eventId: 'x', candidatePayload: { a: 1 } });
  assert.equal(r.verdict, 'NO_CONFLICT');
});
