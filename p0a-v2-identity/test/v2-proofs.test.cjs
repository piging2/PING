'use strict';
/**
 * P0-A V2 PROOFS (GREEN expected).
 * Engine: vendored canonicalize@2.1.0 (Apache-2.0) + strict domain validator.
 * Era scheme: ev2:<domain>:<64hex> (WS2 §4.3, adopted).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { identityAuthority: v1authority } = require('./fixtures/v1-identity-authority.js');
const { DomainError } = require('../v2/domain-validator.cjs');
const { canonicalizeV2 } = require('../v2/canonical-v2.cjs');
const {
  mintV1, mintV2, eraOf, contractOf, CONTRACT_V1, CONTRACT_V2, DOMAINS,
} = require('../v2/event-identity.cjs');
const {
  resolveConflict, deployedWhitelistCanon,
} = require('../v2/conflict-protocol.cjs');

const jcs = (v) => canonicalizeV2(v).json;
const idV2 = (payload, opts = {}) => mintV2('T', 's', { payload, ...opts }).eventId;

// ---------- (a) different semantics -> different identity ----------

test('P-01: [1,2] != [12]', () => {
  assert.notEqual(jcs([1, 2]), jcs([12]));
  assert.notEqual(idV2([1, 2]), idV2([12]));
});

test('P-02: ["ab","c"] != ["a","bc"]', () => {
  assert.notEqual(jcs(['ab', 'c']), jcs(['a', 'bc']));
});

test('P-03: nested boundaries hold', () => {
  assert.notEqual(jcs([[1], [2]]), jcs([[1, 2]]));
  assert.notEqual(jcs([1, [2, 3]]), jcs([[1, 2], 3]));
  assert.notEqual(jcs({ a: { x: 1 }, b: 2 }), jcs({ a: { x: 1, b: 2 } }));
});

test('P-04: separator-bearing strings cannot alter structure', () => {
  assert.notEqual(jcs({ a: 'x:y' }), jcs({ 'a:x': 'y' }));
  assert.notEqual(jcs(['a,b']), jcs(['a', 'b']));
  assert.notEqual(jcs('}{'), jcs(['}', '{']));
  assert.notEqual(idV2({ a: '}{' }), idV2([{ a: '}' }, { a: '{' }]));
});

test('P-05: null distinguished from every permitted number', () => {
  for (const n of [0, 1, -1, 0.5, 1e21, 5e-324]) {
    assert.notEqual(jcs({ v: null }), jcs({ v: n }), `null vs ${n}`);
  }
});

test('P-06: -0 normalizes to 0 BY SPEC (explicit, not silent)', () => {
  assert.equal(jcs({ v: -0 }), jcs({ v: 0 }));
  assert.equal(jcs(-0), '0');
});

test('P-07: 1.0 === 1 (same double, not a defect)', () => {
  assert.equal(jcs(1.0), jcs(1));
});

test('P-08: unicode as-is, no normalization; distinct forms differ', () => {
  assert.notEqual(jcs('é'), jcs('é')); // NFC vs NFD
  assert.equal(jcs('日本語🎉'), jcs('日本語🎉'));
  assert.equal(jcs({ b: 1, '1': 2, '\r': 3, a: 4 }), '{"\\r":3,"1":2,"a":4,"b":1}');
});

test('P-08b: RFC 8785 S3.2.3 official sort vectors', () => {
  const v = {
    '€': 'Euro Sign', '\r': 'Carriage Return', 'דּ': 'Hebrew Letter Dalet With Dagesh',
    '1': 'One', '😀': 'Emoji: Grinning Face', '\u0080': 'Control',
    'ö': 'Latin Small Letter O With Diaeresis',
  };
  const got = jcs(v);
  const keys = [...got.matchAll(/"((?:\\.|[^"\\])*)":/g)].map((m) => JSON.parse(`"${m[1]}"`));
  assert.deepEqual(keys, ['\r', '1', '\u0080', 'ö', '€', '😀', 'דּ']);
});

test('P-09: RFC 8785 Appendix B number samples', () => {
  const samples = [
    [0, '0'], [1e21, '1e+21'], [1e+23, '1e+23'], [5e-324, '5e-324'],
    [1.7976931348623157e308, '1.7976931348623157e+308'],
    [9007199254740992, '9007199254740992'], [333333333.3333333, '333333333.3333333'],
    [0.1 + 0.2, '0.30000000000000004'],
  ];
  for (const [n, want] of samples) assert.equal(jcs(n), want, String(n));
});

test('P-10: large integers deterministic (advisory: prefer strings > 2^53)', () => {
  assert.equal(jcs(9007199254740993), jcs(9007199254740992));
  assert.notEqual(jcs('9007199254740993'), jcs('9007199254740992'));
});

// ---------- domain rejections ----------

test('P-11: non-finite rejected with typed errors', () => {
  for (const v of [NaN, Infinity, -Infinity]) {
    assert.throws(() => canonicalizeV2({ v }), (e) =>
      e instanceof DomainError && e.code === 'DOMAIN_NON_FINITE_NUMBER');
  }
  assert.throws(() => mintV2('T', 's', { payload: { v: NaN } }), /DOMAIN_NON_FINITE_NUMBER/);
});

test('P-12: undefined / bigint / functions / symbols rejected', () => {
  assert.throws(() => canonicalizeV2({ a: undefined }), /DOMAIN_UNDEFINED/);
  assert.throws(() => canonicalizeV2({ a: 1, b: undefined }), /DOMAIN_UNDEFINED/);
  assert.throws(() => canonicalizeV2([1, undefined]), /DOMAIN_UNDEFINED/);
  assert.throws(() => canonicalizeV2(10n), /DOMAIN_BIGINT/);
  assert.throws(() => canonicalizeV2(() => {}), /DOMAIN_NON_DATA/);
  assert.throws(() => canonicalizeV2(Symbol('x')), /DOMAIN_NON_DATA/);
});

test('P-13: Date / Buffer / Map / class instances / toJSON rejected', () => {
  assert.throws(() => canonicalizeV2(new Date()), /DOMAIN_NON_PLAIN_OBJECT/);
  assert.throws(() => canonicalizeV2(Buffer.from('x')), /DOMAIN_NON_PLAIN_OBJECT/);
  assert.throws(() => canonicalizeV2(new Map()), /DOMAIN_NON_PLAIN_OBJECT/);
  class Foo { constructor() { this.a = 1; } }
  assert.throws(() => canonicalizeV2(new Foo()), /DOMAIN_NON_PLAIN_OBJECT/);
  assert.throws(() => canonicalizeV2({ a: 1, toJSON() { return {}; } }), /DOMAIN_BEHAVIORAL/);
});

test('P-14: circular, sparse, deep, lone-surrogate rejected', () => {
  const cyc = { a: 1 }; cyc.self = cyc;
  assert.throws(() => canonicalizeV2(cyc), /DOMAIN_CIRCULAR/);
  assert.throws(() => canonicalizeV2([1, , 3]), /DOMAIN_UNDEFINED/);
  let deep = { leaf: 1 };
  for (let i = 0; i < 70; i++) deep = { nest: deep };
  assert.throws(() => canonicalizeV2(deep), /DOMAIN_DEPTH_EXCEEDED/);
  assert.throws(() => canonicalizeV2('lone' + String.fromCharCode(0xDEAD)), /DOMAIN_LONE_SURROGATE/);
});

test('P-15: validator never mutates caller data', () => {
  const { validateCanonicalValue } = require('../v2/domain-validator.cjs');
  const input = { v: -0, nest: { arr: [1] } };
  const snap = JSON.stringify(input);
  validateCanonicalValue(input);
  assert.equal(JSON.stringify(input), snap);
  assert.ok(Object.is(input.v, -0), 'caller -0 untouched');
});

// ---------- (b) same semantics -> same identity ----------

test('P-16: key order irrelevant', () => {
  assert.equal(jcs({ a: 1, b: 2 }), jcs({ b: 2, a: 1 }));
  assert.equal(idV2({ a: 1, b: 2 }), idV2({ b: 2, a: 1 }));
});

test('P-17: whitespace variants identical (parse -> canonicalize)', () => {
  const a = JSON.parse('{ "a" : 1 , "b" : [ 1 , 2 ] }');
  const b = JSON.parse('{"b":[1,2],"a":1}');
  assert.equal(jcs(a), jcs(b));
});

test('P-18: logical_id dominates payload (timestamp-stripped identity preserved)', () => {
  const x = mintV2('T', 's', { logical_id: 'L', payload: { t: 1 } });
  const y = mintV2('T', 's', { logical_id: 'L', payload: { t: 2 } });
  assert.equal(x.eventId, y.eventId);
  const z = mintV2('T', 's', { logical_id: 'M', payload: { t: 1 } });
  assert.notEqual(x.eventId, z.eventId);
});

test('P-19: namespace and tenant_id join identity material', () => {
  const base = idV2({ a: 1 });
  assert.notEqual(base, idV2({ a: 1 }, { namespace: 'n' }));
  assert.notEqual(base, idV2({ a: 1 }, { tenant_id: 't1' }));
  assert.equal(idV2({ a: 1 }, { tenant_id: 't1' }), idV2({ a: 1 }, { tenant_id: 't1' }));
});

// ---------- era scheme ----------

test('P-20: V2 IDs are ev2:<domain>:<64hex>, era-separated from V1', () => {
  const v2 = mintV2('T', 's', { payload: { a: 1 } });
  assert.match(v2.eventId, /^ev2:spine:[0-9a-f]{64}$/);
  assert.equal(v2.contract, CONTRACT_V2);
  const v1 = mintV1('T', 's', { payload: { a: 1 } });
  assert.match(v1, /^[0-9a-f]{64}$/);
  assert.ok(!v2.eventId.includes(v1) && v2.eventId !== v1);
  // era + domain are inside the hashed preimage (not just the string)
  assert.ok(v2.canonicalJson.includes('"era":"v2"'));
  assert.ok(v2.canonicalJson.includes('"domain":"spine"'));
});

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

test('P-22: contract determinability (absent -> eraOf; unknown -> STOP)', () => {
  assert.equal(contractOf({ event_id: 'a'.repeat(64), metadata: {} }), CONTRACT_V1);
  assert.equal(contractOf({ event_id: 'a'.repeat(64) }), CONTRACT_V1);
  const v2id = mintV2('T', 's', { payload: { a: 1 } }).eventId;
  assert.equal(contractOf({ event_id: v2id, metadata: { identity_era: 'v2' } }), CONTRACT_V2);
  assert.equal(contractOf({ event_id: v2id, metadata: {} }), CONTRACT_V2);
  // marker/ID disagreement -> STOP
  assert.throws(() => contractOf({ event_id: 'a'.repeat(64), metadata: { identity_era: 'v2' } }), /UNKNOWN_CONTRACT/);
  assert.throws(() => contractOf({ event_id: v2id, metadata: { identity_era: 'v1' } }), /UNKNOWN_CONTRACT/);
  // unclassifiable ID -> STOP
  assert.throws(() => contractOf({ event_id: 'not-an-id!!!', metadata: {} }), /UNKNOWN_CONTRACT/);
});

test('P-27: eraOf classifies all 6 persisted eras; unknown -> throw', () => {
  assert.deepEqual(eraOf('a'.repeat(64)), { era: 'v1', family: 'spine' });
  assert.deepEqual(eraOf('evt_0123456789abcdef'), { era: 'v1', family: 'evt' });
  assert.deepEqual(eraOf('fyd-seed-ovl-001'), { era: 'v1', family: 'journal' });
  assert.deepEqual(eraOf('fyd-ovl-m3x7ab9c-0123456789ab'), { era: 'v1', family: 'journal' });
  assert.deepEqual(eraOf('mc-bf-2d4b7507de8b'), { era: 'v1', family: 'journal' });
  assert.deepEqual(eraOf('mc-apr-0123456789abcdef'), { era: 'v1', family: 'journal' });
  assert.deepEqual(eraOf('mc-d-0123456789ab'), { era: 'v1', family: 'journal' });
  assert.deepEqual(eraOf('ev2:spine:' + 'b'.repeat(64)), { era: 'v2', family: 'v2', domain: 'spine' });
  assert.deepEqual(eraOf('ev2:journal:' + 'c'.repeat(64)), { era: 'v2', family: 'v2', domain: 'journal' });
  assert.throws(() => eraOf('ev2:nope:' + 'd'.repeat(64)), /UNKNOWN_CONTRACT/);
  assert.throws(() => eraOf('EV2:spine:' + 'e'.repeat(64)), /UNKNOWN_CONTRACT/);
  assert.throws(() => eraOf(''), /UNKNOWN_CONTRACT/);
});

test('P-28: domain registry enforced; domains separate IDs', () => {
  assert.ok(DOMAINS.has('spine') && DOMAINS.has('journal') && DOMAINS.has('witness'));
  const ids = new Set();
  for (const d of DOMAINS) ids.add(mintV2('T', 's', { domain: d, payload: { a: 1 } }).eventId);
  assert.equal(ids.size, DOMAINS.size, 'same payload in different domains must mint different IDs');
  assert.throws(() => mintV2('T', 's', { domain: 'evil', payload: {} }), /UNKNOWN_DOMAIN/);
});

test('P-29: vendored engine passes its own test vectors (through the validator)', () => {
  const dir = path.join(__dirname, '..', 'vendor', 'canonicalize-2.1.0', 'test', 'testdata');
  for (const name of ['values', 'structures', 'arrays', 'weird', 'french']) {
    const input = JSON.parse(fs.readFileSync(path.join(dir, 'input', `${name}.json`), 'utf8'));
    const expected = fs.readFileSync(path.join(dir, 'output', `${name}.json`), 'utf8').trim();
    assert.equal(jcs(input), expected, name);
  }
});

// ---------- conflict protocol ----------

test('P-23: identical payload -> IDEMPOTENT_DUPLICATE', async () => {
  const payload = { a: 1, b: [1, 2] };
  const stored = { payload: JSON.parse(JSON.stringify(payload)), metadata: { identity_era: 'v2' } };
  const vid = mintV2('T', 's', { payload }).eventId;
  const r = await resolveConflict({
    readStored: async () => stored,
    eventId: vid, candidatePayload: { b: [1, 2], a: 1 },
  });
  assert.equal(r.verdict, 'IDEMPOTENT_DUPLICATE');
  assert.equal(r.contract, CONTRACT_V2);
});

test('P-24: different payload, same ID -> CANONICAL_ID_COLLISION, fail closed, no payload leak', async () => {
  const vid = 'ev2:spine:' + 'a'.repeat(64);
  const r = await resolveConflict({
    readStored: async () => ({ payload: { v: [1, 2] }, metadata: { identity_era: 'v2' } }),
    eventId: vid, candidatePayload: { v: [12] },
  });
  assert.equal(r.verdict, 'CANONICAL_ID_COLLISION');
  const ev = JSON.stringify(r.evidence);
  assert.ok(!ev.includes('[1,2]') && !ev.includes('[12]'), 'evidence must not leak payload bytes');
  assert.equal(r.evidence.contract, CONTRACT_V2);
  assert.ok(r.evidence.stored_payload_sha256 && r.evidence.candidate_payload_sha256);
});

test('P-25: V1-row conflict uses the frozen V1 comparator (historical semantics)', async () => {
  const r = await resolveConflict({
    readStored: async () => ({ payload: [1, 2], metadata: {} }),
    eventId: 'b'.repeat(64), candidatePayload: [12], line: 'integrated',
  });
  assert.equal(r.verdict, 'IDEMPOTENT_DUPLICATE'); // the documented historical defect, reproduced faithfully
  assert.equal(r.contract, CONTRACT_V1);
});

test('P-25b: deployed whitelist comparator is blind to nested keys (WS2 §1b, locked)', async () => {
  const a = deployedWhitelistCanon({ v: { x: [1, 2] } });
  const b = deployedWhitelistCanon({ v: { x: [12] } });
  assert.ok(a.equals(b), 'whitelist drops nested keys: the live blindness, locked as defect');
  // ...which is why the forward protocol must NEVER use it for new comparisons:
  const r = await resolveConflict({
    readStored: async () => ({ payload: { v: { x: [1, 2] } }, metadata: { identity_era: 'v2' } }),
    eventId: 'ev2:spine:' + 'c'.repeat(64), candidatePayload: { v: { x: [12] } },
  });
  assert.equal(r.verdict, 'CANONICAL_ID_COLLISION');
});

test('P-26: no stored row -> NO_CONFLICT (lost race)', async () => {
  const r = await resolveConflict({ readStored: async () => null, eventId: 'x', candidatePayload: { a: 1 } });
  assert.equal(r.verdict, 'NO_CONFLICT');
});
