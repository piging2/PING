// driver-ts.mjs: runs ONE TypeScript/JavaScript canonicalization implementation
// against ONE fixture input. Test harness only: it defines no canonical
// bytes of its own, it only invokes the implementation under test.
//
// Usage: node driver-ts.mjs <impl>   (reads JSON input on stdin)
//   impl: ref | absorb | canonbytes | legacy
// Output: {"ok": true, "bytes": "<utf8 canonical bytes>"}
//         {"ok": false, "error": "<message>"}
//
// Fixture input markers (revived before the call):
//   {"$float": "NaN"|"Infinity"|"-Infinity"} -> the corresponding JS number
//   {"$undefined": true}                    -> undefined
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const urlOf = (rel) => pathToFileURL(path.join(HERE, rel)).href;

const impl = process.argv[2];

function revive(v) {
  if (Array.isArray(v)) return v.map(revive);
  if (v !== null && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === '$float') {
      const s = v['$float'];
      if (s === 'NaN') return NaN;
      if (s === 'Infinity') return Infinity;
      if (s === '-Infinity') return -Infinity;
      throw new Error('driver-ts: bad $float marker: ' + s);
    }
    if (keys.length === 1 && keys[0] === '$undefined' && v['$undefined'] === true) {
      return undefined;
    }
    const out = {};
    for (const k of keys) out[k] = revive(v[k]);
    return out;
  }
  return v;
}

const raw = await new Promise((resolve, reject) => {
  let s = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { s += d; });
  process.stdin.on('end', () => resolve(s));
  process.stdin.on('error', reject);
});
const input = revive(JSON.parse(raw));

let bytes;
try {
  if (impl === 'ref') {
    // Reference: PING constitutional hash-authority.ts (ingested copy).
    const { HashAuthority } = await import(urlOf('../harvest-wave1/code-evidence/hash-authority.ts'));
    bytes = JSON.stringify(HashAuthority.canonicalizeObject(input));
  } else if (impl === 'absorb') {
    // Harvested TS port: fyd-lane/absorb/src/canonical.ts
    const { canonicalize } = await import(urlOf('../absorb/src/canonical.ts'));
    bytes = JSON.stringify(canonicalize(input));
  } else if (impl === 'canonbytes') {
    // Historical PING copy: CanonicalBytes.serialize (code-evidence, frozen).
    const { CanonicalBytes } = require(path.join(HERE, '../harvest-wave1/code-evidence/canonical_authority.js'));
    bytes = CanonicalBytes.serialize(input).toString('utf8');
  } else if (impl === 'legacy') {
    // Historical expression from unified_event_runtime.js line 170 (C1 key-order
    // bug): JSON.stringify(o, Object.keys(o).sort()) sorts TOP-LEVEL keys only.
    // Reproduced literally as the legacy-behavior demonstrator; expected to be
    // flagged non-conformant, never to pass.
    bytes = JSON.stringify(input, Object.keys(input).sort());
  } else {
    throw new Error('driver-ts: unknown impl: ' + impl);
  }
  process.stdout.write(JSON.stringify({ ok: true, bytes }));
} catch (e) {
  process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
}
