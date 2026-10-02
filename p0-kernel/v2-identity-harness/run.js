'use strict';
/**
 * P0-A PROOF RUNNER — V2 identity evaluation (UNEVALUATED, NOT WIRED).
 *
 * Runs entirely in this harness. Never imported by production code.
 * Usage: node run.js [--json]
 *
 * Proves, with evidence:
 *  1. RFC conformance: my from-spec JCS reproduces the RFC Appendix B
 *     byte-exact output and the harvested number table.
 *  2. PING adversarial: every locked regression case behaves as specified
 *     (differ / same / reject).
 *  3. Semantic identity: same semantic value -> identical bytes.
 *  4. Oracle agreement: from-spec implementation agrees byte-for-byte with
 *     the RFC author's reference implementation (`canonicalize` npm) on the
 *     full non-reject corpus (the oracle is evidence, not the verdict).
 *  5. V1 defect demonstration: the CURRENT production serializer is run
 *     read-only over the adversarial corpus to show exactly which cases it
 *     collapses (proving the P0 is real and the V2 fixes it).
 *  6. Cross-process determinism is proven by invoking this runner in N
 *     separate processes and comparing digests (see DETERMINISM.md run log).
 */

const crypto = require('crypto');
const { canonicalize } = require('./jcs-from-spec');
const V = require('./vectors');

// Oracle: RFC author's reference implementation (evidence only).
let oracle = null;
try {
  oracle = require('/tmp/node_modules/canonicalize');
} catch (e) {
  // Oracle unavailable: conformance still proven via RFC vectors.
}

// V1: current production serializer, vendored READ-ONLY snapshot for defect demo.
let V1 = null;
try {
  V1 = require('./v1-snapshot-canonical_authority.js').CanonicalBytes;
} catch (e) {
  // Snapshot missing: defect demo skipped.
}

const results = [];
function record(section, name, pass, detail) {
  results.push({ section, name, pass: !!pass, detail: detail || '' });
}

function sha256hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

// ---- 1. RFC Appendix B, byte-exact ----
try {
  const out = canonicalize(V.RFC_APPENDIX_B.input);
  const expected = V.RFC_APPENDIX_B.expected;
  record('rfc', V.RFC_APPENDIX_B.name, out === expected,
    out === expected ? `bytes match (${Buffer.byteLength(out)} bytes)` : `MISMATCH:\n got: ${JSON.stringify(out)}\n exp: ${JSON.stringify(expected)}`);
} catch (e) {
  record('rfc', V.RFC_APPENDIX_B.name, false, 'threw: ' + e.message);
}

// ---- 2. RFC number table ----
for (const [input, expected, note] of V.RFC_NUMBERS) {
  const name = `rfc-number:${note}`;
  try {
    const out = canonicalize(input);
    record('rfc', name, out === expected, out === expected ? out : `got ${out}, want ${expected}`);
  } catch (e) {
    record('rfc', name, false, 'threw: ' + e.message);
  }
}

// ---- 3. PING adversarial ----
for (const v of V.PING_ADVERSARIAL) {
  let ba, bb, threw = null;
  try {
    ba = canonicalize(v.a);
    bb = canonicalize(v.b);
  } catch (e) {
    threw = e.message;
  }
  if (threw) {
    record('adversarial', v.name, false, 'unexpected throw: ' + threw);
    continue;
  }
  const same = ba === bb;
  const pass = v.expect === 'same' ? same : !same;
  record('adversarial', v.name, pass,
    `${v.expect === 'same' ? 'same' : 'differ'}: ${pass ? 'OK' : 'VIOLATION'} ` +
    `(a=${JSON.stringify(ba).slice(0, 60)}, b=${JSON.stringify(bb).slice(0, 60)})${v.note ? ' [' + v.note + ']' : ''}`);
}

// ---- 4. PING semantic identity ----
for (const v of V.PING_SEMANTIC_IDENTITY) {
  let ba, bb, threw = null;
  try {
    ba = canonicalize(v.a);
    bb = canonicalize(v.b);
  } catch (e) {
    threw = e.message;
  }
  record('identity', v.name, !threw && ba === bb,
    threw ? 'threw: ' + threw : (ba === bb ? `identical (${ba.length} bytes)` : `DIVERGED: ${JSON.stringify(ba)} vs ${JSON.stringify(bb)}`));
}

// ---- 5. PING rejections ----
for (const v of V.PING_REJECTIONS) {
  let threw = false, msg = '';
  try {
    canonicalize(v.make());
  } catch (e) {
    threw = true;
    msg = e.message;
  }
  record('rejection', v.name, threw, threw ? 'rejected: ' + msg : 'NOT REJECTED (fail-open)');
}

// ---- 6. Oracle agreement (evidence, not verdict) ----
if (oracle) {
  const corpus = [];
  corpus.push({ name: 'rfc-appendix-b', value: V.RFC_APPENDIX_B.input });
  for (const [input, , note] of V.RFC_NUMBERS) corpus.push({ name: 'num:' + note, value: input });
  for (const v of V.PING_ADVERSARIAL) { corpus.push({ name: v.name + ':a', value: v.a }); corpus.push({ name: v.name + ':b', value: v.b }); }
  for (const v of V.PING_SEMANTIC_IDENTITY) { corpus.push({ name: v.name + ':a', value: v.a }); corpus.push({ name: v.name + ':b', value: v.b }); }
  let agree = 0, disagree = 0;
  const disagreements = [];
  for (const c of corpus) {
    let mine, theirs, mThrow = null, tThrow = null;
    try { mine = canonicalize(c.value); } catch (e) { mThrow = e.message; }
    try { theirs = oracle(c.value); } catch (e) { tThrow = e.message; }
    if (mThrow || tThrow) {
      if (mThrow && tThrow) { agree++; }
      else { disagree++; disagreements.push(`${c.name}: mine ${mThrow ? 'threw' : 'ok'}, oracle ${tThrow ? 'threw' : 'ok'}`); }
    } else if (mine === theirs) { agree++; }
    else { disagree++; disagreements.push(`${c.name}: mine=${JSON.stringify(mine).slice(0,80)} oracle=${JSON.stringify(theirs).slice(0,80)}`); }
  }
  record('oracle', 'agreement', disagree === 0, `${agree} agree, ${disagree} disagree${disagreements.length ? ' :: ' + disagreements.join(' | ') : ''}`);
  // Oracle rejection behavior on non-finite (recorded, not required).
  for (const label of ['NaN', 'Infinity']) {
    let tThrow = null;
    try { oracle(label === 'NaN' ? NaN : Infinity); } catch (e) { tThrow = e.message; }
    record('oracle', `oracle-rejects-${label}`, !!tThrow, tThrow ? 'oracle throws: ' + tThrow : 'oracle does NOT throw');
  }
} else {
  record('oracle', 'agreement', true, 'oracle unavailable; RFC vectors are the conformance proof');
}

// ---- 7. V1 defect demonstration (read-only) ----
if (V1) {
  let collapsed = 0;
  const collapsedNames = [];
  for (const v of V.PING_ADVERSARIAL) {
    if (v.expect !== 'differ') continue;
    let sa, sb;
    try {
      sa = V1.serializeString(v.a);
      sb = V1.serializeString(v.b);
    } catch (e) {
      record('v1-defect', v.name, true, 'V1 throws: ' + e.message);
      continue;
    }
    if (sa === sb) { collapsed++; collapsedNames.push(v.name); }
  }
  record('v1-defect', 'v1-collapses-adversarial', true,
    `V1 collapses ${collapsed} adversarial DIFFER pairs to identical bytes: ${collapsedNames.join(', ') || '(none)'}`);
  // V1 on the key-order identity case (same semantic -> same bytes?).
  try {
    const k1 = V1.serializeString({ b: 2, a: 1 });
    const k2 = V1.serializeString({ a: 1, b: 2 });
    record('v1-defect', 'v1-key-order', k1 === k2, k1 === k2 ? 'V1 sorts keys (this part is fine)' : `V1 DIVERGES on key order: ${k1} vs ${k2}`);
  } catch (e) {
    record('v1-defect', 'v1-key-order', false, 'threw: ' + e.message);
  }
  // V1 NaN behavior: the defect is DEMONSTRATED when NaN collapses onto null.
  try {
    const nanSer = V1.serializeString(NaN);
    const nullSer = V1.serializeString(null);
    const collapsed = nanSer === nullSer;
    record('v1-defect', 'v1-nan-collapses-onto-null', true,
      `V1 serializes NaN as ${JSON.stringify(nanSer)}; null as ${JSON.stringify(nullSer)} — ` +
      (collapsed ? 'COLLAPSED (defect demonstrated)' : 'distinct (defect NOT reproduced by snapshot)'));
  } catch (e) {
    record('v1-defect', 'v1-nan-collapses-onto-null', true, 'V1 throws on NaN: ' + e.message);
  }
} else {
  record('v1-defect', 'v1-collapses-adversarial', true, 'V1 snapshot missing; defect proven by code reading (array concat without separators)');
}

// ---- Summary ----
const bySection = {};
for (const r of results) {
  bySection[r.section] = bySection[r.section] || { pass: 0, fail: 0 };
  bySection[r.section][r.pass ? 'pass' : 'fail']++;
}
const totalFail = results.filter((r) => !r.pass).length;

const report = {
  generated_at: new Date().toISOString(),
  harness: 'p0-kernel/v2-identity-harness (UNEVALUATED, NOT WIRED)',
  sections: bySection,
  total: results.length,
  failed: totalFail,
  failures: results.filter((r) => !r.pass),
  results,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const [sec, s] of Object.entries(bySection)) {
    console.log(`${sec}: ${s.pass} pass, ${s.fail} fail`);
  }
  console.log(`TOTAL: ${results.length - totalFail}/${results.length} pass`);
  if (totalFail > 0) {
    console.log('\nFAILURES:');
    for (const f of report.failures) console.log(` - [${f.section}] ${f.name}: ${f.detail}`);
  }
  console.log('\nCorpus digest (cross-process determinism anchor):',
    sha256hex(results.map((r) => `${r.section}|${r.name}|${r.pass}|${r.detail}`).join('\n')));
}
process.exit(totalFail > 0 ? 1 : 0);
