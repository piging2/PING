/**
 * B9: DIGEST-AUTHORITY CONFUSION (two canonicalizers, one digest claim).
 *
 * digest.ts header claims "lanes import, never re-implement" for
 * sha256-canonical-json-v1, but the tree ships a second canonicalizer:
 * dev-signer.canonicalizeJson, used for owner event ids. They differ on
 * undefined-valued object keys: digest.ts EMITS "key":null; dev-signer
 * DROPS the key. Consequence: one logical record has two valid "canonical"
 * digests, so digest-keyed identity/dedupe spanning the two formulations
 * splits (same record, two identities), and any cross-formulation equality
 * check is unsound.
 *
 * Modules: digest.ts is a verbatim read-only copy (pure, no imports).
 * canonicalizeJson below is a verbatim extract of dev-signer.ts:46-59
 * (the full file drags key machinery; the function is pure).
 *
 * Run: node b9-digest-confusion.mjs
 */
import { createHash } from 'crypto';
import { canonicalize, digestCanonical, DIGEST_ALGORITHM } from './digest.ts';

/** Verbatim from src/lib/ping/dev-signer.ts:46-59. */
function canonicalizeJson(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalizeJson(v)}`);
    return `{${entries.join(",")}}`;
  }
  const s = JSON.stringify(value);
  if (s === undefined) return "null";
  return s;
}
const devDigest = (v) => createHash('sha256').update(canonicalizeJson(v), 'utf8').digest('hex');

// One logical record with an explicit undefined-valued key (arises from JS
// object construction with optional fields; JSON.parse never produces it).
const P1 = { action: 'publish', site: 'happy-place', reason: undefined, seq: 3 };
// Control: no undefined keys.
const P2 = { action: 'publish', site: 'happy-place', seq: 3 };

const c1 = canonicalize(P1), d1 = digestCanonical(P1), dev1 = devDigest(P1);
const c2 = canonicalize(P2), d2 = digestCanonical(P2), dev2 = devDigest(P2);

console.log('digest.ts canonicalize(P1):', c1);
console.log('dev-signer canonicalizeJson(P1):', canonicalizeJson(P1));
console.log('digest.ts digest      :', d1);
console.log('dev-signer digest     :', dev1);
console.log('DIVERGE on undefined-valued key:', d1 !== dev1 ? 'YES' : 'no');
console.log('\ncontrol P2 digests match:', d2 === dev2 ? 'YES (divergence is exactly the undefined rule)' : 'NO');
console.log('\nalgorithm label both claim:', DIGEST_ALGORITHM);
console.log(`\nRESULT: CONFIRMED. One logical record -> two "canonical" digests. ` +
  `The one-authority claim in digest.ts is FALSE; digest-keyed identity spanning ` +
  `owner-event ids (dev-signer) and packet/proposal digests (digest.ts) is unsound.`);
console.log('FALSIFIES IF: a single canonicalizer is used on every digest path, or all ' +
  'digests normalize undefined-valued keys before hashing.');
