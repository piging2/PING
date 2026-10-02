'use strict';
/**
 * P0-A VECTOR CORPUS — locked regression cases (overnight directive §1).
 *
 * Three classes:
 *  A. RFC8785_VECTORS — harvested conformance vectors. The Appendix B pair
 *     is byte-exact (expected bytes reproduced from the RFC's hex dump).
 *     The number table pins ECMAScript Number::toString behavior.
 *  B. PING_ADVERSARIAL — the exact collision classes that V1 fails.
 *     Every pair asserts DIFFERENT bytes (or specified collapse).
 *  C. PING_SEMANTIC_IDENTITY — same semantic value, different spellings/
 *     insertion orders. Every pair asserts IDENTICAL bytes.
 *  D. PING_REJECTIONS — values with no canonical form. Every case asserts
 *     the canonicalizer THROWS (fail closed, never coerced).
 */

// ---------------------------------------------------------------- A. RFC 8785

// RFC 8785 Appendix B example. Input shown as parsed JS values (JSON.parse
// of the RFC's input document). Expected output is byte-exact per the RFC.
const RFC_APPENDIX_B = {
  name: 'rfc8785-appendix-b',
  // JSON.parse('{"numbers": [333333333.33333329, 1E30, 4.50, 2e-3, 0.000000000000000000000000001], "string": "\\u20ac$\\u000F\\u000aA\'\\u0042\\u0022\\u005c\\\\\\"\\/", "literals": [null, true, false]}')
  input: {
    numbers: [333333333.33333329, 1e30, 4.5, 2e-3, 1e-27],
    string: '€$\u000f\nA\'B"\\\\"/',
    literals: [null, true, false],
  },
  expected: '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}',
};

// RFC 8785 §3.2.2.3 / harvested number table: input number -> exact output.
const RFC_NUMBERS = [
  // [input, expected, note]
  [0, '0', 'zero'],
  [-0, '0', 'negative zero collapses (explicit JCS decision)'],
  [1, '1', 'integer'],
  [1.0, '1', 'integer-valued double'],
  [100, '100', 'integer'],
  [1e2, '100', 'exponent spelling normalizes'],
  [-42, '-42', 'negative integer'],
  [1.5, '1.5', 'fraction'],
  [4.5, '4.5', '4.50 parses to 4.5'],
  [0.002, '0.002', '2e-3 parses to 0.002'],
  [2e-3, '0.002', 'exponent spelling normalizes'],
  [1e-27, '1e-27', 'small exponent'],
  [1e30, '1e+30', '1E30 normalizes'],
  [1e21, '1e+21', 'integer notation ends at 10^21'],
  [999999999999999900000, '999999999999999900000', 'one ulp below boundary stays integer'],
  [0.000001, '0.000001', '1e-6 decimal'],
  [0.0000001, '1e-7', 'decimal notation ends below 10^-6'],
  [3.141592653589793, '3.141592653589793', 'pi shortest round-trip'],
  [333333333.33333329, '333333333.3333333', 'shortest round-trip digits'],
  [1424953923781206.25, '1424953923781206.2', 'round-half-even shortest'],
  [123456789, '123456789', 'int'],
  [9007199254740991, '9007199254740991', '2^53-1 max safe integer'],
  [9007199254740992, '9007199254740992', '2^53'],
  [-0.0, '0', '-0.0 collapses'],
];

// ---------------------------------------------------------------- B. PING adversarial (must DIFFER unless noted)

const PING_ADVERSARIAL = [
  { name: 'array-boundary-1', a: [1, 2], b: [12], expect: 'differ',
    note: 'V1 collision: serialize([1,2]) === serialize([12])' },
  { name: 'array-boundary-2', a: ['ab', 'c'], b: ['a', 'bc'], expect: 'differ',
    note: 'string element boundaries' },
  { name: 'array-boundary-3', a: [[1], [2]], b: [[1, 2]], expect: 'differ',
    note: 'nested array boundaries' },
  { name: 'array-boundary-4', a: [[1], [2]], b: [1, 2], expect: 'differ',
    note: 'nesting depth is structural' },
  { name: 'array-boundary-5', a: [1, [2, 3]], b: [[1, 2], 3], expect: 'differ',
    note: 'nesting shape' },
  { name: 'array-vs-string', a: [1, 2], b: '[1,2]', expect: 'differ',
    note: 'strings containing separators cannot alter structure' },
  { name: 'object-vs-string', a: { a: 1 }, b: '{"a":1}', expect: 'differ',
    note: 'quoted structure is data, not structure' },
  { name: 'object-nesting', a: { x: [1, 2] }, b: { x: [12] }, expect: 'differ',
    note: 'nested arrays preserve boundaries' },
  { name: 'object-key-shape', a: { a: { b: 1 } }, b: { 'a.b': 1 }, expect: 'differ',
    note: 'nested objects preserve boundaries' },
  { name: 'null-vs-zero', a: null, b: 0, expect: 'differ',
    note: 'null distinguishable from every permitted numeric value' },
  { name: 'null-vs-false', a: null, b: false, expect: 'differ', note: '' },
  { name: 'null-vs-empty-string', a: null, b: '', expect: 'differ', note: '' },
  { name: 'zero-vs-false', a: 0, b: false, expect: 'differ', note: '' },
  { name: 'zero-vs-empty-string', a: 0, b: '', expect: 'differ', note: '' },
  { name: 'zero-vs-negzero', a: 0, b: -0, expect: 'same',
    note: 'EXPLICIT: JCS collapses -0 to 0 (documented, not a defect)' },
  { name: 'one-vs-one-point-oh', a: 1, b: 1.0, expect: 'same',
    note: 'same numeric value, one identity' },
  { name: 'unicode-composed-vs-decomposed', a: 'é', b: 'é', expect: 'differ',
    note: 'EXPLICIT: JCS does NOT normalize Unicode (U+00E9 vs U+0065 U+0301)' },
  { name: 'unicode-a-ring', a: 'Å', b: 'Å', expect: 'differ',
    note: 'U+00C5 vs U+0041 U+030A stay distinct' },
  { name: 'unicode-emoji', a: '😀', b: '😀', expect: 'same',
    note: 'surrogate pair round-trips as UTF-8' },
  { name: 'unicode-del-unescaped', a: '', b: '', expect: 'same',
    note: 'U+007F is NOT escaped per RFC (only U+0000-U+001F)' },
  { name: 'key-sort-locale', a: { 'péché': 1, 'pêche': 2, z: 3 }, b: { z: 3, 'pêche': 2, 'péché': 1 }, expect: 'same',
    note: 'sorting ignores locale, UTF-16 code units (tested via identity class)' },
  { name: 'empty-key', a: { '': 1 }, b: { '': 1, x: 2 }, expect: 'differ', note: '' },
  { name: 'deep-nesting', a: nest(40, 'x'), b: nest(40, 'y'), expect: 'differ',
    note: 'deeply nested values deterministic and distinct' },
  { name: 'deep-nesting-same', a: nest(40, 'x'), b: nest(40, 'x'), expect: 'same',
    note: 'deeply nested values deterministic and identical' },
];

function nest(depth, leaf) {
  let v = leaf;
  for (let i = 0; i < depth; i++) v = { n: v };
  return v;
}

// ---------------------------------------------------------------- C. semantic identity (must be IDENTICAL bytes)

const PING_SEMANTIC_IDENTITY = [
  { name: 'key-order', a: { b: 2, a: 1 }, b: { a: 1, b: 2 } },
  { name: 'key-order-nested', a: { x: { d: 4, c: 3 }, y: 1 }, b: { y: 1, x: { c: 3, d: 4 } } },
  { name: 'number-spelling-int', a: 100, b: 1e2 },
  { name: 'number-spelling-frac', a: 0.002, b: 2e-3 },
  { name: 'number-spelling-exp', a: 1e30, b: 1e30 },
  { name: 'escape-normalization', a: 'B', b: 'B' },
  { name: 'escape-slash', a: 'a/b', b: 'a/b' },
  { name: 'array-order-preserved', a: [2, 1], b: [2, 1] },
  { name: 'unicode-literal-vs-escape', a: '€', b: '€' },
];

// ---------------------------------------------------------------- D. rejections (must THROW)

const PING_REJECTIONS = [
  { name: 'nan', make: () => NaN, note: 'V1 coerced NaN to null (silent semantic change)' },
  { name: 'pos-infinity', make: () => Infinity, note: '' },
  { name: 'neg-infinity', make: () => -Infinity, note: '' },
  { name: 'nan-nested', make: () => ({ x: [NaN] }), note: 'nested non-finite' },
  { name: 'undefined', make: () => undefined, note: '' },
  { name: 'undefined-nested', make: () => ({ a: undefined }), note: '' },
  { name: 'bigint', make: () => BigInt(1), note: '' },
  { name: 'date', make: () => new Date(0), note: 'ambient object state must not be blessed' },
  { name: 'buffer', make: () => Buffer.from('x'), note: '' },
  { name: 'map', make: () => new Map([['a', 1]]), note: '' },
  { name: 'lone-surrogate-high', make: () => '\uD800', note: 'lone high surrogate' },
  { name: 'lone-surrogate-low', make: () => '\uDC00', note: 'lone low surrogate' },
  { name: 'lone-surrogate-key', make: () => ({ ['\uD800']: 1 }), note: 'lone surrogate in key' },
  { name: 'function', make: () => function () {}, note: '' },
  { name: 'symbol', make: () => Symbol('s'), note: '' },
];

module.exports = { RFC_APPENDIX_B, RFC_NUMBERS, PING_ADVERSARIAL, PING_SEMANTIC_IDENTITY, PING_REJECTIONS };
