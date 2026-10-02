# F7-A Evidence Freeze (1/3): TS vs Compiled-JS RFC-8785 Semantic Drift

Frozen: 2026-09-18 ~14:14 MDT. Read-only capture (cat/grep/sed/md5sum). No mutations.
Target: `/home/nolan/worktrees/constitutional-convergence`, branch `constitutional-convergence-v2`.

## [STAT] File fingerprints

| File | md5 | bytes | lines |
|---|---|---|---|
| `runtime/kernel/replay/canonical_json.ts` (authoritative source) | `f6a5babb8732e27ebd3c3e1386f23998` | 5462 | 188 |
| `gateway/replay/kernel/canonical_json.js` (runtime artifact) | `88800b8afdfc25382b78b092170bfed5` | 5190 | 139 |

Only these two `canonical_json*` copies exist in the worktree (excluding node_modules).

## [STAT] Drift 1: Unicode NFC normalization — VERIFIED-DIFFERENT

Compiled JS, lines 94-100, verbatim:

```js
    /**
     * Canonicalize a string according to RFC-8785
     * Handles Unicode normalization
     */
    static canonicalizeString(value) {
        // Normalize to NFC form as per RFC-8785
        return value.normalize('NFC');
    }
```

TS source, lines 148-153, verbatim:

```ts
  /**
   * Canonicalize a string according to RFC-8785
   * RFC-8785 preserves string values exactly - no normalization
   */
  private static canonicalizeString(value: string): string {
    return value;
  }
```

`grep -i "normalize\|nfc"` on the TS returns nothing. The two files disagree on string
semantics. (For reference, RFC-8785 sec. 2.3.1: "The string is used as-is; no
normalization is performed." The JS comment's RFC claim is itself wrong.)

[EMPR] Live consequence, captured 2026-09-18 via node against the compiled artifact:

```text
compiled canonicalize NFC: "{\"s\":\"café\"}"
compiled canonicalize NFD: "{\"s\":\"café\"}"
COMPILED JS collapses NFC/NFD (drift): true
```

(NFC input `caf\u00e9` vs NFD input `cafe\u0301` produce identical canonical bytes
under the compiled JS. D1 rules NFC != NFD.)

## [STAT] Drift 2: 64-level depth guard — VERIFIED-DIFFERENT

TS source, lines 20-22 and 34-44, verbatim:

```ts
// Constitutional nesting depth limit to prevent stack overflow
const MAX_NESTING_DEPTH = 64;
```

```ts
  private static canonicalizeValue(value: unknown, visited = new Set<object>(), depth: number = 0): unknown {
    // Constitutional depth guard to prevent stack overflow
    if (depth > MAX_NESTING_DEPTH) {
      throw DeterministicFailureFactory.toError(
        DeterministicFailureFactory.executionLimitExceeded(
          'MAX_NESTING_DEPTH',
          MAX_NESTING_DEPTH,
          depth
        )
      );
    }
```

Depth is threaded: `canonicalizeValue` passes `depth + 1` into array items and into
`canonicalizeObject`; `canonicalizeObject` passes `depth + 1` back into
`canonicalizeValue` per value. Note: object nesting consumes 2 depth units per level,
arrays consume 1 (asymmetric but deterministic; recorded for F7-C boundary tests).

Proof of absence in compiled JS: `grep -n -i "depth\|maxdepth"` returns nothing
(exit 1). `canonicalizeValue(value, visited = new Set())` takes no depth parameter.

[EMPR] Live consequence:

```text
depth 200 nested objects: NO THROW (missing depth guard = drift)
```

## [STAT] Additional verified differences (surface, not just the two claimed)

- Visibility: TS methods are `private static`; compiled JS exposes all as public `static`.
- JS-only public methods absent from TS: `stringify(value)` ("Alias for canonicalize (used
  by CanonicalEventEnvelope)") and `toBuffer(value)` (`Buffer.from(canonical, 'utf8')`).
- TS-only method absent from JS: `toUint8Array(value)` (uses `utf8Encode` from
  `./byte_utils`, "runtime-neutral").
- Module deps: TS imports `./deterministic_failure` AND `./byte_utils`; JS requires only
  `./deterministic_failure`.
- Downstream envelope divergence: TS `canonical_event_envelope.ts` `toBytes()` uses
  `canonicalize` + `utf8Encode` + `base64UrlEncode`; JS `canonical_event_envelope.js`
  `toBytes()` uses `Buffer.from(CanonicalJson.stringify(this.envelope)).toString('base64')`
  (standard base64). The JS envelope depends on the JS-only `stringify` alias and cannot
  run against the TS source.

## [STAT] Verified identical (core algorithm)

Dispatch order null -> boolean -> number -> string -> array -> object; number handling
(-0 -> 0, NaN/Infinity throw, scientific notation); sparse-array rejection; circular-ref
rejection; key sorting via UTF-16 code-unit `lexicographicCompare`.

## [STAT] Provenance

No `sourceMappingURL` in the compiled JS (grep count 0). No header naming a TS source,
commit, or build tool. The file begins with a UTF-8 BOM (consistent with, but not proof
of, tsc output). Direction of drift (newer TS vs hand-edited JS) is UNCERTAIN from the
files alone.

## [STAT] Live consumers of the compiled artifact (require `./canonical_json`)

- `gateway/replay/kernel/canonical_hash_authority.js:58` (uses `CanonicalJson.canonicalize`)
- `gateway/replay/kernel/state_serializer.js:15` (uses `CanonicalJson.toBuffer`)
- `gateway/replay/kernel/replay_verification.js:21` (uses `CanonicalJson.toBuffer`)
- `gateway/replay/kernel/canonical_event_envelope.js:12` (uses `CanonicalJson.stringify`)
- `gateway/replay/kernel/witness_authority.js:19` (uses `CanonicalJson.toBuffer`)

## [STAT] TS-internal doc inconsistency (recorded, not patched here)

The TS file header "Requirements" lists "- UTF-8 normalization" while the code and its
own doc comment say strings are preserved exactly with no normalization. The code
matches D1; the header line contradicts it.

## Build-mechanism finding (2026-09-18, coordinator verification)

No build mechanism exists in the repository for this artifact: no `build` script in
`gateway/package.json`, no TypeScript toolchain in any `devDependencies`, no tsconfig
covering `runtime/kernel/replay/`. A hermes-shipped `tsc` binary exists on the machine
(`/mnt/c/Users/nolan/AppData/Local/hermes/node/tsc`, POSIX shell script, runnable from
WSL). Trial compile of the CURRENT TS source with
`tsc --module commonjs --target es2020` reproduces the artifact's shape exactly, and the
fresh output differs from the checked-in artifact ONLY in the drifted semantics above
(NFC, depth guard, byte_utils require, stringify/toBuffer vs toUint8Array) plus a BOM.
Conclusion: the checked-in artifact was compiled from an OLDER TS revision by an
unrecorded process. F7-B must establish a pinned, documented rebuild command.
