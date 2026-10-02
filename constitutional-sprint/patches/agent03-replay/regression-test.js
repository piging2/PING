'use strict';
/**
 * Agent 03 regression test — replay artifact_hash determinism.
 *
 * Proves, against the CURRENT code path in
 *   /home/nolan/ping/gateway/kernel_replay_execution_provider.js (lines 78-80),
 * that two semantically identical payloads with different key insertion order
 * produce DIFFERENT artifact hashes (nondeterministic input to replay).
 * Then verifies the proposed fix (recursive sorted-keys stringify) removes it.
 *
 * Run: node regression-test.js
 * Exit 0 = bug reproduced on current code AND fix verified. Exit 1 = unexpected.
 */
const fs = require('fs');
const path = require('path');

const ORIG = path.join(__dirname, 'kernel_replay_execution_provider.js.orig');
const PATCHED = path.join(__dirname, 'kernel_replay_execution_provider.js.patched');

const origSrc = fs.readFileSync(ORIG, 'utf8');

// --- 1. Evidence: the buggy line must exist verbatim in the current source ---
const BUGGY_LINE = 'this._computeHash(JSON.stringify(event.payload || {}))';
if (!origSrc.includes(BUGGY_LINE)) {
  console.error('FAIL: expected buggy line not found in source; evidence stale');
  process.exit(1);
}
console.log('[evidence] buggy line present at krep.js:80');

// --- 2. Extract the verbatim _computeHash implementation from the real file ---
const m = origSrc.match(/_computeHash\(input\) \{([\s\S]*?)\n  \}/);
if (!m) { console.error('FAIL: could not extract _computeHash'); process.exit(1); }
const _computeHash = new Function('input', m[1]);

// --- 3. Reproduce the current behavior exactly as line 80 does it ---
const artifactHashCurrent = (payload) => _computeHash(JSON.stringify(payload || {}));

const payloadA = { name: 'widget', price: 9.99, tags: ['a', 'b'] };
const payloadB = { tags: ['a', 'b'], price: 9.99, name: 'widget' }; // same content, different key order
const payloadC = { price: 9.99, name: 'widget', tags: ['a', 'b'], meta: { z: 1, a: 2 } };
const payloadD = { meta: { a: 2, z: 1 }, tags: ['a', 'b'], name: 'widget', price: 9.99 };

const hA = artifactHashCurrent(payloadA);
const hB = artifactHashCurrent(payloadB);
const hC = artifactHashCurrent(payloadC);
const hD = artifactHashCurrent(payloadD);

console.log('[current] hash(A) =', hA);
console.log('[current] hash(B) =', hB);
console.log('[current] hash(C) =', hC);
console.log('[current] hash(D) =', hD);

if (hA === hB && hC === hD) {
  console.error('UNEXPECTED: current code is already order-insensitive; no bug to fix');
  process.exit(1);
}
console.log('[bug REPRODUCED] identical payloads with different key order -> different artifact_hash');
console.log('                 (A vs B differ:', hA !== hB, '| C vs D differ:', hC !== hD, ')');

// --- 4. Verify the proposed fix removes the nondeterminism ---
const patchedSrc = fs.readFileSync(PATCHED, 'utf8');
const m2 = patchedSrc.match(/_stableStringify\(value\) \{([\s\S]*?)\n  \}/);
if (!m2) { console.error('FAIL: patched file lacks _stableStringify'); process.exit(1); }
if (!patchedSrc.includes('this._computeHash(this._stableStringify(event.payload || {}))')) {
  console.error('FAIL: patched call site not as proposed'); process.exit(1);
}
const _stableStringifyRaw = new Function('value', m2[1].replace(/this\._stableStringify\(/g, 'globalThis._stableStringifyRec('));
globalThis._stableStringifyRec = function (value) { return _stableStringifyRaw.call(null, value); };
const _stableStringify = globalThis._stableStringifyRec;
const artifactHashFixed = (payload) => _computeHash(_stableStringify(payload || {}));

const fA = artifactHashFixed(payloadA);
const fB = artifactHashFixed(payloadB);
const fC = artifactHashFixed(payloadC);
const fD = artifactHashFixed(payloadD);

console.log('[fixed] hash(A) =', fA);
console.log('[fixed] hash(B) =', fB);
console.log('[fixed] hash(C) =', fC);
console.log('[fixed] hash(D) =', fD);

if (fA !== fB || fC !== fD) {
  console.error('FAIL: proposed fix does not normalize key order');
  process.exit(1);
}
// Regression: fix must not merge genuinely different payloads
if (artifactHashFixed({ a: 1 }) === artifactHashFixed({ a: 2 })) {
  console.error('FAIL: fix collapses distinct payloads');
  process.exit(1);
}
console.log('[fix VERIFIED] key order no longer changes artifact_hash; distinct payloads still differ');
console.log('PASS: bug reproduced on current code, fix verified');
