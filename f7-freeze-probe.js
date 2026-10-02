// F7-A failing-corpus probe. READ-ONLY: exercises the CURRENT (V1) identity
// path and the CURRENT compiled canonical_json.js to freeze failing behavior.
// Run: node /tmp/f7-freeze-probe.js  (from the worktree root on the Pig)
const { CanonicalBytes } = require('/home/nolan/worktrees/constitutional-convergence/runtime/kernel/authorities/canonical_authority.js');
const { CanonicalAuthority } = require('/home/nolan/worktrees/constitutional-convergence/runtime/kernel/authorities/canonical_authority.js');
const { CanonicalJson } = require('/home/nolan/worktrees/constitutional-convergence/gateway/replay/kernel/canonical_json.js');

function idFor(label, obj) {
  try {
    const bytes = CanonicalBytes.serialize(obj);
    const h = CanonicalAuthority.hashBytes(bytes);
    console.log(label + ' => bytes=' + JSON.stringify(bytes.toString('utf8')) + ' hash=' + h.slice(0, 16));
    return h;
  } catch (e) {
    console.log(label + ' => THREW: ' + e.message);
    return 'THREW';
  }
}

console.log('--- V1 CanonicalBytes.serialize collisions ---');
const h1 = idFor('{tags:[1,2]}   ', { tags: [1, 2] });
const h2 = idFor('{tags:[12]}    ', { tags: [12] });
console.log('COLLIDE [1,2] vs [12]: ' + (h1 === h2));
const h3 = idFor('{v:NaN}        ', { v: NaN });
const h4 = idFor('{v:null}       ', { v: null });
console.log('COLLIDE NaN vs null: ' + (h3 === h4));
const h5 = idFor('{v:-0}         ', { v: -0 });
const h6 = idFor('{v:0}          ', { v: 0 });
console.log('COLLIDE -0 vs 0: ' + (h5 === h6) + ' (D1: normalized-equivalent, NOT a defect)');
const h7 = idFor('{a:undefined}  ', { a: undefined });
console.log('undefined coerced (no throw): ' + (h7 !== 'THREW'));

console.log('--- compiled canonical_json.js drift (NFC + depth) ---');
const nfc = 'caf\u00e9';          // NFC form
const nfd = 'cafe\u0301';         // NFD form (e + combining acute)
console.log('NFC input === NFD input as JS strings: ' + (nfc === nfd));
const cNfc = CanonicalJson.canonicalize({ s: nfc });
const cNfd = CanonicalJson.canonicalize({ s: nfd });
console.log('compiled canonicalize NFC: ' + JSON.stringify(cNfc));
console.log('compiled canonicalize NFD: ' + JSON.stringify(cNfd));
console.log('COMPILED JS collapses NFC/NFD (drift): ' + (cNfc === cNfd));
function deep(n) { let o = {}; let cur = o; for (let i = 0; i < n; i++) { cur.x = {}; cur = cur.x; } return o; }
try {
  CanonicalJson.canonicalize(deep(200));
  console.log('depth 200 nested objects: NO THROW (missing depth guard = drift)');
} catch (e) {
  console.log('depth 200 nested objects: THREW: ' + e.message);
}
try {
  CanonicalJson.canonicalize({ f: function () {} });
  console.log('function value: NO THROW (silent coercion)');
} catch (e) {
  console.log('function value: THREW: ' + e.message);
}
try {
  const b = Buffer.from('abc');
  console.log('Buffer canonicalized as: ' + CanonicalJson.canonicalize({ b: b }));
} catch (e) {
  console.log('Buffer: THREW: ' + e.message);
}
