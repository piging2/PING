/**
 * P0-A hostile/property fuzzer (dependency-free, seeded).
 *
 * Properties under test:
 *  F1 determinism:      canon(v) twice in-process -> identical bytes.
 *  F2 injectivity:      domain-different values -> different bytes
 *                       (domain equality = deep equality AFTER validation
 *                       normalization, so -0/0 and 1.0/1 are domain-equal).
 *  F3 round-trip:       JSON.parse(jcs) deep-equals the normalized value.
 *  F4 adversarial bias: the generator is weighted toward the historical
 *                       collision classes (adjacent scalars, separators,
 *                       int-like keys, unicode edges).
 *
 * Usage: node test/fuzz.mjs [iterations] [seed]
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validateCanonicalValue } = require('../v2/domain-validator.cjs');
const { canonicalizeV2 } = require('../v2/canonical-v2.cjs');

const ITER = Number(process.argv[2] || 20000);
const SEED = Number(process.argv[3] || 41001) >>> 0;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const INTS = [0, 1, 2, 3, 7, 10, 11, 12, 21, 100, -1, -0];
const FLOATS = [0.5, 1.5, 0.1, 1e21, 5e-324, 1e-7, 123.456];
const STRS = ['', 'a', 'b', 'ab', 'c', 'bc', '12', ',', ':', '[', ']', '{', '}', '"', '\\', '\n', '\r', 'é', '😀', ' ', 'null', 'true'];
const KEYS = ['a', 'b', '1', '2', '10', '', '\r', 'x:y', 'a,b', 'é'];

function genScalar() {
  const r = rnd();
  if (r < 0.28) return pick(INTS);
  if (r < 0.38) return pick(FLOATS);
  if (r < 0.62) return pick(STRS);
  if (r < 0.72) return rnd() < 0.5;
  return null;
}
function genValue(depth) {
  const r = rnd();
  if (depth <= 0 || r < 0.45) return genScalar();
  if (r < 0.72) {
    const n = Math.floor(rnd() * 4);
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(genValue(depth - 1));
    return arr;
  }
  const n = Math.floor(rnd() * 4);
  const obj = {};
  for (let i = 0; i < n; i++) obj[pick(KEYS)] = genValue(depth - 1);
  return obj;
}

let f1 = 0, f2 = 0, f2pairs = 0, f3 = 0;
const seen = new Map(); // bytesHex -> independent domain fingerprint

// Independent test-only oracle: order-insensitive structural fingerprint.
// (NOT the implementation under test; plain recursive key sort.)
function fingerprint(v) {
  const n = validateCanonicalValue(v);
  const sortDeep = (x) => {
    if (Array.isArray(x)) return x.map(sortDeep);
    if (x && typeof x === 'object') {
      const o = {};
      for (const k of Object.keys(x).sort()) o[k] = sortDeep(x[k]);
      return o;
    }
    return x;
  };
  return JSON.stringify(sortDeep(n));
}

for (let i = 0; i < ITER; i++) {
  const v = genValue(4);
  const { json, bytes } = await canonicalizeV2(v);
  const hex = bytes.toString('hex');
  // F1: determinism
  const again = (await canonicalizeV2(JSON.parse(JSON.stringify(v)))).bytes.toString('hex');
  assert.equal(hex, again, `F1 determinism failed at iter ${i}`);
  f1++;
  // F3: round-trip
  assert.deepEqual(JSON.parse(json), validateCanonicalValue(v), `F3 round-trip failed at iter ${i}`);
  f3++;
  // F2: injectivity against ledger
  const fp = fingerprint(v);
  if (seen.has(hex)) {
    f2pairs++;
    assert.equal(seen.get(hex), fp,
      `F2 INJECTIVITY VIOLATION at iter ${i}: bytes ${hex.slice(0, 32)}... shared by domain-different values`);
  } else {
    seen.set(hex, fp);
    f2++;
  }
}

// Directed adversarial pairs (must differ)
const adversaries = [
  [[1, 2], [12]], [[1, 2, 3], [12, 3]], [[1, 2, 3], [1, 23]],
  [['ab', 'c'], ['a', 'bc']], [[true, false], ['truefalse']],
  [[1, true], [1, 'true']], [[null, 1], ['null', 1]],
  [{ a: 'x:y' }, { 'a:x': 'y' }], [['a,b'], ['a', 'b']],
  [[1, [2]], [[1, 2]]], [{ a: [1] }, { a: 1 }],
  [[0], [-0, 0].slice(1)], // domain-equal by spec: must be EQUAL
];
let advDiffer = 0, advEqual = 0;
for (const [x, y] of adversaries) {
  const bx = (await canonicalizeV2(x)).bytes.toString('hex');
  const by = (await canonicalizeV2(y)).bytes.toString('hex');
  const domainEq = fingerprint(x) === fingerprint(y);
  if (domainEq) { assert.equal(bx, by); advEqual++; }
  else { assert.notEqual(bx, by, `adversarial pair collided: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`); advDiffer++; }
}

console.log(JSON.stringify({
  seed: SEED, iterations: ITER,
  F1_determinism: f1, F2_unique_bytes: f2, F2_ledger_hits_domain_equal: f2pairs,
  F3_roundtrip: f3, adversarial_differ: advDiffer, adversarial_domain_equal: advEqual,
  result: 'PASS',
}));
