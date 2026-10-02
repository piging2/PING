/**
 * P0-A cross-runtime vector manifest.
 * Prints one JSON object per line: { name, jcs, sha256, eventId }.
 * Run on runtime A and runtime B; the manifests must be byte-identical.
 * Usage: node test/xproc-vectors.mjs > /tmp/manifest.<runtime>.jsonl
 */
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { canonicalizeV2 } = require('../v2/canonical-v2.cjs');
const { mintV2 } = require('../v2/event-identity.cjs');

const VECTORS = [
  ['empty-obj', {}],
  ['empty-arr', []],
  ['scalars', [null, true, false, 0, -0, 1, -1, 0.5, 1e21, 5e-324, 1.7976931348623157e308]],
  ['adversary-arr', [[1, 2], [12], ['ab', 'c'], ['a', 'bc'], [[1], [2]], [[1, 2]]]],
  ['key-order', [{ z: 1, a: 2, m: 3 }]],
  ['int-keys', { b: 1, 1: 2, '\r': 3, a: 4 }],
  ['unicode', ['é', 'é', '日本語🎉', '€$', '\u000f', 'A\'B"\\\\"/']],
  ['separators', [{ a: 'x:y' }, { 'a:x': 'y' }, ['a,b'], ['a', 'b'], '}{']],
  ['nested', { a: [{ b: { c: [1, { d: null }] } }], e: 'x' }],
  ['deep10', (() => { let v = { leaf: [1, 2] }; for (let i = 0; i < 10; i++) v = { n: v, i }; return v; })()],
  ['event-material', { eventType: 'REVIEW_RECEIVED', source: 'email-connector', payload: { nested: { x: [1, 2], y: 'z' } } }],
];

for (const [name, value] of VECTORS) {
  const { json, bytes } = await canonicalizeV2(value);
  const eventId = (await mintV2('T', 's', { payload: value })).eventId;
  console.log(JSON.stringify({
    name,
    node: process.version,
    jcs: json,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    eventId,
  }));
}
